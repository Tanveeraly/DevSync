"""Email delivery service.

Uses Python's built-in smtplib for SMTP delivery.
If SMTP_HOST is not configured, the reset link is logged to the console
so development works without a mail server.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_reset_email(to_email: str, reset_link: str) -> MIMEMultipart:
    """Compose the password-reset HTML email."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "DevSync - Password Reset Request"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    plain_text = (
        f"You requested a password reset for your DevSync account.\n\n"
        f"Click the link below to set a new password (valid for "
        f"{settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes):\n\n"
        f"{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email."
    )

    html_text = f"""
    <html>
      <body style="font-family:sans-serif;background:#0a0a0f;color:#e4e4e7;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#18181b;border:1px solid #27272a;
                    border-radius:12px;padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="display:inline-block;width:40px;height:40px;line-height:40px;
                         border-radius:8px;background:#4f46e5;color:#fff;font-weight:900;
                         font-size:14px;">DS</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">Password Reset Request</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">
            We received a request to reset the password for your DevSync account.
            Click the button below to choose a new password.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="{reset_link}"
               style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;
                      text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              Reset Password
            </a>
          </div>
          <p style="color:#71717a;font-size:12px;line-height:1.6;">
            This link expires in {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes.
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
    """

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_text, "html"))
    return msg


async def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """Send a password-reset email to *to_email*.

    Falls back to console logging when SMTP is not configured so the
    feature is usable in development without a mail server.
    """
    if not settings.SMTP_HOST:
        # Development fallback - print the link so it can be tested locally.
        logger.info(
            "PASSWORD RESET LINK (no SMTP configured - copy into browser):\n  %s",
            reset_link,
        )
        return

    msg = _build_reset_email(to_email, reset_link)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            if settings.SMTP_PORT == 587:
                server.starttls()
                server.ehlo()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
        logger.info("Password reset email sent to %s", to_email)
    except smtplib.SMTPException as exc:
        logger.error("Failed to send password reset email to %s: %s", to_email, exc)
        raise
