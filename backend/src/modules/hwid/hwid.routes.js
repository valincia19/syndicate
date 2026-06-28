
const express = require('express');
const router = express.Router();
const ctrl = require('./hwid.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

router.use(authenticateToken);

// User-facing: get HWIDs for their own license
router.get('/by-license/:licenseId', ctrl.byLicenseForUser.bind(ctrl));
router.delete('/by-license/:licenseId/reset', ctrl.resetByLicenseForUser.bind(ctrl));
router.delete('/by-license/:licenseId/:hwidId', ctrl.deleteByLicenseForUser.bind(ctrl));
router.put('/by-license/:licenseId/:hwidId/reset', ctrl.resetDeviceForUser.bind(ctrl));

// Admin-only
router.use(authorizeRoles('admin', 'owner'));

router.get('/', ctrl.list.bind(ctrl));
router.get('/:id', ctrl.get.bind(ctrl));
router.post('/', ctrl.create.bind(ctrl));
router.patch('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));

module.exports = router;
