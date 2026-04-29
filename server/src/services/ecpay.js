const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

class ECPayService {
  constructor() {
    this.merchantId = config.ecpay.merchantId;
    this.hashKey = config.ecpay.hashKey;
    this.hashIV = config.ecpay.hashIV;
    this.apiUrl = config.ecpay.apiUrl;
    this.debug = config.ecpay.debug;
  }

  // Generate CheckMacValue
  generateMac(params) {
    // Sort by key and create params string
    const sortedKeys = Object.keys(params).sort();
    let paramsStr = '';

    for (const key of sortedKeys) {
      if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
        paramsStr += `${key}=${params[key]}&`;
      }
    }

    // Remove last &
    paramsStr = paramsStr.slice(0, -1);

    // URL encode
    paramsStr = encodeURIComponent(paramsStr)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');

    // Hash
    const hash = crypto.createHash('sha256')
      .update(Buffer.from(paramsStr + `HashKey=${this.hashKey}&HashIV=${this.hashIV}`))
      .digest('hex')
      .toUpperCase();

    return hash;
  }

  // Verify CheckMacValue
  verifyMac(params) {
    const receivedMac = params.CheckMacValue;
    if (!receivedMac) return false;

    const calculatedMac = this.generateMac(params);
    return receivedMac === calculatedMac;
  }

  // Create one-time payment (一次性付款)
  async createPayment(orderData) {
    const orderId = 'ORD' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: orderId,
      MerchantTradeDate: this.formatDate(new Date()),
      PaymentType: 'aio',
      TotalAmount: Math.round(orderData.amount),
      TradeDesc: orderData.description || 'Music Processor',
      ItemName: orderData.description || 'Item 1#NT$=' + orderData.amount,
      ReturnURL: config.frontendUrl + '/api/webhook/payment',
      ClientBackURL: config.frontendUrl + '/payment/success',
      PaymentInfoURL: config.frontendUrl + '/api/webhook/payment',
      ChoosePayment: orderData.method === 'atm' ? 'ATM' : 'Credit',
      EncryptType: 1
    };

    // Add ATM parameters if needed
    if (orderData.method === 'atm') {
      params.ExtraData = '';
      params.ExpireDate = orderData.expireDate || 7; // days
    }

    params.CheckMacValue = this.generateMac(params);

    const response = await this.sendToECPay(params);
    return response;
  }

  // Create recurring payment (定期定額)
  async createRecurring(customerData, plan) {
    const orderId = 'REC' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();

    const periodType = plan.periodType; // M, Y
    const frequency = plan.frequency; // 1, 2, ...

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: orderId,
      MerchantTradeDate: this.formatDate(new Date()),
      PaymentType: 'aio',
      TotalAmount: Math.round(plan.price),
      TradeDesc: 'Music Processor Subscription',
      ItemName: `${plan.name} - NT$${plan.price / 100}`,
      ReturnURL: config.frontendUrl + '/api/webhook/recurring',
      ClientBackURL: config.frontendUrl + '/subscription/success',
      PeriodType: periodType,
      Frequency: frequency,
      PeriodStartDate: this.formatDate(new Date()),
      Amount: Math.round(plan.price),
      CheckMacValue: ''
    };

    // For credit card token (from client)
    if (customerData.cardToken) {
      params.CardToken = customerData.cardToken;
    }

    params.CheckMacValue = this.generateMac(params);

    const response = await this.sendToECPay(params);
    return response;
  }

  // Query payment status
  async queryPayment(orderId) {
    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: orderId,
      TimeStamp: Math.floor(Date.now() / 1000),
      CheckMacValue: ''
    };

    params.CheckMacValue = this.generateMac(params);

    const response = await this.sendToECPay(params);
    return response;
  }

  // Send to ECPay API
  async sendToECPay(params) {
    try {
      if (this.debug) {
        console.log('ECPay Request:', params);
      }

      const response = await axios.post(
        this.apiUrl + '/Cashier/AioCheckOut/V2',
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000
        }
      );

      if (this.debug) {
        console.log('ECPay Response:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('ECPay Error:', error.message);
      throw new Error('綠界 API 連線失敗');
    }
  }

  // Format date for ECPay (yyyy/mm/dd HH:mm:ss)
  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}/${m}/${d} ${h}:${min}:${s}`;
  }

  // Handle webhook callback
  parseWebhook(body) {
    const { RtnCode, RtnMessage, MerchantTradeNo, TradeAmt, PaymentType, TradeDate, ...extra } = body;

    return {
      success: RtnCode === '1' || RtnCode === '2', // 1=paid, 2=pending
      orderId: MerchantTradeNo,
      amount: parseInt(TradeAmt),
      method: PaymentType,
      date: TradeDate,
      message: RtnMessage,
      extra
    };
  }
}

module.exports = new ECPayService();