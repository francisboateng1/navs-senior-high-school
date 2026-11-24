import nodemailer from 'nodemailer';
import { getDb } from '../config/db.js';
import { env, isSmtpConfigured } from '../config/env.js';

export async function sendOrQueueNotification(params) {
  const db = getDb();
  let deliveryStatus = 'pending_configuration';
  let errorMessage = null;
  let delivered = false;

  if (isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });
      await transporter.sendMail({
        from: env.smtpFrom,
        to: params.recipientEmail,
        subject: params.subject,
        text: params.body,
      });
      deliveryStatus = 'sent';
      delivered = true;
    } catch (err) {
      deliveryStatus = 'failed';
      errorMessage = err instanceof Error ? err.message : 'Unknown SMTP error';
    }
  } else {
    errorMessage = 'SMTP email provider not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS in environment).';
  }

  await db.execute(
    `INSERT INTO notifications (application_id, recipient_email, template_key, subject, body, delivery_status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.applicationId ?? null,
      params.recipientEmail,
      params.templateKey,
      params.subject,
      params.body,
      deliveryStatus,
      errorMessage,
    ]
  );

  return {
    delivered,
    status: deliveryStatus,
    message: errorMessage || 'Email notification sent successfully.',
  };
}
