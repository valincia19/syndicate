
const express = require('express');
const router = express.Router();
const ctrl = require('./redeem.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

// Admin routes
router.get('/', authenticateToken, authorizeRoles('admin', 'owner'), ctrl.list.bind(ctrl));
router.post('/', authenticateToken, authorizeRoles('admin', 'owner'), ctrl.create.bind(ctrl));
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'owner'), ctrl.delete.bind(ctrl));

// Public redeem (user must be logged in)
router.post('/redeem', authenticateToken, ctrl.redeem.bind(ctrl));

module.exports = router;
