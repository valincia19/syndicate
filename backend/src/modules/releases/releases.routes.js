const express = require('express');
const router = express.Router();
const ctrl = require('./releases.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

// Game info lookup is a public utility (no auth needed)
router.get('/game-info/:gameId', ctrl.gameInfo.bind(ctrl));

// All other routes require authentication
router.use(authenticateToken);
router.use(authorizeRoles('owner', 'developer'));

router.post('/', ctrl.create.bind(ctrl));
router.get('/', ctrl.list.bind(ctrl));
router.get('/:id', ctrl.getById.bind(ctrl));
router.patch('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));

module.exports = router;
