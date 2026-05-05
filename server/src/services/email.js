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

module.exports = {
  sendPasswordResetEmail,
  EMAIL_FROM
};
