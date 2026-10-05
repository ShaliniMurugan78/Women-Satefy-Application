"""
Twilio Webhook API Endpoints
==============================
Twilio calls these endpoints when:
  - A contact replies to an emergency SMS  →  POST /api/twilio/sms-reply
  - A voice call status changes             →  POST /api/twilio/call-status

To use, your backend must be publicly accessible.
During development, expose it with ngrok:
    ngrok http 8000
Then set TWILIO_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/twilio/sms-reply
"""

import logging
from fastapi import APIRouter, Form, Request, Response
from backend.app.services.sms_reply_store import sms_reply_store

logger = logging.getLogger("twilio_webhook")
router = APIRouter(prefix="/api/twilio", tags=["Twilio Webhooks"])


@router.post("/sms-reply")
async def handle_sms_reply(
    request: Request,
    From: str = Form(default=""),
    Body: str = Form(default=""),
    MessageSid: str = Form(default=""),
    To: str = Form(default=""),
):
    """
    Twilio calls this endpoint when an emergency contact replies to the SMS.
    We record the reply so the orchestrator can stop the 1-minute countdown.
    """
    logger.info(f"SMS reply received from {From}: '{Body}' (SID: {MessageSid})")
    
    # Mark reply received (applies to all waiting sessions from this number)
    sms_reply_store.mark_replied(from_number=From, reply_text=Body)

    # Return empty TwiML response (no auto-reply to the contact)
    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="text/xml",
        status_code=200,
    )


@router.post("/call-status")
async def handle_call_status(
    request: Request,
    CallSid: str = Form(default=""),
    CallStatus: str = Form(default=""),
    To: str = Form(default=""),
    From: str = Form(default=""),
):
    """
    Twilio calls this endpoint with voice call status updates.
    Logs call outcomes (completed, no-answer, busy, failed).
    """
    logger.info(
        f"Call status update | SID: {CallSid} | To: {To} | Status: {CallStatus}"
    )
    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="text/xml",
        status_code=200,
    )
