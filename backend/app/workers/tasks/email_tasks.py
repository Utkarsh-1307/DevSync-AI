import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger(__name__)


def _send_smtp(to: str, subject: str, body_html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAILS_FROM
    msg["To"] = to
    msg.attach(MIMEText(body_html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAILS_FROM, [to], msg.as_string())


@celery_app.task(
    name="app.workers.tasks.email_tasks.send_welcome_email",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_welcome_email(self, user_email: str, user_name: str) -> None:
    try:
        _send_smtp(
            to=user_email,
            subject="Welcome to DevSync AI",
            body_html=(
                f"<h1>Welcome, {user_name}!</h1>"
                "<p>Your DevSync AI account is ready. Start collaborating now.</p>"
            ),
        )
        logger.info("Welcome email sent", email=user_email)
    except Exception as exc:
        logger.error("Failed to send welcome email", exc=str(exc))
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.workers.tasks.email_tasks.send_workspace_invite",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_workspace_invite(
    self, invitee_email: str, inviter_name: str, workspace_name: str, invite_url: str
) -> None:
    try:
        _send_smtp(
            to=invitee_email,
            subject=f"{inviter_name} invited you to {workspace_name} on DevSync AI",
            body_html=(
                f"<h1>You've been invited!</h1>"
                f"<p>{inviter_name} has invited you to join <strong>{workspace_name}</strong>.</p>"
                f'<a href="{invite_url}">Accept Invitation</a>'
            ),
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.workers.tasks.email_tasks.send_task_assigned_email",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_task_assigned_email(
    self,
    assignee_email: str,
    assignee_name: str,
    task_title: str,
    project_name: str,
    task_url: str,
) -> None:
    try:
        _send_smtp(
            to=assignee_email,
            subject=f"Task assigned: {task_title}",
            body_html=(
                f"<h1>New task assigned</h1>"
                f"<p>Hi {assignee_name}, you've been assigned: <strong>{task_title}</strong> "
                f"in project {project_name}.</p>"
                f'<a href="{task_url}">View Task</a>'
            ),
        )
    except Exception as exc:
        raise self.retry(exc=exc)
