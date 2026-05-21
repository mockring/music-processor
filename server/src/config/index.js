require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-32-char-secret-key-here',
    expiry: process.env.JWT_EXPIRY || '24h'
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ytmusic'
  },

  // ECPay (綠界)
  ecpay: {
    merchantId: process.env.ECPAY_MERCHANT_ID || '',
    hashKey: process.env.ECPAY_HASH_KEY || '',
    hashIV: process.env.ECPAY_HASH_IV || '',
    apiUrl: process.env.ECPAY_API_URL || 'https://payment.ecpay.com.tw',
    debug: process.env.ECPAY_DEBUG === 'true'
  },

  // Subscription Plans (價格單位：分)
  plans: {
    monthly: {
      price: parseInt(process.env.PRICE_MONTHLY) || 20000,
      originalPrice: parseInt(process.env.PRICE_MONTHLY_ORIGINAL) || 25000,
      name: '月付方案',
      interval: 'month',
      periodType: 'M',
      frequency: 1,
      totalCycles: 0  // 0 = 不限制
    },
    yearly: {
      price: parseInt(process.env.PRICE_YEARLY) || 210000,
      originalPrice: parseInt(process.env.PRICE_YEARLY_ORIGINAL) || 270000,
      name: '年付方案',
      interval: 'year',
      periodType: 'Y',
      frequency: 1,
      totalCycles: 0
    },
    lifetime: {
      price: parseInt(process.env.PRICE_LIFETIME) || 600000,
      originalPrice: parseInt(process.env.PRICE_LIFETIME_ORIGINAL) || 900000,
      name: '永久授權',
      interval: 'lifetime',
      periodType: null,
      frequency: 0,
      totalCycles: 1  // 一次性
    }
  },

  // Device limits
  maxDevicesPerUser: 3,

  // Gmail SMTP
  gmail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || ''
  },

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001'
};