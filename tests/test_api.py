import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import Base, engine

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_auth_and_session_flow():
    import time
    # 1. Register a test user
    email = f"guardian_tester_{int(time.time())}@test.com"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Test Guardian User",
        "phone": "+1234567890"
    })
    
    if reg_res.status_code == 400: # Already registered in previous run
        login_res = client.post("/api/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
    else:
        assert reg_res.status_code == 200
        token = reg_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Profile
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 3. Emergency Contacts (starts empty without auto default contacts)
    contacts_res = client.get("/api/contacts", headers=headers)
    assert contacts_res.status_code == 200
    assert len(contacts_res.json()) == 0

    # Add contact explicitly
    add_res = client.post("/api/contacts", headers=headers, json={
        "name": "Trusted Guardian",
        "phone": "+19876543210",
        "relationship": "Parent",
        "is_primary": True
    })
    assert add_res.status_code == 200
    assert len(client.get("/api/contacts", headers=headers).json()) == 1

    # 4. Settings
    settings_res = client.get("/api/settings", headers=headers)
    assert settings_res.status_code == 200
    assert settings_res.json()["critical_threshold"] == 80.0

    # 5. Devices
    devices_res = client.get("/api/devices/watch", headers=headers)
    assert devices_res.status_code == 200
    assert devices_res.json()["is_connected"] == True
