const express = require('express');
const router = express.Router();
const ctrl = require('./keyauth.controller');

router.get('/verify/:key', ctrl.verify.bind(ctrl));
router.get('/activate/:key', ctrl.activate.bind(ctrl));

module.exports = router;
