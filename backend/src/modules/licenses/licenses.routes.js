
const express = require('express');
const router = express.Router();
const ctrl = require('./licenses.controller');
const { authenticateToken, authorizeRoles, requireEmailVerified } = require('../../middleware/auth.middleware');

const validate = require('../../middleware/validate.middleware');
const {
  licenseParamsSchema,
  createLicenseSchema,
  updateLicenseSchema,
  lookupQuerySchema,
} = require('./licenses.schema');

router.use(authenticateToken, requireEmailVerified);

router.get('/my', ctrl.myLicenses.bind(ctrl));
router.get('/lookup', authorizeRoles('owner', 'admin', 'staff'), validate(lookupQuerySchema, 'query'), ctrl.lookup.bind(ctrl));
router.get('/:id', validate(licenseParamsSchema, 'params'), ctrl.getForUser.bind(ctrl));

router.use(authorizeRoles('admin', 'owner'));

router.get('/', ctrl.list.bind(ctrl));
router.post('/', validate(createLicenseSchema, 'body'), ctrl.create.bind(ctrl));
router.patch('/:id', validate(licenseParamsSchema, 'params'), validate(updateLicenseSchema, 'body'), ctrl.update.bind(ctrl));
router.delete('/:id', validate(licenseParamsSchema, 'params'), ctrl.delete.bind(ctrl));

module.exports = router;
