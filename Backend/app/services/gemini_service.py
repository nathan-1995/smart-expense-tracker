"""
Google Gemini API service for document processing.

This module handles communication with Google Gemini API
for extracting structured data from bank statements.
"""
import httpx
import json
import base64
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from app.core.config import settings
from app.core.exceptions import DocumentProcessingError
from app.models.api_usage import APIUsage, APIServiceType, APIOperationType
from sqlalchemy.ext.asyncio import AsyncSession


class GeminiService:
    """Service for Google Gemini API interactions."""

    # Gemini API configuration
    API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    TIMEOUT_SECONDS = 180.0  # 3 minutes for large PDFs

    @staticmethod
    def _build_bank_statement_prompt() -> str:
        """
        Build the prompt for bank statement data extraction.

        Returns:
            str: Formatted prompt for Gemini API
        """
        return """Extract ALL transactions from this bank statement PDF.

Return ONLY valid JSON (no markdown, no explanations). Use this EXACT format:

{
  "transactions": [
    {
      "transaction_date": "YYYY-MM-DD",
      "description": "text",
      "amount": 123.45,
      "transaction_type": "debit",
      "balance_after": 5000.00,
      "category": "food",
      "merchant": "Merchant Name",
      "account_last4": "1234"
    }
  ],
  "metadata": {
    "account_holder": "Account holder name if visible",
    "account_number_last4": "Last 4 digits if visible",
    "statement_period": "Period description",
    "total_transactions": 10
  }
}

Required fields:
- transaction_date: YYYY-MM-DD format
- description: Full transaction text from statement
- amount: Positive decimal (e.g. 123.45)
- transaction_type: ONLY "debit" or "credit" (lowercase)

Optional fields (include if identifiable):
- balance_after: Balance after this transaction
- category: One of: salary, rent, utilities, food, transportation, entertainment, shopping, healthcare, business_expense, investment, transfer, other, uncategorized
- merchant: Merchant/vendor name if identifiable
- account_last4: Last 4 digits of account if shown

Metadata (include if visible):
- account_holder: Account owner name
- account_number_last4: Last 4 digits of account number
- statement_period: Statement period description

Rules:
- Extract EVERY transaction visible
- Sort by date (oldest first)
- Use double quotes for all strings
- No trailing commas
- Omit optional fields if not available"""

    @staticmethod
    async def _encode_pdf_to_base64(file_content: bytes) -> str:
        """
        Encode PDF file content to base64.

        Args:
            file_content: Raw PDF file bytes

        Returns:
            str: Base64 encoded string
        """
        return base64.b64encode(file_content).decode('utf-8')

    @staticmethod
    def _parse_gemini_response(response_text: str) -> Dict[str, Any]:
        """
        Parse and validate Gemini API response.

        Args:
            response_text: Raw response text from Gemini

        Returns:
            dict: Parsed transaction data

        Raises:
            DocumentProcessingError: If response is invalid
        """
        try:
            # Remove markdown code blocks if present
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            # Try to parse JSON
            try:
                data = json.loads(cleaned_text)
            except json.JSONDecodeError as e:
                # Log the problematic JSON for debugging
                print(f"Failed to parse JSON. Error: {str(e)}")

                # Save full response to file for debugging
                import tempfile
                debug_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json', prefix='gemini_debug_')
                debug_file.write(cleaned_text)
                debug_file.close()
                print(f"Full response saved to: {debug_file.name}")

                print(f"Response length: {len(cleaned_text)} characters")
                print(f"First 500 chars: {cleaned_text[:500]}")
                print(f"Around error position (char {e.pos}): ...{cleaned_text[max(0, e.pos-50):e.pos+50]}...")

                raise DocumentProcessingError(
                    detail=f"Failed to parse Gemini response as JSON: {str(e)}. Check console for debug file location."
                )

            # Validate structure
            if "transactions" not in data:
                raise DocumentProcessingError(
                    detail="Invalid response format: missing 'transactions' field"
                )

            if not isinstance(data["transactions"], list):
                raise DocumentProcessingError(
                    detail="Invalid response format: 'transactions' must be a list"
                )

            # Validate each transaction has required fields
            required_fields = ["transaction_date", "description", "amount", "transaction_type"]
            for idx, transaction in enumerate(data["transactions"]):
                for field in required_fields:
                    if field not in transaction:
                        raise DocumentProcessingError(
                            detail=f"Transaction {idx} missing required field: {field}"
                        )

                # Validate transaction_type
                if transaction["transaction_type"] not in ["debit", "credit"]:
                    raise DocumentProcessingError(
                        detail=f"Transaction {idx} has invalid type: {transaction['transaction_type']}"
                    )

            return data

        except DocumentProcessingError:
            raise
        except Exception as e:
            raise DocumentProcessingError(
                detail=f"Error parsing Gemini response: {str(e)}"
            )

    @staticmethod
    async def _log_api_usage(
        db: AsyncSession,
        user_id: Optional[UUID],
        document_id: Optional[UUID],
        model_name: str,
        input_tokens: int,
        output_tokens: int,
        status_code: int,
        success: bool,
        duration_ms: Optional[int] = None,
        error_message: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> None:
        """
        Log API usage to the database for monitoring and quota tracking.

        Args:
            db: Database session
            user_id: User who made the request (None for system requests)
            document_id: Related document ID if applicable
            model_name: Model used (e.g., "gemini-2.5-flash")
            input_tokens: Number of input tokens (prompt + data)
            output_tokens: Number of output tokens
            status_code: HTTP status code from API
            success: Whether the request succeeded
            duration_ms: Request duration in milliseconds
            error_message: Error message if request failed
            request_id: API request ID from provider
        """
        try:
            usage_record = APIUsage(
                service=APIServiceType.GEMINI,
                operation=APIOperationType.DOCUMENT_PROCESSING,
                model_name=model_name,
                user_id=user_id,
                document_id=document_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
                status_code=status_code,
                success=1 if success else 0,
                error_message=error_message,
                duration_ms=duration_ms,
                request_id=request_id
            )

            db.add(usage_record)
            await db.commit()

        except Exception as e:
            # Don't fail the main operation if logging fails
            print(f"Warning: Failed to log API usage: {str(e)}")
            await db.rollback()

    @staticmethod
    async def extract_bank_statement_data(
        file_content: bytes,
        filename: str,
        db: AsyncSession,
        user_id: Optional[UUID] = None,
        document_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Extract transaction data from bank statement PDF using Gemini API.

        Args:
            file_content: Raw PDF file bytes
            filename: Original filename (for logging)
            db: Database session for logging API usage
            user_id: User who initiated the request (optional)
            document_id: Document ID being processed (optional)

        Returns:
            dict: Extracted transaction data with structure:
                {
                    "transactions": [...],
                    "metadata": {...}
                }

        Raises:
            DocumentProcessingError: If extraction fails
        """
        start_time = datetime.utcnow()
        input_tokens = 0
        output_tokens = 0
        status_code = 0
        error_message = None

        try:
            # Encode PDF to base64
            pdf_base64 = await GeminiService._encode_pdf_to_base64(file_content)

            # Build request payload
            prompt = GeminiService._build_bank_statement_prompt()

            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            },
                            {
                                "inline_data": {
                                    "mime_type": "application/pdf",
                                    "data": pdf_base64
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,  # Low temperature for consistent extraction
                    "topK": 1,
                    "topP": 0.1,
                    "maxOutputTokens": 32768,  # Increased for large statements
                }
            }

            # Set up headers
            headers = {
                "Content-Type": "application/json",
            }

            # Build URL with API key - use model from settings
            url = f"{GeminiService.API_BASE_URL}/models/{settings.GEMINI_MODEL}:generateContent"
            if not settings.GEMINI_API_KEY:
                raise DocumentProcessingError(detail="GEMINI_API_KEY is not configured on the server.")

            # Make request to Gemini API
            async with httpx.AsyncClient(timeout=GeminiService.TIMEOUT_SECONDS) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    params={"key": settings.GEMINI_API_KEY}
                )

                # Store status code
                status_code = response.status_code

                # Check for API errors
                if response.status_code != 200:
                    error_detail = f"Gemini API error: {response.status_code}"
                    try:
                        error_data = response.json()
                        error_detail += f" - {error_data.get('error', {}).get('message', 'Unknown error')}"
                    except:
                        error_detail += f" - {response.text}"

                    print(f"Gemini API Error: {error_detail}")
                    print(f"Full response: {response.text}")

                    error_message = error_detail
                    raise DocumentProcessingError(detail=error_detail)

                # Parse response
                response_data = response.json()

                # Extract token usage from response metadata
                if "usageMetadata" in response_data:
                    usage_metadata = response_data["usageMetadata"]
                    input_tokens = usage_metadata.get("promptTokenCount", 0)
                    output_tokens = usage_metadata.get("candidatesTokenCount", 0)
                    # Alternative fields if the above don't exist
                    if input_tokens == 0:
                        input_tokens = usage_metadata.get("inputTokenCount", 0)
                    if output_tokens == 0:
                        output_tokens = usage_metadata.get("outputTokenCount", 0)

                # Extract text from response
                if "candidates" not in response_data or len(response_data["candidates"]) == 0:
                    raise DocumentProcessingError(
                        detail="Gemini API returned no candidates"
                    )

                candidate = response_data["candidates"][0]
                if "content" not in candidate or "parts" not in candidate["content"]:
                    raise DocumentProcessingError(
                        detail="Invalid Gemini API response structure"
                    )

                parts = candidate["content"]["parts"]
                if len(parts) == 0 or "text" not in parts[0]:
                    raise DocumentProcessingError(
                        detail="Gemini API returned no text content"
                    )

                extracted_text = parts[0]["text"]

                # Parse and validate extracted data
                extracted_data = GeminiService._parse_gemini_response(extracted_text)

                # Calculate duration
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

                # Log successful API usage
                await GeminiService._log_api_usage(
                    db=db,
                    user_id=user_id,
                    document_id=document_id,
                    model_name=settings.GEMINI_MODEL,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    status_code=status_code,
                    success=True,
                    duration_ms=duration_ms
                )

                return extracted_data

        except DocumentProcessingError as e:
            # Calculate duration
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            # Log failed API usage
            await GeminiService._log_api_usage(
                db=db,
                user_id=user_id,
                document_id=document_id,
                model_name=settings.GEMINI_MODEL,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                status_code=status_code if status_code != 0 else 500,
                success=False,
                duration_ms=duration_ms,
                error_message=str(e)
            )
            raise
        except Exception as e:
            # Calculate duration
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            # Log failed API usage
            await GeminiService._log_api_usage(
                db=db,
                user_id=user_id,
                document_id=document_id,
                model_name=settings.GEMINI_MODEL,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                status_code=status_code if status_code != 0 else 500,
                success=False,
                duration_ms=duration_ms,
                error_message=str(e)
            )
            raise DocumentProcessingError(
                detail=f"Failed to process document with Gemini: {str(e)}"
            )
