const express = require('express');
const router = express.Router();
const ctrl = require('./changelogs.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

// Public route to list changelogs
router.get('/', ctrl.list.bind(ctrl));

// Protected routes for management (Studio Developer / Admin / Owner)
router.post('/', authenticateToken, authorizeRoles('owner', 'admin', 'developer'), ctrl.create.bind(ctrl));
router.patch('/:id', authenticateToken, authorizeRoles('owner', 'admin', 'developer'), ctrl.update.bind(ctrl));
router.put('/:id', authenticateToken, authorizeRoles('owner', 'admin', 'developer'), ctrl.update.bind(ctrl));
router.delete('/:id', authenticateToken, authorizeRoles('owner', 'admin', 'developer'), ctrl.delete.bind(ctrl));

module.exports = router;
