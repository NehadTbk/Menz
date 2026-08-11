const nodemailer = require('nodemailer');

let transporterPromise = null;

function buildTransporter() {
  if (process.env.SMTP_HOST) {
    return Promise.resolve(nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    }));
  }

  // No SMTP configured (local dev): use a throwaway Ethereal test inbox
  // so the reset flow works out of the box. Preview URL is logged to console.
  return nodemailer.createTestAccount().then((testAccount) => nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  }));
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
}

async function sendPasswordResetEmail(to, resetUrl) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@menz.com',
    to,
    subject: 'Reset your Menz password',
    text: `You requested a password reset. Use the link below (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>You requested a password reset. Click the link below (valid for 1 hour):</p>`
      + `<p><a href="${resetUrl}">${resetUrl}</a></p>`
      + `<p>If you did not request this, you can ignore this email.</p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('Password reset email preview URL:', previewUrl);
  }

  return info;
}

module.exports = { sendPasswordResetEmail };
