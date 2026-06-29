/**
 * Admin Routes
 * Owner-only endpoints for system administration
 */

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

const validate = require('../../middleware/validate.middleware');
const { updateUserSchema, updateRoleSchema, toggleSuspendSchema } = require('./admin.schema');

// All admin routes require authentication
router.use(authenticateToken);

// Endpoints accessible by both admin and owner
router.get('/stats', authorizeRoles('admin', 'owner'), adminController.getStats.bind(adminController));
router.get('/users', authorizeRoles('admin', 'owner'), adminController.listUsers.bind(adminController));
router.get('/activities', authorizeRoles('admin', 'owner'), adminController.listActivities.bind(adminController));
router.delete('/activities/:id', authorizeRoles('admin', 'owner'), adminController.deleteActivity.bind(adminController));
router.patch('/users/:id/suspend', authorizeRoles('admin', 'owner'), validate(toggleSuspendSchema, 'body'), adminController.toggleSuspend.bind(adminController));

// Endpoints restricted to owner only
router.use(authorizeRoles('owner'));
router.patch('/users/:id', validate(updateUserSchema, 'body'), adminController.updateUser.bind(adminController));
router.patch('/users/:id/role', validate(updateRoleSchema, 'body'), adminController.updateRole.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));

// Settings management (Owner-only)
router.get('/settings/:key', adminController.getSetting.bind(adminController));
router.post('/settings/:key', adminController.saveSetting.bind(adminController));

// Execution logs management (Owner-only)
router.get('/executions/logs', adminController.listExecutionLogs.bind(adminController));
router.get('/executions/keys', adminController.listExecutionKeys.bind(adminController));

module.exports = router;
