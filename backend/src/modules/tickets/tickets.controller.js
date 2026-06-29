/**
 * Tickets Controller Layer
 * Handles HTTP requests and responses for ticket management
 *
 * Response format follows the established pattern:
 *   { status, statusCode, message, data }
 */

const ticketService = require('./tickets.service');

class TicketController {
  /**
   * Create a new support ticket
   * POST /v1/tickets
   */
  async createTicket(req, res, next) {
    try {
      const userId = req.user.id;
      const { subject, category, message } = req.body;

      const ticket = await ticketService.createTicket(userId, {
        subject,
        category,
        message,
      });

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(userId, 'create_ticket', { 
        ticket_id: ticket.id,
        subject: ticket.subject,
        category: ticket.category
      });

      res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'Ticket created successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tickets (own tickets for users, all for staff+)
   * GET /v1/tickets
   */
  async getTickets(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const tickets = await ticketService.getTickets(userId, userRole);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Tickets retrieved successfully',
        data: { tickets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ticket details with full conversation
   * GET /v1/tickets/:id
   */
  async getTicketDetails(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const ticket = await ticketService.getTicketDetails(id, userId, userRole);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Ticket details retrieved successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reply to a ticket
   * POST /v1/tickets/:id/messages
   */
  async addReply(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const { content } = req.body;

      const message = await ticketService.addReply(id, userId, userRole, content);

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(userId, 'reply_ticket', { 
        ticket_id: id
      });

      res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'Reply sent successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update ticket status (staff+ only)
   * PATCH /v1/tickets/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || typeof status !== 'string') {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Status is required',
        });
      }

      const ticket = await ticketService.updateStatus(id, status.trim().toLowerCase());

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Ticket status updated successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a support ticket
   * DELETE /v1/tickets/:id
   */
  async deleteTicket(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await ticketService.deleteTicket(id);

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(userId, 'delete_ticket', { 
        ticket_id: id
      });

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Ticket deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketController();

