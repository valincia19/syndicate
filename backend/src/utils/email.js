/**
 * Email Utility
 * Handles SMTP transporter configuration and email deliveries via Mailtrap
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter = null;

if (env.smtp.user && env.smtp.pass) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465, // Use TLS/SSL if port is 465
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  transporter.verify((error) => {
    if (error) {
      logger.error('Email', 'SMTP connection verification failed', { error: error.message });
    } else {
      logger.info('Email', 'SMTP connection verified successfully. Ready to send emails.');
    }
  });
} else {
  logger.warn('Email', 'SMTP credentials not configured. Email utility will run in mock mode.');
}

/**
 * Send an email verification code
 * @param {string} to - Recipient email
 * @param {string} code - 6-digit numeric verification code
 */
async function sendVerificationEmail(to, code) {
  if (!transporter) {
    logger.warn('Email', 'SMTP transporter not configured, skipping sendVerificationEmail', { to, code });
    return;
  }

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff; color: #09090b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="font-size: 24px; font-weight: bold; margin: 0; color: #09090b; letter-spacing: -0.5px;">VALINC SYNDICATE</h2>
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #71717a;">Verification Service</span>
      </div>
      <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 20px 0;" />
      <p style="font-size: 14px; line-height: 1.5; color: #27272a; margin: 0 0 16px;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.5; color: #27272a; margin: 0 0 20px;">Thank you for registering with VALINC SYNDICATE. To finalize your account setup, please verify your email address using the secure code below. This code is valid for <strong>10 minutes</strong>.</p>
      <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; padding: 18px; text-align: center; font-size: 28px; font-weight: 800; font-family: monospace; letter-spacing: 6px; margin: 25px 0; border-radius: 8px; color: #09090b;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #71717a; margin: 20px 0 0;">If you did not sign up for VALINC SYNDICATE, you can safely ignore this message.</p>
      <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 25px 0 20px;" />
      <p style="font-size: 11px; text-align: center; color: #a1a1aa; margin: 0;">&copy; ${new Date().getFullYear()} VALINC SYNDICATE. All rights reserved.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to,
      subject: 'Verify Your Email Address - VALINC SYNDICATE',
      text: `Your verification code is: ${code}. It is valid for 10 minutes.`,
      html: htmlContent,
    });
    logger.info('Email', 'Verification email sent successfully', { to, messageId: info.messageId });
  } catch (error) {
    logger.error('Email', 'Failed to send verification email', { to, error: error.message });
    throw error;
  }
}

/**
 * Send a forgot password reset link
 * @param {string} to - Recipient email
 * @param {string} resetLink - Complete reset URL
 */
async function sendForgotPasswordEmail(to, resetLink) {
  if (!transporter) {
    logger.warn('Email', 'SMTP transporter not configured, skipping sendForgotPasswordEmail', { to, resetLink });
    return;
  }

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff; color: #09090b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="font-size: 24px; font-weight: bold; margin: 0; color: #09090b; letter-spacing: -0.5px;">VALINC SYNDICATE</h2>
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #71717a;">Password Recovery</span>
      </div>
      <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 20px 0;" />
      <p style="font-size: 14px; line-height: 1.5; color: #27272a; margin: 0 0 16px;">Hello,</p>
      <p style="font-size: 14px; line-height: 1.5; color: #27272a; margin: 0 0 20px;">You requested to reset your password for your VALINC SYNDICATE account. Please click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetLink}" style="background-color: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px; border: 1px solid #09090b;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #52525b; margin: 0 0 10px;">Or copy and paste this link into your browser address bar:</p>
      <p style="word-break: break-all; font-size: 12px; color: #2563eb; margin: 0 0 20px;"><a href="${resetLink}" style="color: #2563eb; text-decoration: underline;">${resetLink}</a></p>
      <p style="font-size: 12px; color: #71717a; margin: 20px 0 0;">If you did not request a password reset, no action is needed and you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 25px 0 20px;" />
      <p style="font-size: 11px; text-align: center; color: #a1a1aa; margin: 0;">&copy; ${new Date().getFullYear()} VALINC SYNDICATE. All rights reserved.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to,
      subject: 'Reset Your Password - VALINC SYNDICATE',
      text: `Reset your password by visiting this link: ${resetLink}. The link is valid for 1 hour.`,
      html: htmlContent,
    });
    logger.info('Email', 'Forgot password email sent successfully', { to, messageId: info.messageId });
  } catch (error) {
    logger.error('Email', 'Failed to send forgot password email', { to, error: error.message });
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  sendForgotPasswordEmail,
};
