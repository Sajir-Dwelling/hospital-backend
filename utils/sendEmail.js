const nodemailer = require('nodemailer');

// Production (Render): calls a Google Apps Script web app that sends the mail
// from your Gmail. Render's free plan blocks SMTP, but allows normal web requests.
const sendViaWebhook = async ({ to, subject, html }) => {
  const res = await fetch(process.env.MAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      secret: process.env.MAIL_WEBHOOK_SECRET,
      to,
      subject,
      html,
    }),
    redirect: 'follow',
  });

  const text = (await res.text()).trim();
  if (!res.ok || text !== 'ok') {
    throw new Error(`Mail webhook ${res.status}: ${text.slice(0, 200)}`);
  }
};

// Local: sends through Gmail with the app password in .env
const sendViaGmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"MedCore HMS" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (process.env.MAIL_WEBHOOK_URL) {
      await sendViaWebhook({ to, subject, html });
    } else {
      await sendViaGmail({ to, subject, html });
    }
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

module.exports = sendEmail;
