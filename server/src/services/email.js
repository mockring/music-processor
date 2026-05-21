const nodemailer = require('nodemailer');
const config = require('../config');

// Create Gmail SMTP transporter
let transporter = null;

function createTransporter() {
  if (!config.gmail.user || !config.gmail.appPassword) {
    console.error('Gmail SMTP: Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables');
    return null;
  }

  // Try port 465 (SSL) first, fallback to port 587 (TLS)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: config.gmail.user,
      pass: config.gmail.appPassword
    },
    tls: {
      rejectUnauthorized: true
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000
  });
}

// Initialize transporter
transporter = createTransporter();

// Default from address
const EMAIL_FROM = config.gmail.user || 'noreply@gmail.com';

async function sendPasswordResetEmail(email, token) {
  if (!transporter) {
    console.error('Gmail SMTP: Transporter not initialized');
    return false;
  }

  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: '【Music Ring】密碼重置連結',
      text: `
您好，

我們收到您提出的密碼重置請求。請點擊以下連結來設定新的密碼：

${resetUrl}

此連結將在 30 分鐘後過期。

如果您沒有申請密碼重置，請忽略此郵件。

- Music Ring 團隊
    `.trim()
    });

    console.log(`Password reset email sent to ${email}, message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('Gmail authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Gmail SMTP may be blocked by the hosting provider.');
    }
    return false;
  }
}

async function sendSerialKeyEmail(email, serialKey) {
  if (!transporter) {
    console.error('Gmail SMTP: Transporter not initialized');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: '【Music Ring】您的序號',
      text: `
您好，

感謝您的匯款！以下是您的音樂鈴序號：

${serialKey}

請在軟體中輸入此序號來啟用終身使用權。

如有問題，請聯繫我們。

- Music Ring 團隊
    `.trim()
    });

    console.log(`Serial key email sent to ${email}, message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send serial key email:', error.message);
    return false;
  }
}

async function sendPaymentConfirmationEmail(email, amount) {
  if (!transporter) {
    console.error('Gmail SMTP: Transporter not initialized');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: '【Music Ring】匯款資料已收到',
      text: `
您好，

我們已收到您的匯款資料：

匯款金額：NT$ ${amount}

我們會儘快確認並處理您的訂單。序號將在確認後發送至您的 Email。

感謝您的購買！

- Music Ring 團隊
    `.trim()
    });

    console.log(`Payment confirmation email sent to ${email}, message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error.message);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendSerialKeyEmail,
  sendPaymentConfirmationEmail,
  EMAIL_FROM
};