const express = require('express');
const router = express.Router();
const currencyController = require('./currency.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

// Public: get plan prices in IDR (based on live USD rate)
router.get('/plans', currencyController.getPlanPrices);

// Admin-only: manage currency rates
router.get('/all', authenticateToken, authorizeRoles('admin', 'owner'), currencyController.getAllCurrencies);
router.get('/active', authenticateToken, currencyController.getActiveCurrencies);
router.post('/', authenticateToken, authorizeRoles('admin', 'owner'), currencyController.createCurrency);
router.put('/bulk', authenticateToken, authorizeRoles('admin', 'owner'), currencyController.bulkUpdateCurrencies);
router.put('/:code', authenticateToken, authorizeRoles('admin', 'owner'), currencyController.updateCurrency);
router.delete('/:code', authenticateToken, authorizeRoles('admin', 'owner'), currencyController.deleteCurrency);

module.exports = router;
