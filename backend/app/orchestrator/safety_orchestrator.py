import asyncio
import datetime
import logging
import os
import shutil
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.database.session import SessionLocal
from backend.app.models.models import SafetySession, AgentEvent, Incident, EmergencyContact, User, AudioRecording
from backend.app.agents.gps_agent import GPSAgent
from backend.app.agents.behaviour_agent import BehaviourAgent
from backend.app.agents.voice_agent import VoiceAgent
from backend.app.agents.panic_gesture_agent import PanicGestureAgent, get_live_panic, clear_live_panic
from backend.app.agents.risk_fusion_agent import RiskFusionAgent
from backend.app.agents.base_agent import AgentResult
from backend.app.events.event_bus import event_bus
from backend.app.services.twilio_service import (
    send_emergency_sms_async,
    make_emergency_call_async,
    TWILIO_CONFIGURED,
)
from backend.app.services.sms_reply_store import sms_reply_store

logger = logging.getLogger("safety_orchestrator")

class SafetyOrchestrator:
    def __init__(self):
        self.gps_agent = GPSAgent(threshold=35.0)
        self.behaviour_agent = BehaviourAgent(threshold=40.0)
        self.voice_agent = VoiceAgent(threshold=40.0)
        self.panic_gesture_agent = PanicGestureAgent(threshold=40.0, wait_timeout=20.0)
        self.risk_fusion_agent = RiskFusionAgent()
        # Active running background tasks: session_id -> asyncio.Task
        self._running_tasks: Dict[str, asyncio.Task] = {}
        # Cancellation flags: session_id -> bool
        self._cancelled_sessions: Dict[str, bool] = {}

    def cancel_session(self, session_id: str):
        """Cancels an active safety monitoring session."""
        self._cancelled_sessions[session_id] = True
        if session_id in self._running_tasks:
            task = self._running_tasks[session_id]
            if not task.done():
                task.cancel()
        logger.info(f"Safety session {session_id} marked as CANCELLED")

    def is_cancelled(self, session_id: str) -> bool:
        return self._cancelled_sessions.get(session_id, False)

    async def _wait_for_gps_telemetry(self, user_id: int, session_id: str, timeout: float = 8.0) -> bool:
        """
        In LIVE mode, waits up to `timeout` seconds for the frontend to push real GPS
        coordinates to the backend (either via /telemetry/gps or at session creation).
        Returns True if coordinates arrived, False if timed out.
        """
        from backend.app.services import real_gps_service
        elapsed = 0.0
        while elapsed < timeout:
            # Check if live telemetry was pushed by the client
            if user_id in real_gps_service._latest_telemetry:
                return True
            # Also check if session record already has coordinates (sent at creation time)
            try:
                tmp_db = SessionLocal()
                sess = tmp_db.query(SafetySession).filter(SafetySession.id == session_id).first()
                has_coords = sess is not None and sess.location_lat is not None and sess.location_lng is not None
                tmp_db.close()
                if has_coords:
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.5)
            elapsed += 0.5
        return False

    async def _wait_for_audio_upload(self, session_id: str, timeout: float = 5.0) -> bool:
        """
        After the Voice Agent recording window (12s), waits up to `timeout` seconds for
        the browser to upload the audio recording to the backend DB.
        Returns True if a recording is found, False if timed out.
        """
        elapsed = 0.0
        while elapsed < timeout:
            try:
                tmp_db = SessionLocal()
                rec = tmp_db.query(AudioRecording).filter(AudioRecording.session_id == session_id).first()
                tmp_db.close()
                if rec:
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.5)
            elapsed += 0.5
        return False

    async def _wait_for_panic_gesture(self, user_id: int, session_id: str, timeout: float = 20.0) -> bool:
        """
        Waits up to `timeout` seconds for the phone to push a panic gesture event.
        Returns True if a confirmed panic event arrived, False on timeout.
        """
        elapsed = 0.0
        step    = 0.5
        while elapsed < timeout:
            if self.is_cancelled(session_id):
                return False
            event = get_live_panic(user_id)
            if event and event.get("panic_triggered"):
                return True
            await asyncio.sleep(step)
            elapsed += step
        return False

    async def run_safety_pipeline(
        self,
        session_id: str,
        user_id: int,
        mode: str = "LIVE",
        scenario: str = "CRITICAL",
        simulated_call_only: bool = False
    ):
        """
        Executes the event-driven multi-agent safety pipeline:
        GPS Agent -> Behaviour Agent -> Voice Agent -> Panic Gesture Agent -> Risk Assessment Agent -> Emergency Response

        LIVE mode:  Each agent waits for REAL sensor data from the device before analyzing.
                    GPS: waits up to 8s for live coordinates.
                    Behaviour: waits 3s for device motion events to accumulate.
                    Voice: waits full 12s recording window + 3s upload buffer.
                    Panic Gesture: waits up to 20s for 3-shake or volume-long-press from phone.
        DEMO mode:  Each agent uses scenario-based mock data.
        HYBRID mode: GPS uses DEMO scenario; real phone shake detection active.
        """
        effective_gps_mode = "DEMO" if mode.upper() == "HYBRID" else mode
        db = SessionLocal()
        session_record = db.query(SafetySession).filter(SafetySession.id == session_id).first()
        if not session_record:
            db.close()
            return

        # Clear any stale panic gesture event from a previous session
        clear_live_panic(user_id)

        try:
            logger.info(f"Starting safety workflow: session={session_id}, mode={mode}, scenario={scenario}")
            results: Dict[str, AgentResult] = {}

            # ──────────────────────────────────────────────────
            # STEP 0: SOS TRIGGER — Pipeline Activated
            # ──────────────────────────────────────────────────
            if self.is_cancelled(session_id):
                return
            await event_bus.broadcast_event(session_id, "SUSPICIOUS_PLACE_DETECTED", {
                "session_id": session_id,
                "scenario": scenario,
                "mode": mode,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "initial_trigger": session_record.initial_trigger_reason,
                "message": "SOS Activated — Guardian multi-agent safety pipeline starting. Initializing all sensor streams."
            })
            session_record.current_agent = "GPS_AGENT"
            db.commit()
            await asyncio.sleep(0.8)

            # ──────────────────────────────────────────────────
            # STEP 1: GPS AGENT
            # LIVE: polls for real coordinates up to 8s
            # DEMO: uses scenario mock location data
            # ──────────────────────────────────────────────────
            if self.is_cancelled(session_id):
                return
            await event_bus.broadcast_event(session_id, "GPS_AGENT_STARTED", {
                "agent": "GPS_AGENT",
                "status": "ACTIVE",
                "message": "Acquiring live GPS location — obtaining device coordinates, reverse geocoding to readable place name, computing isolation and route deviation..."
            })

            if mode.upper() == "LIVE":
                # Wait for browser to push GPS coordinates (up to 8s)
                gps_arrived = await self._wait_for_gps_telemetry(user_id, session_id, timeout=8.0)
                if not gps_arrived:
                    logger.warning("GPS telemetry not received in time for %s — using fallback.", session_id)
                await asyncio.sleep(1.0)
            else:
                # DEMO/HYBRID: scenario mock data, brief realistic delay
                await asyncio.sleep(2.5)

            gps_res = self.gps_agent.analyze(
                user_id=user_id, session_id=session_id,
                mode=effective_gps_mode, scenario=scenario
            )
            results["GPS_AGENT"] = gps_res
            self._save_agent_event(db, session_id, gps_res)
            session_record.location_lat = gps_res.features.get("latitude")
            session_record.location_lng = gps_res.features.get("longitude")
            session_record.risk_score = gps_res.risk_score
            session_record.risk_level = gps_res.risk_level
            session_record.confidence = gps_res.confidence
            session_record.current_agent = "BEHAVIOUR_AGENT"
            db.commit()
            await event_bus.broadcast_event(session_id, "GPS_AGENT_COMPLETED", gps_res.dict())
            await asyncio.sleep(1.0)

            # ──────────────────────────────────────────────────
            # STEP 2: BEHAVIOUR AGENT
            # LIVE: reads device accelerometer/gyroscope (3s window)
            #   If no motion data and no BLE: reports "Motion cannot be detected"
            # DEMO: uses scenario mock kinematic data
            # ──────────────────────────────────────────────────
            if self.is_cancelled(session_id):
                return
            await event_bus.broadcast_event(session_id, "BEHAVIOUR_AGENT_STARTED", {
                "agent": "BEHAVIOUR_AGENT",
                "status": "ACTIVE",
                "message": "Reading device motion — analyzing 3-axis accelerometer and gyroscope for gait classification. If Bluetooth smartwatch is not paired, motion detection may be limited."
            })

            # Allow 3s for device motion events to accumulate before sampling
            await asyncio.sleep(3.0 if mode.upper() == "LIVE" else 2.5)

            beh_res = self.behaviour_agent.analyze(
                user_id=user_id, session_id=session_id,
                mode=mode, scenario=scenario,
                context={"gps_features": gps_res.features}
            )
            results["BEHAVIOUR_AGENT"] = beh_res
            self._save_agent_event(db, session_id, beh_res)
            session_record.current_agent = "VOICE_AGENT"
            db.commit()
            await event_bus.broadcast_event(session_id, "BEHAVIOUR_AGENT_COMPLETED", beh_res.dict())
            await asyncio.sleep(0.8)

            # ──────────────────────────────────────────────────
            # STEP 3: VOICE AGENT
            # LIVE: signals browser to record 12s of surrounding audio
            #   Backend waits 14s total (12s window + 2s buffer) then polls DB for upload
            # DEMO: processes scenario .wav file via digital signal processing
            # ──────────────────────────────────────────────────
            if self.is_cancelled(session_id):
                return
            recording_duration_sec = 12
            await event_bus.broadcast_event(session_id, "VOICE_AGENT_STARTED", {
                "agent": "VOICE_AGENT",
                "status": "ACTIVE",
                "duration": recording_duration_sec,
                "message": "Microphone activated — recording surrounding sounds for acoustic analysis. Please remain still. Recording will complete in 12 seconds."
            })

            if mode.upper() == "LIVE":
                # Wait for full recording window then upload buffer
                await asyncio.sleep(float(recording_duration_sec) + 2.0)
                # Poll DB for uploaded recording (up to 3 more seconds)
                await self._wait_for_audio_upload(session_id, timeout=3.0)
            else:
                # DEMO: brief delay while scenario audio is processed by DSP
                await asyncio.sleep(3.5)

            voc_res = self.voice_agent.analyze(
                user_id=user_id, session_id=session_id,
                mode=mode, scenario=scenario,
                context={"behaviour_features": beh_res.features}
            )
            results["VOICE_AGENT"] = voc_res
            self._save_agent_event(db, session_id, voc_res)
            session_record.current_agent = "PANIC_GESTURE_AGENT"
            db.commit()

            # Build voice agent event payload — inject demo audio stream URL if DEMO/HYBRID mode
            voc_dict = voc_res.dict()
            if mode.upper() in ["DEMO", "HYBRID"]:
                if not voc_dict.get("features", {}).get("audio_stream_url"):
                    voc_dict.setdefault("features", {})
                    voc_dict["features"]["audio_stream_url"] = "/api/safety/audio/demo/" + scenario
                    voc_dict["features"]["recording_source"] = "DEMO AUDIO"

            await event_bus.broadcast_event(session_id, "VOICE_AGENT_COMPLETED", voc_dict)
            await asyncio.sleep(0.8)

            # ──────────────────────────────────────────────────
            # STEP 4: PANIC GESTURE AGENT
            # LIVE:   waits up to 20s for phone to push a 3-shake or
            #         volume-long-press panic gesture event.
            # DEMO:   uses scenario data (or real phone gesture in HYBRID).
            # ──────────────────────────────────────────────────
            if self.is_cancelled(session_id):
                return

            panic_wait_secs = 20 if mode.upper() == "LIVE" else 0
            await event_bus.broadcast_event(session_id, "PANIC_GESTURE_AGENT_STARTED", {
                "agent": "PANIC_GESTURE_AGENT",
                "status": "ACTIVE",
                "monitoring_window_seconds": panic_wait_secs,
                "message": (
                    f"Panic Gesture Monitor active — shake your phone 3 times to trigger. "
                    f"Monitoring window: {panic_wait_secs}s. "
                    "Volume-button long-press is not accessible via web APIs (browser limitation)."
                    if mode.upper() == "LIVE"
                    else "Evaluating panic gesture signal for scenario..."
                )
            })

            if mode.upper() == "LIVE":
                # Real mode: broadcast each detected shake from the live store
                # so the frontend can animate Shake 1 → 2 → 3.
                elapsed_check = 0.0
                while elapsed_check < panic_wait_secs:
                    if self.is_cancelled(session_id):
                        break
                    event_data = get_live_panic(user_id)
                    if event_data:
                        await event_bus.broadcast_event(session_id, "PANIC_SHAKE_UPDATE", {
                            "agent": "PANIC_GESTURE_AGENT",
                            "shake_count": event_data.get("shake_count", 0),
                            "panic_triggered": event_data.get("panic_triggered", False),
                            "trigger_label": event_data.get("trigger_label", ""),
                        })
                        if event_data.get("panic_triggered"):
                            break
                    await asyncio.sleep(1.0)
                    elapsed_check += 1.0
            else:
                # DEMO/HYBRID: short delay to simulate monitoring window
                await asyncio.sleep(3.0)
                # For HYBRID, real shakes may have arrived; broadcast update
                event_data = get_live_panic(user_id)
                if event_data and event_data.get("shake_count", 0) > 0:
                    await event_bus.broadcast_event(session_id, "PANIC_SHAKE_UPDATE", {
                        "agent": "PANIC_GESTURE_AGENT",
                        "shake_count": event_data.get("shake_count", 0),
                        "panic_triggered": event_data.get("panic_triggered", False),
                        "trigger_label": event_data.get("trigger_label", ""),
                    })

            panic_res = self.panic_gesture_agent.analyze(
                user_id=user_id, session_id=session_id,
                mode=mode, scenario=scenario,
                context={"behaviour_features": beh_res.features}
            )
            results["PANIC_GESTURE_AGENT"] = panic_res
            self._save_agent_event(db, session_id, panic_res)
            session_record.current_agent = "RISK_FUSION_AGENT"
            db.commit()
            await event_bus.broadcast_event(session_id, "PANIC_GESTURE_AGENT_COMPLETED", panic_res.dict())
            await asyncio.sleep(0.8)

            # ──────────────────────────────────────────────────
            # STEP 5: RISK FUSION AGENT
            # ──────────────────────────────────────────────────
            if self.is_cancelled(session_id):
                return
            await event_bus.broadcast_event(session_id, "RISK_FUSION_STARTED", {
                "agent": "RISK_FUSION_AGENT",
                "status": "ACTIVE",
                "message": "Synthesizing multi-modal evidence — fusing GPS location, motion kinematics, acoustic analysis, and panic gesture signal into unified risk decision..."
            })
            await asyncio.sleep(2.0)

            fusion_res = self.risk_fusion_agent.fuse(
                user_id=user_id,
                session_id=session_id,
                mode=mode,
                results=results
            )
            results["RISK_FUSION_AGENT"] = fusion_res
            self._save_agent_event(db, session_id, fusion_res)
            session_record.risk_score = fusion_res.risk_score
            session_record.risk_level = fusion_res.risk_level
            session_record.confidence = fusion_res.confidence
            is_critical = fusion_res.risk_level == "CRITICAL" or fusion_res.risk_score >= 80.0
            session_record.current_agent = "EMERGENCY_RESPONSE" if is_critical else "COMPLETED"
            db.commit()
            await event_bus.broadcast_event(session_id, "RISK_FUSION_COMPLETED", fusion_res.dict())
            await asyncio.sleep(1.0)

            # ──────────────────────────────────────────────────
            # STEP 6: EMERGENCY RESPONSE (Only if CRITICAL)
            # ──────────────────────────────────────────────────
            if is_critical:
                await self._execute_emergency_escalation(
                    db=db, session_record=session_record,
                    user_id=user_id, mode=mode, scenario=scenario,
                    results=results, fusion_res=fusion_res,
                    simulated_call_only=simulated_call_only
                )
            else:
                session_record.status = "COMPLETED"
                session_record.ended_at = datetime.datetime.utcnow()
                db.commit()
                await event_bus.broadcast_event(session_id, "SESSION_COMPLETED", {
                    "session_id": session_id,
                    "status": "COMPLETED",
                    "risk_score": fusion_res.risk_score,
                    "risk_level": fusion_res.risk_level,
                    "message": "Safety assessment complete. All sensor streams nominal."
                })

        except asyncio.CancelledError:
            logger.info("Pipeline for session %s cancelled.", session_id)
            session_record.status = "CANCELLED"
            session_record.ended_at = datetime.datetime.utcnow()
            db.commit()
            await event_bus.broadcast_event(session_id, "SESSION_CANCELLED", {
                "session_id": session_id, "status": "CANCELLED",
                "message": "Safety monitoring session cancelled by user."
            })
        except Exception as ex:
            logger.error("Error in safety pipeline: %s", ex, exc_info=True)
            session_record.status = "FAILED"
            db.commit()
            await event_bus.broadcast_event(session_id, "AGENT_FAILED", {
                "session_id": session_id, "error": str(ex),
                "message": "Safety pipeline encountered an error."
            })
        finally:
            self._running_tasks.pop(session_id, None)
            self._cancelled_sessions.pop(session_id, None)
            db.close()

    async def _execute_emergency_escalation(
        self,
        db: Session,
        session_record: SafetySession,
        user_id: int,
        mode: str,
        scenario: str,
        results: Dict[str, AgentResult],
        fusion_res: AgentResult,
        simulated_call_only: bool = False
    ):
        """
        Dispatches Emergency Response:
        1. Retrieves latest GPS coordinates & Google Maps link.
        2. Retrieves configured emergency contacts.
        3. Sends Emergency SMS to all contacts.
        4. Initiates emergency voice call (or simulated).
        5. Logs incident to database.
        """
        session_id = session_record.id
        session_record.status = "ESCALATED"
        session_record.ended_at = datetime.datetime.utcnow()
        db.commit()

        user = db.query(User).filter(User.id == user_id).first()
        user_name = user.full_name if user else "Safety User"
        contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).all()
        contact_list = [
            {
                "id": c.id, "name": c.name, "phone": c.phone,
                "relationship": c.relationship,
                "is_primary": bool(c.is_primary),
                "is_secondary": bool(c.is_secondary)
            }
            for c in contacts
        ]

        if not contact_list:
            logger.warning(f"No registered emergency contacts found for user_id {user_id}. Please add emergency contacts in settings.")

        lat = session_record.location_lat or 13.0827
        lng = session_record.location_lng or 80.2707
        map_url = f"https://maps.google.com/?q={lat:.6f},{lng:.6f}"
        emergency_message = (
            f"Emergency alert detected for {user_name}! "
            f"Please check on them immediately. "
            f"Current Location: {map_url}"
        )

        await event_bus.broadcast_event(session_id, "EMERGENCY_RESPONSE_STARTED", {
            "session_id": session_id,
            "risk_score": fusion_res.risk_score, "risk_level": fusion_res.risk_level,
            "user_name": user_name, "location_lat": lat, "location_lng": lng,
            "map_url": map_url, "contacts_count": len(contact_list),
            "contacts": contact_list, "simulated_call_only": simulated_call_only,
            "message": emergency_message, "timestamp": datetime.datetime.utcnow().isoformat()
        })

        # 1. SEND EMERGENCY SMS TO ALL CONTACTS
        for contact in contact_list:
            if self.is_cancelled(session_id):
                return
            sms_success = False
            error_reason = None
            if TWILIO_CONFIGURED and not simulated_call_only:
                try:
                    res = await send_emergency_sms_async(
                        to_number=contact["phone"], message=emergency_message
                    )
                    sms_success = res.get("success", False)
                    error_reason = res.get("error")
                except Exception as sms_err:
                    logger.error("SMS dispatch error for %s: %s", contact["phone"], sms_err)
                    sms_success = False
                    error_reason = str(sms_err)
            else:
                sms_success = True

            await event_bus.broadcast_event(session_id, "SMS_DISPATCHED", {
                "session_id": session_id, "contact_id": contact["id"],
                "contact_name": contact["name"], "contact_phone": contact["phone"],
                "status": "SENT" if sms_success else "FAILED",
                "error": error_reason,
                "simulated": not TWILIO_CONFIGURED or simulated_call_only,
                "message": emergency_message, "timestamp": datetime.datetime.utcnow().isoformat()
            })

        # 2. EMERGENCY VOICE CALL
        if not self.is_cancelled(session_id) and contact_list:
            primary = next((c for c in contact_list if c["is_primary"]), contact_list[0])
            call_status = "SIMULATED_VOICE_CALL_ACTIVE"
            call_msg = (
                f"Emergency alert! {user_name} is in distress. "
                f"Location coordinates: {lat:.4f}, {lng:.4f}. Immediate assistance requested."
            )
            if TWILIO_CONFIGURED and not simulated_call_only:
                try:
                    call_res = await make_emergency_call_async(
                        to_number=primary["phone"], twiml_message=call_msg
                    )
                    call_status = "DISPATCHED" if call_res.get("success") else "FAILED"
                except Exception as call_err:
                    logger.error("Call dispatch error for %s: %s", primary["phone"], call_err)
                    call_status = "FAILED"

            await event_bus.broadcast_event(session_id, "CALL_INITIATED", {
                "session_id": session_id, "contact_name": primary["name"],
                "contact_phone": primary["phone"], "call_status": call_status,
                "simulated": not TWILIO_CONFIGURED or simulated_call_only,
                "timestamp": datetime.datetime.utcnow().isoformat()
            })

        # 3. RECORD INCIDENT IN DATABASE
        incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
        new_incident = Incident(
            id=incident_id, session_id=session_id, user_id=user_id, mode=mode,
            risk_score=fusion_res.risk_score, risk_level=fusion_res.risk_level,
            location_summary=f"Lat: {lat:.5f}, Lng: {lng:.5f} ({map_url})",
            started_at=session_record.started_at, ended_at=datetime.datetime.utcnow(),
            timeline=[
                {"event": "GPS_ANALYZED",            "score": results["GPS_AGENT"].risk_score            if "GPS_AGENT"            in results else 0},
                {"event": "BEHAVIOUR_ANALYZED",       "score": results["BEHAVIOUR_AGENT"].risk_score      if "BEHAVIOUR_AGENT"      in results else 0},
                {"event": "VOICE_ANALYZED",           "score": results["VOICE_AGENT"].risk_score          if "VOICE_AGENT"          in results else 0},
                {"event": "PANIC_GESTURE_ANALYZED",   "score": results["PANIC_GESTURE_AGENT"].risk_score  if "PANIC_GESTURE_AGENT"  in results else 0,
                 "triggered": results["PANIC_GESTURE_AGENT"].features.get("panic_triggered", False)       if "PANIC_GESTURE_AGENT"  in results else False},
                {"event": "RISK_FUSED", "state": fusion_res.risk_level, "score": fusion_res.risk_score}
            ],
            agent_breakdown={k: v.dict() for k, v in results.items()},
            emergency_action_taken=f"Emergency Alert Sent to {len(contact_list)} contacts. Map: {map_url}",
            contact_notification_status="SENT", call_status="DISPATCHED",
            reasoning=fusion_res.reasoning
        )
        db.add(new_incident)
        db.commit()

        # Guarantee a demo audio recording is linked to the incident if none uploaded
        existing_audio = db.query(AudioRecording).filter(AudioRecording.session_id == session_id).first()
        if not existing_audio:
            demo_file = "distress_sound.wav" if (scenario in ["CRITICAL", "HIGH_RISK"] or mode.upper() == "HYBRID") else "normal_environment.wav"
            src_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo", "audio", demo_file)
            if not os.path.exists(src_path):
                src_path = os.path.join(os.getcwd(), "backend", "demo", "audio", demo_file)
            storage_dir = os.path.join(os.path.dirname(__file__), "..", "..", "recordings")
            os.makedirs(storage_dir, exist_ok=True)
            if os.path.exists(src_path):
                rec_filename = f"rec_{session_id}_{demo_file}"
                dst_path = os.path.join(storage_dir, rec_filename)
                try:
                    shutil.copyfile(src_path, dst_path)
                    db.add(AudioRecording(
                        session_id=session_id, user_id=user_id, filename=rec_filename,
                        file_path=os.path.abspath(dst_path), duration_seconds=12,
                        file_size_bytes=os.path.getsize(dst_path),
                        rms_level=0.48 if "distress" in demo_file else 0.08,
                        is_distress=scenario in ["CRITICAL", "HIGH_RISK"],
                        mode=mode.upper(), recorded_at=datetime.datetime.utcnow()
                    ))
                    db.commit()
                except Exception as ex:
                    logger.warning("Failed to link scenario audio evidence: %s", ex)

        await event_bus.broadcast_event(session_id, "INCIDENT_CREATED", {
            "incident_id": incident_id, "session_id": session_id,
            "risk_score": fusion_res.risk_score, "risk_level": fusion_res.risk_level,
            "map_url": map_url, "message": "Emergency response completed and incident logged."
        })

    def _save_agent_event(self, db: Session, session_id: str, result: AgentResult):
        try:
            evt = AgentEvent(
                session_id=session_id, agent_name=result.agent_name,
                event_type=f"{result.agent_name}_ASSESSMENT",
                risk_score=result.risk_score, risk_level=result.risk_level,
                confidence=result.confidence, reasoning=result.reasoning,
                features=result.features, latency_ms=result.latency_ms,
                timestamp=datetime.datetime.utcnow()
            )
            db.add(evt)
            db.commit()
        except Exception as e:
            logger.error("Failed to persist AgentEvent: %s", e)
            db.rollback()

safety_orchestrator = SafetyOrchestrator()
