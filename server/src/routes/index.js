const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const AuthController = require('../controllers/authController');
const SubscriptionController = require('../controllers/subscriptionController');
const LicenseController = require('../controllers/licenseController');
const TrialController = require('../controllers/trialController');
const SerialController = require('../controllers/serialController');
const PaymentController = require('../controllers/paymentController');
const AdminController = require('../controllers/adminController');

const router = express.Router();

// ============ RATE LIMITERS ============
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { success: false, error: { code: 'RATE_LIMITED', message: '請求太頻繁，請稍後再試' } }
});

const trialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: { success: false, error: { code: 'RATE_LIMITED', message: '請求太頻繁，請稍後再試' } }
});

const serialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: { success: false, error: { code: 'RATE_LIMITED', message: '請求太頻繁，請稍後再試' } }
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: { success: false, error: { code: 'RATE_LIMITED', message: '請求太頻繁，請稍後再試' } }
});

// ============ AUTH ============
router.post('/auth/register', authLimiter, AuthController.register);
router.post('/auth/login', authLimiter, AuthController.login);
router.post('/auth/logout', authMiddleware, AuthController.logout);
router.get('/auth/me', authMiddleware, AuthController.me);
router.post('/auth/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/auth/reset-password', authLimiter, AuthController.resetPassword);

// ============ TRIAL (NEW) ============
router.post('/trial/start', trialLimiter, TrialController.start);
router.get('/trial/status', TrialController.status);

// ============ SERIAL (NEW) ============
router.post('/serial/activate', serialLimiter, SerialController.activate);
router.get('/serial/status', SerialController.status);

// ============ PAYMENT (NEW - Bank Transfer) ============
router.post('/payment/submit', paymentLimiter, PaymentController.submit);
router.get('/payment/status', authMiddleware, PaymentController.status);

// ============ ADMIN (NEW) ============
router.get('/admin/payments', authMiddleware, adminOnly, AdminController.getPendingPayments);
router.post('/admin/confirm-payment', authMiddleware, adminOnly, AdminController.confirmPayment);
router.post('/admin/create-serial', authMiddleware, adminOnly, AdminController.createSerial);
router.get('/admin/serials', authMiddleware, adminOnly, AdminController.getSerials);
router.post('/admin/cancel-payment', authMiddleware, adminOnly, AdminController.cancelPayment);

// ============ SUBSCRIPTION (Legacy - kept for reference) ============
router.get('/subscription/plans', (req, res) => SubscriptionController.getPlans(req, res));
router.get('/subscription', authMiddleware, (req, res) => SubscriptionController.get(req, res));
router.post('/subscription/create', authMiddleware, (req, res) => SubscriptionController.create(req, res));
router.post('/subscription/one-time', authMiddleware, (req, res) => SubscriptionController.createOneTime(req, res));
router.post('/subscription/cancel', authMiddleware, (req, res) => SubscriptionController.cancel(req, res));
router.post('/subscription/reactivate', authMiddleware, (req, res) => SubscriptionController.reactivate(req, res));

// ============ LICENSE (Legacy) ============
router.post('/license/verify', authMiddleware, (req, res) => LicenseController.verify(req, res));
router.post('/license/register-device', authMiddleware, (req, res) => LicenseController.registerDevice(req, res));
router.get('/license/devices', authMiddleware, (req, res) => LicenseController.listDevices(req, res));
router.delete('/license/devices/:deviceId', authMiddleware, (req, res) => LicenseController.removeDevice(req, res));

// ============ PAYMENT (placeholder - legacy) ============
router.post('/payment/card-token', authMiddleware, (req, res) => {
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