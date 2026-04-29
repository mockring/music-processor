const express = require('express');
const authMiddleware = require('../middleware/auth');
const AuthController = require('../controllers/authController');
const SubscriptionController = require('../controllers/subscriptionController');
const LicenseController = require('../controllers/licenseController');

const router = express.Router();

// ============ AUTH ============
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', authMiddleware, AuthController.logout);
router.get('/auth/me', authMiddleware, AuthController.me);

// ============ SUBSCRIPTION ============
router.get('/subscription/plans', (req, res) => SubscriptionController.getPlans(req, res));
router.get('/subscription', authMiddleware, (req, res) => SubscriptionController.get(req, res));
router.post('/subscription/create', authMiddleware, (req, res) => SubscriptionController.create(req, res));
router.post('/subscription/one-time', authMiddleware, (req, res) => SubscriptionController.createOneTime(req, res));
router.post('/subscription/cancel', authMiddleware, (req, res) => SubscriptionController.cancel(req, res));
router.post('/subscription/reactivate', authMiddleware, (req, res) => SubscriptionController.reactivate(req, res));

// ============ LICENSE ============
router.post('/license/verify', authMiddleware, (req, res) => LicenseController.verify(req, res));
router.post('/license/register-device', authMiddleware, (req, res) => LicenseController.registerDevice(req, res));
router.get('/license/devices', authMiddleware, (req, res) => LicenseController.listDevices(req, res));
router.delete('/license/devices/:deviceId', authMiddleware, (req, res) => LicenseController.removeDevice(req, res));

// ============ PAYMENT (placeholder) ============
router.post('/payment/card-token', authMiddleware, (req, res) => {
  // In production, this would call ECPay token API
  res.json({
    success: true,
    data: {
      message: '請在客戶端使用綠界 SDK 取得卡號 token'
    }
  });
});

router.post('/payment/payment-url', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      message: '請使用綠界一次性付款 API'
    }
  });
});

module.exports = router;