import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let transporter;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth:
                env.SMTP_USER && env.SMTP_PASSWORD
                    ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
                    : undefined,
        });
    }
    return transporter;
}

/**
 * Send an email. Logs on failure but doesn't throw (email delivery should
 * not crash auth flows). Returns the SMTP info object (with messageId) on
 * success or null on failure.
 */
export async function sendEmail({ to, subject, html, text }) {
    try {
        const info = await getTransporter().sendMail({
            from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
            to,
            subject,
            html,
            text,
        });
        logger.info({ messageId: info.messageId, to }, "Email sent");
        return info;
    } catch (err) {
        logger.error({ err, to, subject }, "Failed to send email");
        return null;
    }
}

export async function sendVerificationEmail(email, token, name) {
    const url = `${env.APP_URL}/verify-email?token=${token}`;
    return sendEmail({
        to: email,
        subject: "Verify your email — Privacy Platform",
        html: `
      <h2>Welcome${name ? `, ${name}` : ""}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
      <p>Or copy this URL: <code>${url}</code></p>
      <p>This link expires in 24 hours.</p>
    `,
        text: `Verify your email: ${url}\nThis link expires in 24 hours.`,
    });
}

export async function sendPasswordResetEmail(email, token) {
    const url = `${env.APP_URL}/reset-password?token=${token}`;
    return sendEmail({
        to: email,
        subject: "Password reset — Privacy Platform",
        html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click below to set a new password:</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
      <p>Or copy this URL: <code>${url}</code></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore it.</p>
    `,
        text: `Reset your password: ${url}\nThis link expires in 1 hour.`,
    });
}
