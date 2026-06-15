import os
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
from sqlalchemy.orm import Session
from models import User, Notification
import logging

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "1025"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "notifications@tptengineer.com")
        
        template_path = os.path.join(os.path.dirname(__file__), "templates")
        self.jinja_env = Environment(loader=FileSystemLoader(template_path))

    async def send_email(self, to_email: str, subject: str, template_name: str, context: dict):
        """Send email notification using SMTP"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject

            template = self.jinja_env.get_template(f"{template_name}.html")
            html_content = template.render(**context)
            
            msg.attach(MIMEText(html_content, 'html'))

            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_username,
                password=self.smtp_password,
                use_tls=os.getenv("SMTP_TLS", "false").lower() == "true"
            )
            
            logging.info(f"Email notification sent to {to_email}")
            return True
        except Exception as e:
            logging.error(f"Failed to send email: {str(e)}")
            return False

    async def send_push_notification(self, user_id: str, notification: dict):
        """Send push notification (FCM/WebPush placeholder)"""
        # Push notification integration will be implemented here
        logging.info(f"Push notification queued for user {user_id}")
        return True

    async def create_notification(self, user_id: str, notification_type: str, title: str, content: str, **kwargs):
        """Create notification in database and dispatch delivery"""
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            content=content,
            project_id=kwargs.get('project_id'),
            entity_type=kwargs.get('entity_type'),
            entity_id=kwargs.get('entity_id'),
            sender_id=kwargs.get('sender_id'),
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        # Dispatch notifications
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            # Send email if user has email notifications enabled
            if user.email_notifications_enabled:
                await self.send_email(
                    user.email,
                    title,
                    notification_type,
                    {
                        'user': user,
                        'notification': notification,
                        'app_url': os.getenv("APP_URL", "http://localhost:5173")
                    }
                )

            # Send push notification
            await self.send_push_notification(user_id, {
                'id': str(notification.id),
                'type': notification_type,
                'title': title,
                'content': content
            })

        return notification