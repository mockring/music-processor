const { PaymentSubmissionModel } = require('../models');
const { sendPaymentConfirmationEmail } = require('../services/email');

const PaymentController = {
  // Submit payment information
  async submit(req, res) {
    try {
      const { email, accountLast5, amount, transferTime } = req.body;

      // Validate required fields
      if (!email || !accountLast5 || !amount || !transferTime) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: '缺少必要欄位' }
        });
      }

      // Validate accountLast5 is 5 digits
      if (!/^\d{5}$/.test(accountLast5)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ACCOUNT', message: '帳號後五碼必須是5位數字' }
        });
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: '無效的匯款金額' }
        });
      }

      // Validate transferTime
      const transferDate = new Date(transferTime);
      if (isNaN(transferDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TRANSFER_TIME', message: '無效的匯款時間' }
        });
      }

      // Try to find user by email (optional - payment can be submitted without account)
      let userId = null;
      try {
        const user = await UserModel.findByEmail(email);
        if (user) {
          userId = user.id;
        }
      } catch (e) {
        // Continue without user association
      }

      // Create payment submission
      const submission = await PaymentSubmissionModel.create({
        userId,
        bankAccount: accountLast5,
        amount: amountNum,
        transferTime: transferDate,
        notes: `Email: ${email}`
      });

      res.json({
        success: true,
        data: {
          submissionId: submission.id,
          status: submission.status,
          createdAt: submission.created_at
        }
      });
    } catch (error) {
      console.error('Payment submit error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '提交匯款資料失敗' }
      });
    }
  },

  // Get payment status for logged-in user
  async status(req, res) {
    try {
      const userId = req.user.userId;

      const submissions = await PaymentSubmissionModel.findByUserId(userId);

      res.json({
        success: true,
        data: {
          submissions: submissions.map(s => ({
            id: s.id,
            bankAccount: s.bank_account,
            amount: s.amount,
            transferTime: s.transfer_time,
            status: s.status,
            createdAt: s.created_at,
            confirmedAt: s.confirmed_at
          }))
        }
      });
    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得付款狀態失敗' }
      });
    }
  }
};

module.exports = PaymentController;