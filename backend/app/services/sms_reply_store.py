"""
In-memory SMS reply store.
Tracks which sessions are waiting for a reply and whether one arrived.
Twilio calls our webhook (POST /api/twilio/sms-reply) when a contact replies.
"""
import threading
from typing import Dict, Optional

class SmsReplyStore:
    """Thread-safe store for tracking SMS reply status per session."""
    
    def __init__(self):
        self._lock = threading.Lock()
        # session_id -> {"replied": bool, "reply_text": str, "from": str}
        self._store: Dict[str, dict] = {}

    def mark_waiting(self, session_id: str):
        """Mark a session as waiting for an SMS reply."""
        with self._lock:
            self._store[session_id] = {"replied": False, "reply_text": "", "from": ""}

    def mark_replied(self, from_number: str, reply_text: str):
        """
        Called by the Twilio webhook when any contact replies.
        Searches all waiting sessions and marks them replied.
        """
        with self._lock:
            for session_id, state in self._store.items():
                if not state["replied"]:
                    state["replied"] = True
                    state["reply_text"] = reply_text
                    state["from"] = from_number

    def has_replied(self, session_id: str) -> bool:
        """Check if an SMS reply was received for this session."""
        with self._lock:
            return self._store.get(session_id, {}).get("replied", False)

    def get_reply(self, session_id: str) -> Optional[dict]:
        with self._lock:
            return self._store.get(session_id)

    def clear(self, session_id: str):
        with self._lock:
            self._store.pop(session_id, None)


# Global singleton
sms_reply_store = SmsReplyStore()
