const express = require('express');
const router = express.Router();
const ctrl = require('./vouchers.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

// Admin routes
router.get('/', authenticateToken, authorizeRoles('admin', 'owner'), ctrl.list.bind(ctrl));
router.post('/', authenticateToken, authorizeRoles('admin', 'owner'), ctrl.create.bind(ctrl));
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'owner'), ctrl.delete.bind(ctrl));

// User redeem route
router.post('/redeem', authenticateToken, ctrl.redeem.bind(ctrl));
router.post('/validate', authenticateToken, ctrl.validate.bind(ctrl));

module.exports = router;
