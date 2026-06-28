
const express = require('express');
const router = express.Router();
const ctrl = require('./redeem.controller');
const { authenticateToken, authorizeRoles, requireEmailVerified } = require('../../middleware/auth.middleware');

router.use(authenticateToken, requireEmailVerified);

// Admin routes
router.get('/', authorizeRoles('admin', 'owner'), ctrl.list.bind(ctrl));
router.post('/', authorizeRoles('admin', 'owner'), ctrl.create.bind(ctrl));
router.delete('/:id', authorizeRoles('admin', 'owner'), ctrl.delete.bind(ctrl));

// Public redeem (user must be logged in)
router.post('/redeem', ctrl.redeem.bind(ctrl));

module.exports = router;
