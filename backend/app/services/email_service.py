"""Email delivery service.

Uses Python's built-in smtplib for SMTP delivery.
If SMTP_HOST is not configured, the reset link is logged to the console
so development works without a mail server.
"""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

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


def _build_project_invitation_email(
    to_email: str, project_name: str, inviter_name: str, invitation_link: str
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Invitation to join {project_name} on DevSync"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    plain_text = (
        f"{inviter_name} invited you to join the {project_name} project on DevSync.\n\n"
        f"Accept the invitation by signing in or creating an account with this email address:\n"
        f"{invitation_link}\n\n"
        "This invitation expires in 7 days."
    )
    html_text = f"""
    <html>
      <body style="font-family:sans-serif;background:#0a0a0f;color:#e4e4e7;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#18181b;border:1px solid #27272a;
                    border-radius:12px;padding:32px;">
          <h2 style="margin:0 0 12px;color:#fff;">Project invitation</h2>
          <p style="color:#a1a1aa;line-height:1.6;">
            {escape(inviter_name)} invited you to join
            <strong>{escape(project_name)}</strong> on DevSync.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="{escape(invitation_link, quote=True)}"
               style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;
                      text-decoration:none;border-radius:8px;font-weight:600;">
              Accept invitation
            </a>
          </p>
          <p style="color:#71717a;font-size:12px;">
            Sign in or create an account using {escape(to_email)}. This invitation expires in 7 days.
          </p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_text, "html"))
    return msg


async def send_project_invitation_email(
    to_email: str, project_name: str, inviter_name: str, invitation_link: str
) -> None:
    """Send an invitation, logging its link only when SMTP is not configured."""
    if not settings.SMTP_HOST:
        logger.info(
            "PROJECT INVITATION (no SMTP configured - copy into browser):\n  %s",
            invitation_link,
        )
        return

    msg = _build_project_invitation_email(
        to_email, project_name, inviter_name, invitation_link
    )
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            if settings.SMTP_PORT == 587:
                server.starttls()
                server.ehlo()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
        logger.info("Project invitation sent to %s", to_email)
    except smtplib.SMTPException as exc:
        logger.error("Failed to send project invitation to %s: %s", to_email, exc)
        raise


def _build_issue_assigned_email(to_email: str, recipient_name: str, details: dict) -> MIMEMultipart:
    project_name = details.get("project_name") or "a project"
    title = details.get("issue_title") or "Untitled task"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[{project_name}] Task assigned to you: {title}"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    rows = [
        ("Project", project_name),
        ("Task", title),
        ("Priority", details.get("priority")),
        ("Status", details.get("status")),
        ("Labels", ", ".join(details.get("labels") or [])),
        ("Branch", details.get("branch_name")),
        ("Assigned by", details.get("assigned_by")),
    ]
    rows = [(k, v) for k, v in rows if v]
    description = details.get("issue_description") or ""
    project_description = details.get("project_description") or ""
    link = details.get("link") or settings.FRONTEND_URL

    plain_lines = [f"Hi {recipient_name},", "", "A task has been assigned to you.", ""]
    plain_lines += [f"{k}: {v}" for k, v in rows]
    if project_description:
        plain_lines += ["", "About the project:", project_description]
    if description:
        plain_lines += ["", "Task description:", description]
    plain_lines += ["", f"Open the task: {link}"]

    table_rows = "".join(
        f'<tr><td style="padding:6px 12px 6px 0;color:#71717a;white-space:nowrap;">{escape(k)}</td>'
        f'<td style="padding:6px 0;color:#e4e4e7;">{escape(str(v))}</td></tr>'
        for k, v in rows
    )
    project_block = (
        f'<p style="color:#a1a1aa;font-size:13px;margin:16px 0 4px;">About the project</p>'
        f'<p style="color:#e4e4e7;font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;">'
        f"{escape(project_description)}</p>"
        if project_description
        else ""
    )
    description_block = (
        f'<p style="color:#a1a1aa;font-size:13px;margin:16px 0 4px;">Task description</p>'
        f'<p style="color:#e4e4e7;font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;">'
        f"{escape(description)}</p>"
        if description
        else ""
    )
    html_text = f"""
    <html>
      <body style="font-family:sans-serif;background:#0a0a0f;color:#e4e4e7;padding:32px;">
        <div style="max-width:520px;margin:0 auto;background:#18181b;border:1px solid #27272a;
                    border-radius:12px;padding:32px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">A task has been assigned to you</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Hi {escape(recipient_name)}, here are the details.
          </p>
          <table style="font-size:14px;border-collapse:collapse;">{table_rows}</table>
          {project_block}
          {description_block}
          <p style="text-align:center;margin:28px 0 0;">
            <a href="{escape(link, quote=True)}"
               style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;
                      text-decoration:none;border-radius:8px;font-weight:600;">
              Open task
            </a>
          </p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText("\n".join(plain_lines), "plain"))
    msg.attach(MIMEText(html_text, "html"))
    return msg


def _deliver(msg: MIMEMultipart, to_email: str) -> None:
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.ehlo()
        if settings.SMTP_PORT == 587:
            server.starttls()
            server.ehlo()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())


async def send_issue_assigned_email(to_email: str, recipient_name: str, details: dict) -> None:
    """Email the assignee the task details.

    Runs as a background task, so failures are logged rather than raised.
    """
    if not settings.SMTP_HOST:
        logger.info(
            "TASK ASSIGNED (no SMTP configured): %s -> %s\n  %s",
            details.get("issue_title"),
            to_email,
            details.get("link"),
        )
        return

    msg = _build_issue_assigned_email(to_email, recipient_name, details)
    try:
        # smtplib blocks; keep it off the event loop.
        await asyncio.to_thread(_deliver, msg, to_email)
        logger.info("Task assignment email sent to %s", to_email)
    except (smtplib.SMTPException, OSError) as exc:
        logger.error("Failed to send task assignment email to %s: %s", to_email, exc)
