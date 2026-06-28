const express = require('express');
const router = express.Router();
const ctrl = require('./activity.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

router.use(authenticateToken);

router.post('/log', ctrl.log.bind(ctrl));
router.get('/my', ctrl.getMyActivities.bind(ctrl));

// Admin/Owner routes
router.get('/admin/all', authorizeRoles('owner'), ctrl.getAllActivities.bind(ctrl));
router.post('/admin/clean', authorizeRoles('owner'), ctrl.cleanActivities.bind(ctrl));

module.exports = router;
