const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserModel, SubscriptionModel } = require('../models');
const config = require('../config');

const AuthController = {
  // Register
  async register(req, res) {
    try {
      const { email, password } = req.body;

      // Validate
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: '請填寫 email 和密碼' }
        });
      }

      // Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_EMAIL', message: 'Email 格式無效' }
        });
      }

      // Password length
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'PASSWORD_TOO_SHORT', message: '密碼至少需要 8 個字元' }
        });
      }

      // Check if exists
      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: '此 Email 已被註冊' }
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await UserModel.create({
        email,
        passwordHash
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiry }
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt
          },
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '註冊失敗' }
      });
    }
  },

  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: '請填寫 email 和密碼' }
        });
      }

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' }
        });
      }

      // Check password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤' }
        });
      }

      // Get subscription
      const subscription = await SubscriptionModel.findByUserId(user.id);

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiry }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            subscription: subscription ? {
              status: subscription.status,
              plan: subscription.plan,
              expiresAt: subscription.currentPeriodEnd
            } : null
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '登入失敗' }
      });
    }
  },

  // Get current user
  async me(req, res) {
    try {
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '找不到使用者' }
        });
      }

      const subscription = await SubscriptionModel.findByUserId(user.id);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          subscription: subscription ? {
            status: subscription.status,
            plan: subscription.plan,
            expiresAt: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
          } : null,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得使用者資訊失敗' }
      });
    }
  },

  // Logout (just client-side, token invalidation not implemented here)
  async logout(req, res) {
    res.json({
      success: true,
      message: '已登出'
    });
  }
};

module.exports = AuthController;