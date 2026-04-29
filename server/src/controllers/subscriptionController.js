const { SubscriptionModel, PaymentModel } = require('../models');
const config = require('../config');

const SubscriptionController = {
  // Get all plans
  async getPlans(req, res) {
    res.json({
      success: true,
      data: {
        plans: [
          {
            id: 'plan_monthly',
            name: config.plans.monthly.name,
            price: config.plans.monthly.price,
            originalPrice: config.plans.monthly.originalPrice,
            currency: 'TWD',
            interval: 'month',
            description: '完整功能，自動月扣'
          },
          {
            id: 'plan_yearly',
            name: config.plans.yearly.name,
            price: config.plans.yearly.price,
            originalPrice: config.plans.yearly.originalPrice,
            currency: 'TWD',
            interval: 'year',
            description: '完整功能，省22%'
          },
          {
            id: 'plan_lifetime',
            name: config.plans.lifetime.name,
            price: config.plans.lifetime.price,
            originalPrice: config.plans.lifetime.originalPrice,
            currency: 'TWD',
            interval: 'lifetime',
            description: '完整功能，終身使用'
          }
        ]
      }
    });
  },

  // Create subscription (recurring for monthly/yearly, one-time for lifetime)
  async create(req, res) {
    try {
      const { planId, cardToken } = req.body;
      const userId = req.user.userId;

      // Validate plan
      const plan = config.plans[planId.replace('plan_', '')];
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PLAN', message: '無效的方案' }
        });
      }

      // Check if already has active subscription
      const existing = await SubscriptionModel.findByUserId(userId);
      if (existing && existing.status === 'active') {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_SUBSCRIBED', message: '已有有效的訂閱' }
        });
      }

      // For lifetime (one-time payment), use different flow
      if (plan.interval === 'lifetime') {
        return res.status(400).json({
          success: false,
          error: { code: 'USE_ONE_TIME', message: '請使用一次性付款購買永久授權' }
        });
      }

      // Create recurring subscription via ECPay
      // Note: In production, you need to get card token from client-side ECPay SDK
      // For now, return success and let client handle payment
      const subscription = await SubscriptionModel.create({
        userId,
        plan: planId.replace('plan_', ''),
        status: 'pending',
        currentPeriodStart: new Date().toISOString().split('T')[0],
        currentPeriodEnd: this.calculateNextBillingDate(plan)
      });

      // Create payment record
      await PaymentModel.create({
        userId,
        subscriptionId: subscription.id,
        amount: plan.price,
        status: 'pending',
        method: 'credit_card',
        description: `${plan.name} - NT$${plan.price / 100}`
      });

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            status: 'pending',
            plan: plan.interval,
            ecpayPeriodStart: subscription.currentPeriodStart,
            ecpayPeriodType: plan.periodType,
            ecpayFrequency: plan.frequency,
            nextBillingDate: subscription.currentPeriodEnd,
            totalCycles: plan.totalCycles,
            message: '請完成付款以啟用訂閱'
          }
        }
      });
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '建立訂閱失敗' }
      });
    }
  },

  // One-time payment (lifetime)
  async createOneTime(req, res) {
    try {
      const { planId } = req.body;
      const userId = req.user.userId;

      // Validate plan
      const plan = config.plans[planId.replace('plan_', '')];
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PLAN', message: '無效的方案' }
        });
      }

      if (plan.interval !== 'lifetime') {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_LIFETIME', message: '此 API 只能用於永久授權' }
        });
      }

      // Check existing subscription
      const existing = await SubscriptionModel.findByUserId(userId);
      if (existing && existing.plan === 'lifetime' && existing.status === 'active') {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_LIFETIME', message: '已購買永久授權' }
        });
      }

      // Create subscription (pending)
      const subscription = await SubscriptionModel.create({
        userId,
        plan: 'lifetime',
        status: 'pending',
        currentPeriodStart: new Date().toISOString().split('T')[0],
        currentPeriodEnd: '2099-12-31' // Permanent
      });

      // Create payment record
      const payment = await PaymentModel.create({
        userId,
        subscriptionId: subscription.id,
        amount: plan.price,
        status: 'pending',
        method: 'credit_card',
        description: `${plan.name} - NT$${plan.price / 100}`
      });

      res.json({
        success: true,
        data: {
          orderId: payment.id,
          amount: plan.price,
          currency: 'TWD',
          paymentInfo: {
            message: '請前往綠界完成付款',
            orderId: payment.id
          }
        }
      });
    } catch (error) {
      console.error('Create one-time error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '建立訂單失敗' }
      });
    }
  },

  // Get current subscription
  async get(req, res) {
    try {
      const subscription = await SubscriptionModel.findByUserId(req.user.userId);

      if (!subscription) {
        return res.json({
          success: true,
          data: {
            subscription: null
          }
        });
      }

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            status: subscription.status,
            plan: subscription.plan,
            ecpayPeriodStart: subscription.currentPeriodStart,
            ecpayPeriodType: config.plans[subscription.plan]?.periodType,
            ecpayFrequency: config.plans[subscription.plan]?.frequency,
            nextBillingDate: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
          }
        }
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取得訂閱失敗' }
      });
    }
  },

  // Cancel subscription
  async cancel(req, res) {
    try {
      const subscription = await SubscriptionModel.findByUserId(req.user.userId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '找不到訂閱' }
        });
      }

      if (subscription.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_CANCELLED', message: '訂閱已取消' }
        });
      }

      const updated = await SubscriptionModel.cancel(subscription.id);

      res.json({
        success: true,
        data: {
          subscription: {
            id: updated.id,
            status: updated.status,
            cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
            currentPeriodEnd: updated.currentPeriodEnd,
            message: '訂閱已取消，將於本週期結束後失效'
          }
        }
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '取消訂閱失敗' }
      });
    }
  },

  // Reactivate subscription
  async reactivate(req, res) {
    try {
      const subscription = await SubscriptionModel.findByUserId(req.user.userId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '找不到訂閱' }
        });
      }

      if (!subscription.cancelAtPeriodEnd) {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_CANCELLED', message: '訂閱未被取消' }
        });
      }

      const updated = await SubscriptionModel.reactivate(subscription.id);

      res.json({
        success: true,
        data: {
          subscription: {
            id: updated.id,
            status: updated.status,
            cancelAtPeriodEnd: updated.cancelAtPeriodEnd
          }
        }
      });
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '重新啟用訂閱失敗' }
      });
    }
  },

  // Helper: Calculate next billing date
  calculateNextBillingDate(plan) {
    const now = new Date();
    let next;

    if (plan.interval === 'month') {
      next = new Date(now.setMonth(now.getMonth() + 1));
    } else if (plan.interval === 'year') {
      next = new Date(now.setFullYear(now.getFullYear() + 1));
    } else {
      return '2099-12-31';
    }

    return next.toISOString().split('T')[0];
  }
};

module.exports = SubscriptionController;