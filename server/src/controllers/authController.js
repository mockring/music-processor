const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { UserModel, SubscriptionModel, PasswordResetTokenModel } = require('../models');
const config = require('../config');
const { sendPasswordResetEmail } = require('../services/email');

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
  },

  // Forgot password - send reset email
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_EMAIL', message: '請輸入電子郵件' }
        });
      }

      // Find user
      const user = await UserModel.findByEmail(email);

      // Always return success to prevent email enumeration attacks
      if (!user) {
        return res.json({
          success: true,
          message: '如果該電子郵件存在，重置連結已寄出'
        });
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Delete any existing tokens for this user
      await PasswordResetTokenModel.deleteByUserId(user.id);

      // Create new token
      await PasswordResetTokenModel.create({
        userId: user.id,
        token,
        expiresAt
      });

      // Send email
      await sendPasswordResetEmail(email, token);

      res.json({
        success: true,
        message: '如果該電子郵件存在，重置連結已寄出'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '處理請求失敗' }
      });
    }
  },

  // Reset password with token
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: '請提供重置 token 和新密碼' }
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'PASSWORD_TOO_SHORT', message: '密碼至少需要 8 個字元' }
        });
      }

      // Find valid token
      const resetToken = await PasswordResetTokenModel.findByToken(token);

      if (!resetToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: '重置連結無效或已過期' }
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12);

      // Update user password
      await UserModel.update(resetToken.user_id, { passwordHash });

      // Mark token as used
      await PasswordResetTokenModel.markUsed(token);

      res.json({
        success: true,
        message: '密碼已成功重置，請使用新密碼登入'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '重置密碼失敗' }
      });
    }
  }
};

module.exports = AuthController;