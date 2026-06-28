/**
 * Tickets Service Layer
 * Business logic for ticket management
 *
 * Security: Ownership is enforced here. Regular users can only access
 * their own tickets. Staff/admin/dev/owner can access all tickets.
 */

const crypto = require('crypto');
const ticketModel = require('./tickets.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const logger = require('../../config/logger');
const cacheUtility = require('../../utils/cache.utility');

const STAFF_ROLES = ['staff', 'admin', 'developer', 'owner'];
const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_CATEGORIES = ['general', 'technical', 'billing', 'bug'];

class TicketService {
  /**
   * Create a new ticket with an initial message
   * @param {string} userId - UUID of the user creating the ticket
   * @param {Object} data - { subject, category, message }
   * @returns {Promise<Object>} Created ticket with first message
   */
  async createTicket(userId, data) {
    const { subject, category, message } = data;

    // Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      throw new AppError('Ticket subject is required', 400);
    }

    // Validate category
    const cat = (category || 'general').toLowerCase();
    if (!VALID_CATEGORIES.includes(cat)) {
      throw new AppError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
    }

    // Validate initial message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('Initial ticket message is required', 400);
    }

    // Create ticket record
    const ticket = await ticketModel.create({
      user_id: userId,
      subject: subject.trim().substring(0, 255),
      category: cat,
    });

    // Add the first message
    const firstMessage = await ticketModel.addMessage({
      ticket_id: ticket.id,
      sender_id: userId,
      sender_role: 'user',
      content: message.trim(),
    });

    logger.info('Service:Tickets', 'Ticket created', { ticketId: ticket.id, code: ticket.code, userId });

    return {
      ...ticket,
      messages: [firstMessage],
    };
  }

  /**
   * Get tickets for a user (or all tickets for staff+)
   * @param {string} userId - UUID
   * @param {string} userRole - role string
   * @returns {Promise<Array>}
   */
  async getTickets(userId, userRole) {
    if (STAFF_ROLES.includes(userRole)) {
      const tickets = await ticketModel.findAll();
      return tickets;
    }

    const tickets = await ticketModel.findByUserId(userId);
    return tickets;
  }

  /**
   * Get ticket details with messages, enforcing ownership
   * @param {string} ticketId - UUID
   * @param {string} userId - UUID of requesting user
   * @param {string} userRole - role string
   * @returns {Promise<Object>} Ticket with messages
   */
  async getTicketDetails(ticketId, userId, userRole) {
    // ponytail: use cache utility for ticket lookup to avoid DB hammer
    const ticket = await cacheUtility.getOrSet(`cache:ticket:${ticketId}`, () => ticketModel.findById(ticketId), 600);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Ownership check: regular users can only see their own tickets
    if (!STAFF_ROLES.includes(userRole) && ticket.user_id !== userId) {
      throw new AppError('You do not have permission to view this ticket', 403);
    }

    // ponytail: use cache utility for messages list
    const messages = await cacheUtility.getOrSet(`cache:ticket_messages:${ticketId}`, () => ticketModel.getMessages(ticketId), 600);

    return {
      ...ticket,
      messages,
    };
  }

  /**
   * Add a reply to a ticket
   * @param {string} ticketId - UUID
   * @param {string} userId - UUID of sender
   * @param {string} userRole - role string
   * @param {string} content - message body
   * @returns {Promise<Object>} The created message
   */
  async addReply(ticketId, userId, userRole, content) {
    // ponytail: get ticket from cache to verify
    const ticket = await cacheUtility.getOrSet(`cache:ticket:${ticketId}`, () => ticketModel.findById(ticketId), 600);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Ownership check: regular users can only reply to their own tickets
    if (!STAFF_ROLES.includes(userRole) && ticket.user_id !== userId) {
      throw new AppError('You do not have permission to reply to this ticket', 403);
    }

    // Closed tickets cannot receive replies
    if (ticket.status === 'closed') {
      throw new AppError('Cannot reply to a closed ticket. Please open a new ticket.', 403);
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new AppError('Message content is required', 400);
    }

    // Fetch user details from cache for immediate response payload
    const UserModel = require('../auth/auth.model');
    const userProfile = await cacheUtility.getOrSet(`cache:user_profile:${userId}`, () => UserModel.findById(userId), 600);

    const message = {
      id: crypto.randomUUID(),
      ticket_id: ticketId,
      sender_id: userId,
      sender_role: STAFF_ROLES.includes(userRole) ? userRole : 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
      sender_username: userProfile?.username || null,
      sender_avatar: userProfile?.avatar || null
    };

    // 1. Write immediately to Redis cache (Write-Through)
    const cachedMessages = await cacheUtility.get(`cache:ticket_messages:${ticketId}`);
    if (cachedMessages) {
      cachedMessages.push(message);
      await cacheUtility.set(`cache:ticket_messages:${ticketId}`, cachedMessages, 600);
    } else {
      await cacheUtility.set(`cache:ticket_messages:${ticketId}`, [message], 600);
    }

    // 2. Lazy database persistence (Write-Behind)
    ticketModel.addMessage({
      id: message.id,
      ticket_id: ticketId,
      sender_id: userId,
      sender_role: message.sender_role,
      content: message.content
    }).catch(err => {
      logger.error('Service:Tickets', 'Lazy DB message persistence failed', { ticketId, error: err.message });
    });

    // Auto-update status to in_progress when anyone replies to an open ticket
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
      await cacheUtility.set(`cache:ticket:${ticketId}`, ticket, 600);

      // Lazy DB update for status
      ticketModel.updateStatus(ticketId, 'in_progress').catch(err => {
        logger.error('Service:Tickets', 'Lazy DB status update failed', { ticketId, error: err.message });
      });
    }

    // Broadcast new message to WebSocket subscribers
    try {
      const { wssRegistry } = require('../../config/websocket');
      wssRegistry.broadcastToTicket(ticketId, {
        type: 'new_message',
        data: message,
      });
    } catch (err) {
      // WebSocket broadcast is non-critical; don't break the reply flow
      logger.debug('Service:Tickets', 'WebSocket broadcast failed', { ticketId, error: err.message });
    }

    logger.info('Service:Tickets', 'Reply added', { ticketId, userId, senderRole: userRole });

    return message;
  }

  /**
   * Update ticket status (staff+ only)
   * @param {string} ticketId - UUID
   * @param {string} status - new status
   * @returns {Promise<Object>} Updated ticket
   */
  async updateStatus(ticketId, status) {
    if (!VALID_STATUSES.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    // ponytail: retrieve from cache
    const ticket = await cacheUtility.getOrSet(`cache:ticket:${ticketId}`, () => ticketModel.findById(ticketId), 600);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Invalidate ticket cache
    await cacheUtility.del(`cache:ticket:${ticketId}`);

    const updated = await ticketModel.updateStatus(ticketId, status);

    // Update ticket cache with updated value
    await cacheUtility.set(`cache:ticket:${ticketId}`, updated, 600);

    // Broadcast status update to WebSocket subscribers
    try {
      const { wssRegistry } = require('../../config/websocket');
      wssRegistry.broadcastToTicket(ticketId, {
        type: 'status_update',
        data: updated,
      });
    } catch (err) {
      logger.debug('Service:Tickets', 'WebSocket status broadcast failed', { ticketId, error: err.message });
    }

    logger.info('Service:Tickets', 'Ticket status updated', { ticketId, status });

    return updated;
  }
}

module.exports = new TicketService();
