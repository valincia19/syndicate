/**
 * Tickets Routes
 * Defines ticket management endpoints
 *
 * All routes require authentication (authenticateToken)
 * Status updates require staff+ roles (authorizeRoles)
 */

const express = require('express');
const router = express.Router();
const ticketController = require('./tickets.controller');
const { authenticateToken, authorizeRoles, requireEmailVerified } = require('../../middleware/auth.middleware');

// All ticket routes require authentication
router.use(authenticateToken, requireEmailVerified);

// Create a new ticket
router.post('/', ticketController.createTicket.bind(ticketController));

// Get user's tickets (or all tickets for staff+)
router.get('/', ticketController.getTickets.bind(ticketController));

// Get ticket details with messages
router.get('/:id', ticketController.getTicketDetails.bind(ticketController));

// Reply to a ticket
router.post('/:id/messages', ticketController.addReply.bind(ticketController));

// Update ticket status (staff+ only)
router.patch('/:id/status', authorizeRoles('staff', 'admin', 'developer', 'owner'), ticketController.updateStatus.bind(ticketController));

module.exports = router;
