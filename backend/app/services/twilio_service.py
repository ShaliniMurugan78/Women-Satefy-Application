"""
Twilio Emergency Notification Service
======================================
Handles real SMS sending and voice calls to emergency contacts.
Uses Twilio REST API via the twilio Python SDK.

Setup:
    1. Sign up at https://twilio.com (free trial gives ~$15 credit)
    2. Get your Account SID, Auth Token, and a Twilio phone number
    3. Fill in the values in backend/.env.twilio OR set environment variables:
       TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

Reply Detection:
    Twilio can call back a webhook URL when a contact replies to the SMS.
    Set TWILIO_WEBHOOK_URL to your backend's public URL.
    Use ngrok (https://ngrok.com) to expose localhost during development:
        ngrok http 8000
    Then set: TWILIO_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/twilio/sms-reply
"""

import os
import logging
import asyncio
from pathlib import Path
import re
from typing import Optional

logger = logging.getLogger("twilio_service")

# ---------------------------------------------------------------------------
# Load credentials from .env.twilio file (fallback to environment variables)
# ---------------------------------------------------------------------------
def _load_env_file():
    env_file = Path(__file__).parent.parent.parent / ".env.twilio"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip()
                if key and val and not os.environ.get(key):
                    os.environ[key] = val

_load_env_file()

TWILIO_ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN", "")
_raw_from           = os.getenv("TWILIO_FROM_NUMBER", "").strip()
TWILIO_FROM_NUMBER  = ("+" + _raw_from) if (_raw_from and not _raw_from.startswith("+")) else _raw_from
TWILIO_WEBHOOK_URL  = os.getenv("TWILIO_WEBHOOK_URL", "").strip()

# Check if credentials are real (not placeholders)
def _creds_configured() -> bool:
    return (
        bool(TWILIO_ACCOUNT_SID)
        and not TWILIO_ACCOUNT_SID.startswith("your_")
        and bool(TWILIO_AUTH_TOKEN)
        and not TWILIO_AUTH_TOKEN.startswith("your_")
        and bool(TWILIO_FROM_NUMBER)
        and not TWILIO_FROM_NUMBER.startswith("+1XXXX")
    )

TWILIO_CONFIGURED = _creds_configured()

# ---------------------------------------------------------------------------
# Lazy Twilio client initialisation
# ---------------------------------------------------------------------------
_twilio_client = None

def get_twilio_client():
    global _twilio_client
    if _twilio_client is None and TWILIO_CONFIGURED:
        try:
            from twilio.rest import Client
            _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            logger.info("Twilio client initialised successfully.")
        except ImportError:
            logger.error("Twilio SDK not installed. Run: python -m pip install twilio")
        except Exception as e:
            logger.error(f"Failed to initialise Twilio client: {e}")
    return _twilio_client


# ---------------------------------------------------------------------------
# SMS Functions
# ---------------------------------------------------------------------------
def send_emergency_sms(to_number: str, message: str) -> dict:
    """
    Send a real SMS to the given number via Twilio.

    Returns a dict with keys: success (bool), sid (str), error (str or None)
    """
    if not TWILIO_CONFIGURED:
        logger.warning(
            "Twilio credentials not configured. SMS simulated (not sent). "
            "Fill in backend/.env.twilio to enable real SMS."
        )
        return {
            "success": False,
            "sid": "SIMULATED",
            "error": "Twilio not configured — add credentials to backend/.env.twilio",
            "simulated": True,
        }

    client = get_twilio_client()
    if not client:
        return {"success": False, "sid": None, "error": "Twilio client unavailable", "simulated": False}

    clean_to = re.sub(r"[^\d+]", "", to_number.strip())
    if not clean_to.startswith("+"):
        clean_to = "+" + clean_to

    try:
        kwargs = {
            "body": message,
            "from_": TWILIO_FROM_NUMBER,
            "to": clean_to,
        }
        if TWILIO_WEBHOOK_URL and "your-public-url.com" not in TWILIO_WEBHOOK_URL:
            kwargs["status_callback"] = TWILIO_WEBHOOK_URL

        msg = client.messages.create(**kwargs)
        logger.info(f"SMS sent to {clean_to} | SID: {msg.sid} | Status: {msg.status}")
        return {"success": True, "sid": msg.sid, "error": None, "simulated": False}
    except Exception as e:
        error_msg = str(e)
        if "21608" in error_msg:
            error_msg = f"Twilio Error 21608: {clean_to} is unverified. Trial accounts require verifying recipient numbers in Twilio Console (Phone Numbers > Verified Caller IDs)."
        elif "30044" in error_msg:
            error_msg = f"Twilio Error 30044: Message exceeds trial segment limit (160 GSM-7 chars)."
        logger.error(f"Failed to send SMS to {clean_to}: {error_msg}")
        return {"success": False, "sid": None, "error": error_msg, "simulated": False}


async def send_emergency_sms_async(to_number: str, message: str) -> dict:
    """Async wrapper for send_emergency_sms."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_emergency_sms, to_number, message)


# ---------------------------------------------------------------------------
# Voice Call Functions
# ---------------------------------------------------------------------------
def make_emergency_call(to_number: str, twiml_message: str) -> dict:
    """
    Make an outbound voice call via Twilio that speaks an emergency message.

    Args:
        to_number: Phone number to call (E.164 format: +919876543210)
        twiml_message: The text to speak in the call
    Returns:
        dict with success, sid, error keys
    """
    if not TWILIO_CONFIGURED:
        logger.warning(
            "Twilio credentials not configured. Voice call simulated (not placed). "
            "Fill in backend/.env.twilio to enable real calls."
        )
        return {
            "success": False,
            "sid": "SIMULATED",
            "error": "Twilio not configured — add credentials to backend/.env.twilio",
            "simulated": True,
        }

    client = get_twilio_client()
    if not client:
        return {"success": False, "sid": None, "error": "Twilio client unavailable", "simulated": False}

    clean_to = re.sub(r"[^\d+]", "", to_number.strip())
    if not clean_to.startswith("+"):
        clean_to = "+" + clean_to

    try:
        # TwiML to speak the emergency message twice then hang up
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-IN">{twiml_message}</Say>
    <Pause length="1"/>
    <Say voice="alice" language="en-IN">{twiml_message}</Say>
    <Say voice="alice" language="en-IN">This is an automated emergency call. Please contact the person immediately or reply to the SMS you received.</Say>
</Response>"""

        call = client.calls.create(
            twiml=twiml,
            from_=TWILIO_FROM_NUMBER,
            to=clean_to,
        )
        logger.info(f"Emergency call initiated to {clean_to} | SID: {call.sid}")
        return {"success": True, "sid": call.sid, "error": None, "simulated": False}
    except Exception as e:
        error_msg = str(e)
        if "21608" in error_msg:
            error_msg = f"Twilio Error 21608: {clean_to} is unverified. Trial accounts require verifying recipient numbers in Twilio Console (Phone Numbers > Verified Caller IDs)."
        logger.error(f"Failed to make emergency call to {clean_to}: {error_msg}")
        return {"success": False, "sid": None, "error": error_msg, "simulated": False}


async def make_emergency_call_async(to_number: str, twiml_message: str) -> dict:
    """Async wrapper for make_emergency_call."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, make_emergency_call, to_number, twiml_message)
