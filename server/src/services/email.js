const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || 'Music Processor <onboarding@resend.dev>';

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: '【Music Processor】密碼重置連結',
      text: `
您好，

我們收到您提出的密碼重置請求。請點擊以下連結來設定新的密碼：

${resetUrl}

此連結將在 30 分鐘後過期。

如果您沒有申請密碼重置，請忽略此郵件。

- Music Processor 團隊
      `.trim()
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`Password reset email sent to ${email}, message ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

async function sendSerialKeyEmail(email, serialKey) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: '【音樂鈴 Music Ring】您的序號',
      text: `
您好，

感謝您的匯款！以下是您的音樂鈴序號：

${serialKey}

請在軟體中輸入此序號來啟用終身使用權。

如有問題，請聯繫我們。

- 音樂鈴 Music Ring 團隊
      `.trim()
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`Serial key email sent to ${email}, message ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send serial key email:', error);
    return false;
  }
}

async function sendPaymentConfirmationEmail(email, amount) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: '【音樂鈴 Music Ring】匯款資料已收到',
      text: `
您好，

我們已收到您的匯款資料：

匯款金額：NT$ ${amount}

我們會儘快確認並處理您的訂單。序號將在確認後發送至您的 Email。

感謝您的購買！

- 音樂鈴 Music Ring 團隊
      `.trim()
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`Payment confirmation email sent to ${email}, message ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendSerialKeyEmail,
  sendPaymentConfirmationEmail,
  EMAIL_FROM
};
