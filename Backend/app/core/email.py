"""
Email service for sending transactional emails via Zoho ZeptoMail.

This module handles sending verification emails, password resets,
and other transactional emails using ZeptoMail API.
"""
import secrets
import httpx
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings


class EmailService:
    """Service for sending emails via Zoho ZeptoMail API."""

    @staticmethod
    def generate_verification_token() -> str:
        """
        Generate a secure random verification token.

        Returns:
            str: URL-safe random token (32 bytes = 64 hex characters)
        """
        return secrets.token_urlsafe(32)

    @staticmethod
    def get_verification_token_expiry() -> datetime:
        """
        Get expiration datetime for verification token.

        Returns:
            datetime: Token expiry time (24 hours from now)
        """
        return datetime.utcnow() + timedelta(hours=24)

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        to_name: Optional[str] = None
    ) -> bool:
        """
        Send an email via ZeptoMail API.

        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_body: HTML email content
            text_body: Plain text fallback (optional)
            to_name: Recipient name (optional)

        Returns:
            bool: True if sent successfully, False otherwise

        Raises:
            Exception: If ZeptoMail configuration is missing
        """
        # Validate ZeptoMail configuration
        if not all([
            settings.ZEPTOMAIL_API_KEY,
            settings.FROM_EMAIL
        ]):
            raise Exception("ZeptoMail configuration is incomplete. Check environment variables.")

        try:
            # Prepare the request payload
            payload = {
                "from": {
                    "address": settings.FROM_EMAIL,
                    "name": "FinTrack"
                },
                "to": [
                    {
                        "email_address": {
                            "address": to_email,
                            "name": to_name or to_email
                        }
                    }
                ],
                "subject": subject,
                "htmlbody": html_body
            }

            # Add text body if provided
            if text_body:
                payload["textbody"] = text_body

            # Set up headers
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "authorization": settings.ZEPTOMAIL_API_KEY
            }

            # Send the email via ZeptoMail API
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    settings.ZEPTOMAIL_API_URL,
                    json=payload,
                    headers=headers
                )

                # Check if successful (2xx status code)
                if response.status_code in range(200, 300):
                    return True
                else:
                    print(f"ZeptoMail API error: {response.status_code} - {response.text}")
                    return False

        except Exception as e:
            # Log error (in production, use proper logging)
            print(f"Failed to send email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def send_verification_email(
        to_email: str,
        first_name: str,
        verification_token: str,
        frontend_url: str
    ) -> bool:
        """
        Send email verification link to user.

        Args:
            to_email: User's email address
            first_name: User's first name for personalization
            verification_token: Unique verification token
            frontend_url: Frontend base URL (e.g., https://fintracker.cc)

        Returns:
            bool: True if sent successfully
        """
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"

        subject = "Verify your FinTrack account"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Welcome to FinTrack!</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                                Hi {first_name},
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                                Thank you for signing up! Please verify your email address by clicking the button below:
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{verification_link}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Verify Email Address</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #2563eb; word-break: break-all;">
                                {verification_link}
                            </p>

                            <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                                This link will expire in 24 hours. If you didn't create a FinTrack account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af; text-align: center;">
                                &copy; {datetime.utcnow().year} FinTrack. All rights reserved.<br>
                                You're receiving this email because you signed up for FinTrack.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_body = f"""
Welcome to FinTrack!

Hi {first_name},

Thank you for signing up! Please verify your email address by clicking the link below:

{verification_link}

This link will expire in 24 hours. If you didn't create a FinTrack account, you can safely ignore this email.

---
© {datetime.utcnow().year} FinTrack. All rights reserved.
"""

        return EmailService.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            to_name=first_name
        )

    @staticmethod
    def send_password_reset_email(
        to_email: str,
        first_name: str,
        reset_token: str,
        frontend_url: str
    ) -> bool:
        """
        Send password reset link to user.

        Args:
            to_email: User's email address
            first_name: User's first name
            reset_token: Password reset token
            frontend_url: Frontend base URL

        Returns:
            bool: True if sent successfully
        """
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        subject = "Reset your FinTrack password"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">Reset Your Password</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                                Hi {first_name},
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                                We received a request to reset your password. Click the button below to create a new password:
                            </p>
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{reset_link}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Reset Password</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #2563eb; word-break: break-all;">
                                {reset_link}
                            </p>
                            <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af; text-align: center;">
                                &copy; {datetime.utcnow().year} FinTrack. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_body = f"""
Reset Your Password

Hi {first_name},

We received a request to reset your password. Click the link below to create a new password:

{reset_link}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

---
© {datetime.utcnow().year} FinTrack. All rights reserved.
"""

        return EmailService.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            to_name=first_name
        )
