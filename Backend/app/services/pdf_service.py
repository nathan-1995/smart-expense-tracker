"""
PDF generation service for invoices using xhtml2pdf and Jinja2.

This service handles rendering invoice HTML templates and converting them to PDF.
"""
import base64
from pathlib import Path
from typing import Optional
from io import BytesIO

from jinja2 import Environment, FileSystemLoader, select_autoescape
from xhtml2pdf import pisa
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.client import Client
from app.repositories.client_repository import ClientRepository


class PDFService:
    """Service for generating PDF documents from templates."""

    # Template directory path
    TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates" / "invoices"

    # Available templates
    AVAILABLE_TEMPLATES = ["default", "modern"]

    @staticmethod
    def _get_template_env() -> Environment:
        """
        Get Jinja2 environment configured for invoice templates.

        Returns:
            Environment: Configured Jinja2 environment
        """
        env = Environment(
            loader=FileSystemLoader(str(PDFService.TEMPLATE_DIR)),
            autoescape=select_autoescape(['html', 'xml'])
        )
        return env

    @staticmethod
    def _convert_image_to_base64(image_path: str) -> Optional[str]:
        """
        Convert an image file to base64 data URI.

        Args:
            image_path: Path to the image file

        Returns:
            Base64 data URI string or None if file not found
        """
        try:
            with open(image_path, 'rb') as image_file:
                image_data = image_file.read()
                base64_data = base64.b64encode(image_data).decode('utf-8')

                # Determine MIME type from file extension
                extension = Path(image_path).suffix.lower()
                mime_types = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                }
                mime_type = mime_types.get(extension, 'image/png')

                return f"data:{mime_type};base64,{base64_data}"
        except FileNotFoundError:
            return None

    @staticmethod
    async def generate_invoice_pdf(
        db: AsyncSession,
        invoice: Invoice,
        template_name: str = "default",
        company_settings: Optional[dict] = None
    ) -> bytes:
        """
        Generate PDF from invoice data.

        Args:
            db: Database session
            invoice: Invoice model instance
            template_name: Name of the template to use (default, modern)
            company_settings: Optional company settings dict with branding info

        Returns:
            bytes: PDF file content

        Raises:
            ValueError: If template not found
        """
        # Validate template
        if template_name not in PDFService.AVAILABLE_TEMPLATES:
            template_name = "default"

        # Get template environment
        env = PDFService._get_template_env()
        template = env.get_template(f"{template_name}.html")

        # Load client data
        client = await ClientRepository.get_by_id(db, invoice.client_id, invoice.user_id)
        if not client:
            raise ValueError("Client not found for invoice")

        # Prepare company settings with defaults
        company_data = company_settings or {}
        company_name = company_data.get('company_name', 'FinTrack')
        company_address = company_data.get('company_address')
        company_phone = company_data.get('company_phone')
        company_email = company_data.get('company_email')
        company_website = company_data.get('company_website')
        tax_id = company_data.get('tax_id')

        # Handle company logo (convert to base64 if provided)
        company_logo = None
        if company_data.get('company_logo'):
            # If already base64 data URI, use as-is
            if company_data['company_logo'].startswith('data:'):
                company_logo = company_data['company_logo']
            # Otherwise, assume it's a file path
            else:
                company_logo = PDFService._convert_image_to_base64(company_data['company_logo'])

        # Prepare template context
        context = {
            'invoice': invoice,
            'client': client,
            'company_name': company_name,
            'company_logo': company_logo,
            'company_address': company_address,
            'company_phone': company_phone,
            'company_email': company_email,
            'company_website': company_website,
            'tax_id': tax_id,
        }

        # Render HTML
        html_content = template.render(**context)

        # Generate PDF using xhtml2pdf
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(
            src=html_content,
            dest=pdf_file,
            encoding='utf-8'
        )

        if pisa_status.err:
            raise Exception(f"PDF generation failed with error code: {pisa_status.err}")

        pdf_file.seek(0)
        return pdf_file.read()

    @staticmethod
    async def generate_invoice_html(
        db: AsyncSession,
        invoice: Invoice,
        template_name: str = "default",
        company_settings: Optional[dict] = None
    ) -> str:
        """
        Generate HTML preview from invoice data (without converting to PDF).

        Args:
            db: Database session
            invoice: Invoice model instance
            template_name: Name of the template to use
            company_settings: Optional company settings dict

        Returns:
            str: Rendered HTML content
        """
        # Validate template
        if template_name not in PDFService.AVAILABLE_TEMPLATES:
            template_name = "default"

        # Get template environment
        env = PDFService._get_template_env()
        template = env.get_template(f"{template_name}.html")

        # Load client data
        client = await ClientRepository.get_by_id(db, invoice.client_id, invoice.user_id)
        if not client:
            raise ValueError("Client not found for invoice")

        # Prepare company settings
        company_data = company_settings or {}
        company_logo = None
        if company_data.get('company_logo'):
            if company_data['company_logo'].startswith('data:'):
                company_logo = company_data['company_logo']
            else:
                company_logo = PDFService._convert_image_to_base64(company_data['company_logo'])

        # Prepare context
        context = {
            'invoice': invoice,
            'client': client,
            'company_name': company_data.get('company_name', 'FinTrack'),
            'company_logo': company_logo,
            'company_address': company_data.get('company_address'),
            'company_phone': company_data.get('company_phone'),
            'company_email': company_data.get('company_email'),
            'company_website': company_data.get('company_website'),
            'tax_id': company_data.get('tax_id'),
        }

        # Render and return HTML
        return template.render(**context)
