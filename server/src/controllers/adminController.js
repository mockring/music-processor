const { PaymentSubmissionModel, SerialKeyModel, UserModel } = require('../models');
const SerialController = require('./serialController');
const { sendSerialKeyEmail } = require('../services/email');

const AdminController = {
  // Get pending payments
  async getPendingPayments(req, res) {
    try {
      const payments = await PaymentSubmissionModel.findPending();

      res.json({
        success: true,
        data: {
          payments: payments.map(p => ({
            id: p.id,
            userId: p.user_id,
            userEmail: p.user_email,
            bankAccount: p.bank_account,
            amount: p.amount,
            transferTime: p.transfer_time,
            status: p.status,
            notes: p.notes,
            createdAt: p.created_at
          }))
        }
      });
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得待確認匯款失敗' }
      });
    }
  },

  // Confirm payment and send serial key
  async confirmPayment(req, res) {
    try {
      const { paymentId, notes } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PAYMENT_ID', message: '缺少 paymentId' }
        });
      }

      // Find the payment
      const payment = await PaymentSubmissionModel.findById(paymentId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: '找不到匯款資料' }
        });
      }

      if (payment.status === 'confirmed') {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_CONFIRMED', message: '此匯款已確認' }
        });
      }

      if (payment.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_CANCELLED', message: '此匯款已取消' }
        });
      }

      // Get user email
      const userEmail = payment.user_email;

      if (!userEmail) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_USER_EMAIL', message: '找不到會員 Email' }
        });
      }

      // Create serial key for the user
      const serial = await SerialController.createForUser(payment.user_id);

      // Update payment status
      await PaymentSubmissionModel.updateStatus(paymentId, 'confirmed', notes || '');

      // Send email with serial key
      try {
        await sendSerialKeyEmail(userEmail, serial.serial_key);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Continue - payment is already confirmed
      }

      res.json({
        success: true,
        data: {
          paymentId,
          serialKey: serial.serial_key,
          userEmail
        }
      });
    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '確認匯款失敗' }
      });
    }
  },

  // Create serial key manually
  async createSerial(req, res) {
    try {
      const { userId, email } = req.body;

      if (!userId && !email) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_USER', message: '缺少 userId 或 email' }
        });
      }

      let targetUserId = userId;

      // If email provided, find user
      if (!targetUserId && email) {
        const user = await UserModel.findByEmail(email);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: '找不到會員' }
          });
        }
        targetUserId = user.id;
      }

      // Create serial key
      const serial = await SerialController.createForUser(targetUserId);

      res.json({
        success: true,
        data: {
          serialKey: serial.serial_key,
          userId: targetUserId
        }
      });
    } catch (error) {
      console.error('Create serial error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '建立序號失敗' }
      });
    }
  },

  // Get all serials
  async getSerials(req, res) {
    try {
      // This would need a SerialKeyModel.findAll method
      // For now, return empty
      res.json({
        success: true,
        data: {
          serials: []
        }
      });
    } catch (error) {
      console.error('Get serials error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得序號列表失敗' }
      });
    }
  },

  // Cancel payment
  async cancelPayment(req, res) {
    try {
      const { paymentId, notes } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_PAYMENT_ID', message: '缺少 paymentId' }
        });
      }

      const payment = await PaymentSubmissionModel.findById(paymentId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: '找不到匯款資料' }
        });
      }

      if (payment.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: '只能取消待確認的匯款' }
        });
      }

      await PaymentSubmissionModel.updateStatus(paymentId, 'cancelled', notes || '');

      res.json({
        success: true,
        message: '匯款已取消'
      });
    } catch (error) {
      console.error('Cancel payment error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取消匯款失敗' }
      });
    }
  }
};

module.exports = AdminController;