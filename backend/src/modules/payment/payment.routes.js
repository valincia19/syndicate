const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const rawBodyParser = express.raw({ type: 'application/json' });

router.post(
  '/qris/create-order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.createQRISOrder(req, res, next)
);

router.get(
  '/qris/order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.getQRISOrder(req, res, next)
);

router.get(
  '/qris/status',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.checkQRISStatus(req, res, next)
);

router.post(
  '/callback/tokopay',
  rawBodyParser,
  (req, res, next) => paymentController.tokopayCallback(req, res, next)
);

router.post(
  '/crypto/create-order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.createCryptoOrder(req, res, next)
);

router.get(
  '/crypto/coins',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.getMerchantCoins(req, res, next)
);

router.get(
  '/crypto/status',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.checkCryptoStatus(req, res, next)
);

router.post(
  '/callback/nowpayments',
  rawBodyParser,
  (req, res, next) => paymentController.nowpaymentsCallback(req, res, next)
);

router.get(
  '/qris/download',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.downloadQRIS(req, res, next)
);

router.post(
  '/bank/create-order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.createBankOrder(req, res, next)
);

router.get(
  '/bank/order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.getBankOrder(req, res, next)
);

router.get(
  '/bank/status',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.checkBankStatus(req, res, next)
);

router.post(
  '/emoney/create-order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.createEmoneyOrder(req, res, next)
);

router.get(
  '/emoney/order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.getEmoneyOrder(req, res, next)
);

router.get(
  '/emoney/status',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.checkEmoneyStatus(req, res, next)
);

router.post(
  '/retail/create-order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.createRetailOrder(req, res, next)
);

router.get(
  '/retail/order',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.getRetailOrder(req, res, next)
);

router.get(
  '/retail/status',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.checkRetailStatus(req, res, next)
);

router.get(
  '/history',
  authMiddleware.authenticateToken,
  (req, res, next) => paymentController.getTransactionHistory(req, res, next)
);

router.get(
  '/admin/all',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles('owner', 'admin', 'developer'),
  (req, res, next) => paymentController.getAllTransactions(req, res, next)
);

module.exports = router;
