const express = require('express');
const router = express.Router();
const ctrl = require('./activity.controller');
const { authenticateToken } = require('../../middleware/auth.middleware');

router.use(authenticateToken);

router.post('/log', ctrl.log.bind(ctrl));
router.get('/my', ctrl.getMyActivities.bind(ctrl));

module.exports = router;
