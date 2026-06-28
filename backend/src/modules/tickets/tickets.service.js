/**
 * Tickets Service Layer
 * Business logic for ticket management
 *
 * Security: Ownership is enforced here. Regular users can only access
 * their own tickets. Staff/admin/dev/owner can access all tickets.
 */

const ticketModel = require('./tickets.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const logger = require('../../config/logger');

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
    const ticket = await ticketModel.findById(ticketId);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Ownership check: regular users can only see their own tickets
    if (!STAFF_ROLES.includes(userRole) && ticket.user_id !== userId) {
      throw new AppError('You do not have permission to view this ticket', 403);
    }

    const messages = await ticketModel.getMessages(ticketId);

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
    const ticket = await ticketModel.findById(ticketId);

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

    const message = await ticketModel.addMessage({
      ticket_id: ticketId,
      sender_id: userId,
      sender_role: STAFF_ROLES.includes(userRole) ? userRole : 'user',
      content: content.trim(),
    });

    // Auto-update status to in_progress when anyone replies to an open ticket
    if (ticket.status === 'open') {
      await ticketModel.updateStatus(ticketId, 'in_progress');
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

    const ticket = await ticketModel.findById(ticketId);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const updated = await ticketModel.updateStatus(ticketId, status);

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
