# Women Safety AI Guardian 🛡️

An autonomous, event-driven, multimodal AI safety platform designed for real-time guardian protection. Built with a sequential multi-agent pipeline combining spatial, kinematic, acoustic, and physiological sensor streams into an explainable safety decision.

---

## 🌟 Key Architecture Innovations

1. **Sequential Multi-Agent Pipeline (Not Fake Parallel Polling)**:
   - **Trigger / Context Agent**: Initial geofenced isolation / manual SOS alert.
   - **GPS Agent**: Spatial isolation context, path deviation, and contextual risk analysis.
   - **Behaviour Agent**: Smartphone accelerometer & gyroscope motion signature (walking vs rapid evasion vs sudden struggle/fall).
   - **Voice Agent**: Acoustic frequency & spectral centroid analysis, scream detection, and emergency keyword spotting within a privacy-preserving window.
   - **Heart Rate Agent**: Smartwatch PPG heart rate comparison against personal baseline conditioned on physical exertion.
   - **Risk Fusion Agent**: Multimodal weighted fusion with non-linear consensus amplification and temporal consistency checks.
   - **Emergency Response Orchestrator**: Safe automated escalation, guardian SMS dispatch, location broadcast, and incident archival.

2. **Global Mode Isolation (One Pipeline, Two Data Implementations)**:
   - **`LIVE SAFETY MODE`**: Connects directly to genuine browser APIs (Geolocation, DeviceMotionEvent, Web Audio API spectral analyser, Web Bluetooth GATT BLE Heart Rate Service `0x180D`).
   - **`DEMO MODE (SIMULATED DATA)`**: Controlled scenario generators (`NORMAL`, `CAUTION`, `HIGH RISK`, `CRITICAL`) with zero live sensor pollution and safe simulated emergency actions.

3. **Sub-3 Minute Escalation Target**:
   - Each agent operates in dedicated sub-second windows with individual timeouts and fail-safe fallbacks.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Start FastAPI Backend
```powershell
# In project root
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend API will run at `http://localhost:8000`.  
Swagger interactive docs: `http://localhost:8000/docs`.

### 2. Start React + Vite Frontend
```powershell
cd frontend
npm install
npm run dev
```
Frontend UI will run at `http://localhost:5173`.

### 3. Run Automated Tests
```powershell
python -m pytest tests/ -v
```

---

## 🧪 Demonstration Walkthrough

1. **Sign In**:
   - Click the green **"Quick 1-Click Demo Evaluation Sign-in"** button on the Login page.
2. **Explore Dashboard**:
   - Verify active mode is **`DEMO MODE — SIMULATED DATA`** (top banner).
   - Scenario dropdown defaults to **`CRITICAL`**.
   - Note the four sensor health pills (GPS, Kinematics, Acoustic, SmartWatch).
3. **Launch SOS Safety Session**:
   - Press and hold the primary **SOS** button for 1 second.
   - Watch the interactive sequential pipeline:
     - `Suspicious Context` -> `GPS Agent` -> `Behaviour Agent` -> `Voice Agent` -> `Heart Rate Agent` -> `Risk Fusion Agent` -> `Emergency Escalation`.
   - Inspect live risk scores, latencies (ms), confidence gauges, and human-readable explainability reasoning cards.
4. **Emergency Escalation**:
   - Upon Critical threshold (>= 80), the **Demo Emergency Response Modal** opens showing simulated guardian SMS and location broadcast.
5. **Inspect Incident History**:
   - Open **Incident History** from sidebar.
   - Inspect the recorded incident with the `DEMO INCIDENT` badge, audit event log, and multi-agent breakdown scores.
6. **Switch to LIVE SAFETY MODE**:
   - Click **"Switch to LIVE MODE"** in the top banner.
   - Grant browser permissions for GPS and microphone.
   - Real-world movement and microphone loudness now stream directly into the live guardian adapters!

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point & WebSocket handler
│   │   ├── config/settings.py       # Config, thresholds, timeouts, fusion weights
│   │   ├── database/session.py      # SQLAlchemy SQLite engine & session maker
│   │   ├── models/models.py         # DB models (User, Session, Incident, Baseline, Contact)
│   │   ├── security/auth.py         # JWT tokens & bcrypt password hashing
│   │   ├── schemas/schemas.py       # Pydantic validation schemas
│   │   ├── services/                # Base & Real/Mock Service Adapters
│   │   ├── agents/                  # Sequential Multi-Agent Pipeline
│   │   ├── orchestrator/            # SafetyOrchestrator state machine & timeouts
│   │   ├── events/event_bus.py      # Real-time WebSocket event broadcaster
│   │   └── api/                     # REST API routers (auth, safety, contacts, incidents, settings, devices)
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Master application with layout & providers
│   │   ├── types/index.ts           # TypeScript type definitions
│   │   ├── services/                # REST API, WebSocket client, LiveSensors manager
│   │   ├── context/                 # AuthContext & SafetyContext
│   │   ├── components/              # Navbar, Sidebar, ModeBanner, PipelineVisualizer, AgentCard, RiskGauge, EmergencyModal
│   │   └── pages/                   # Dashboard, SafetySession, Contacts, SafeRoute, Incidents, Profile, Settings, Login
├── tests/
│   ├── test_agents.py               # Unit tests for all 5 agents & fusion
│   ├── test_mode_isolation.py       # Strict LIVE / DEMO isolation tests
│   └── test_api.py                  # API endpoints integration tests
├── README.md
```
