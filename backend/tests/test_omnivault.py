"""
Comprehensive Integration and Unit Tests for OmniVault backend.
"""

import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config.database import get_database
from app.utils.security import hash_password, verify_password
from app.utils.jwt import generate_token, decode_token
from app.utils.fallback import security_fallback, hint_fallback, build_security_badge, clamp, snap_expiry


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_crypto_helpers():
    pwd = "MySecretPassphrase123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong_password", hashed) is False

    token = generate_token("user_123", "test@example.com", "user")
    decoded = decode_token(token)
    assert decoded["id"] == "user_123"
    assert decoded["email"] == "test@example.com"
    assert decoded["role"] == "user"


@pytest.mark.asyncio
async def test_ai_fallback_and_utilities():
    tax_result = security_fallback("tax_return_2025.pdf", 1024 * 1024)
    assert tax_result["sensitivity"] == "high"
    assert tax_result["downloadLimit"] == 1
    assert tax_result["expiresInMinutes"] == 60

    meme_result = security_fallback("cat_meme.png", 500 * 1024)
    assert meme_result["sensitivity"] == "low"
    assert meme_result["downloadLimit"] == 10

    general_result = security_fallback("notes.txt", 1024)
    assert general_result["sensitivity"] == "medium"
    assert general_result["downloadLimit"] == 5

    hint = hint_fallback("mysecretpassphrase")
    assert "hint" in hint
    assert len(hint["hint"]) > 0

    assert clamp(0, 1, 50) == 1
    assert clamp(100, 1, 50) == 50
    assert clamp(25, 1, 50) == 25

    assert snap_expiry(14) == 15
    assert snap_expiry(55) == 60
    assert snap_expiry(10000) == 10080


@pytest.mark.asyncio
async def test_auth_edge_cases():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"auth_edge_{uuid.uuid4().hex[:8]}@example.com"
        pwd = "TestPassword123!"

        # Register
        res1 = await client.post("/api/auth/register", json={"name": "Alice", "email": email, "password": pwd})
        assert res1.status_code == 200

        # Duplicate registration
        res2 = await client.post("/api/auth/register", json={"name": "Alice", "email": email, "password": pwd})
        assert res2.status_code == 400
        assert "already registered" in res2.json()["message"].lower()

        # Login with wrong password
        res3 = await client.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
        assert res3.status_code == 401
        assert "invalid email or password" in res3.json()["message"].lower()

        # Unauthorized access
        res4 = await client.get("/api/auth/me")
        assert res4.status_code == 401


@pytest.mark.asyncio
async def test_vault_download_limits():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"vault_limit_{uuid.uuid4().hex[:8]}@example.com"
        pwd = "TestPassword123!"

        # 1. Register
        reg = await client.post("/api/auth/register", json={"name": "Bob", "email": email, "password": pwd})
        token = reg.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Upload with 1 download limit
        file_bytes = b"SINGLE_USE_SECRET_PAYLOAD"
        files = {"file": ("secret.txt", file_bytes, "text/plain")}
        data = {
            "iv": "dGVzdF9pdl8xMjM0NTY=",
            "originalName": "secret.txt",
            "mimeType": "text/plain",
            "sizeBytes": str(len(file_bytes)),
            "downloadLimit": "1",
            "expiresInMinutes": "15",
        }
        up = await client.post("/api/files/upload", data=data, files=files, headers=headers)
        assert up.status_code == 201
        file_id = up.json()["fileId"]

        # 3. Generate Link with downloadLimit = 1
        v_res = await client.post(f"/api/vault/{file_id}/generate", json={
            "downloadLimit": 1,
            "expiresInMinutes": 15,
        }, headers=headers)
        vault_token = v_res.json()["vaultToken"]

        # 4. First download succeeds
        dl1 = await client.post(f"/api/vault/{vault_token}/download")
        assert dl1.status_code == 200
        assert dl1.content == file_bytes

        # 5. Second download fails with 403 Download limit reached
        dl2 = await client.post(f"/api/vault/{vault_token}/download")
        assert dl2.status_code == 403
        assert "download limit reached" in dl2.json()["message"].lower()

        # 6. Vault info also reflects limit reached
        info_check = await client.get(f"/api/vault/{vault_token}")
        assert info_check.status_code == 403


@pytest.mark.asyncio
async def test_full_auth_and_vault_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"tester_{uuid.uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"

        # 1. Register
        reg_res = await client.post("/api/auth/register", json={
            "name": "Test User",
            "email": test_email,
            "password": password,
        })
        assert reg_res.status_code == 200, reg_res.text
        reg_data = reg_res.json()
        assert "token" in reg_data
        token = reg_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Profile
        me_res = await client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["user"]["email"] == test_email

        # 3. AI suggestion (rule-based fallback when no GROQ key)
        ai_res = await client.post("/api/ai/security-suggest", json={
            "filename": "confidential_contract.pdf",
            "sizeBytes": 204800,
        }, headers=headers)
        assert ai_res.status_code == 200
        assert ai_res.json()["sensitivity"] == "high"

        # AI passphrase hint endpoint
        hint_res = await client.post("/api/ai/passphrase-hint", json={
            "passphrase": "supersecretpassword",
        }, headers=headers)
        assert hint_res.status_code == 200
        assert "hint" in hint_res.json()

        # 4. Upload Encrypted File
        dummy_encrypted_bytes = b"MOCK_AES_GCM_ENCRYPTED_DATA_BLOB"
        files = {
            "file": ("encrypted.bin", dummy_encrypted_bytes, "application/octet-stream"),
        }
        data = {
            "iv": "dGVzdF9pdl8xMjM0NTY=",
            "originalName": "contract.pdf",
            "mimeType": "application/pdf",
            "sizeBytes": str(len(dummy_encrypted_bytes)),
            "downloadLimit": "2",
            "expiresInMinutes": "60",
            "passphraseHint": "Signature date",
        }
        upload_res = await client.post("/api/files/upload", data=data, files=files, headers=headers)
        assert upload_res.status_code == 201, upload_res.text
        file_id = upload_res.json()["fileId"]

        # 5. List Files
        list_res = await client.get("/api/files", headers=headers)
        assert list_res.status_code == 200
        user_files = list_res.json()["files"]
        assert any(f["_id"] == file_id for f in user_files)

        # 6. Generate Vault Link
        vault_res = await client.post(f"/api/vault/{file_id}/generate", json={
            "downloadLimit": 2,
            "expiresInMinutes": 60,
            "passphraseHint": "Signature date",
        }, headers=headers)
        assert vault_res.status_code == 200
        vault_token = vault_res.json()["vaultToken"]

        # 7. Access Vault Info as Public User
        info_res = await client.get(f"/api/vault/{vault_token}")
        assert info_res.status_code == 200
        info_data = info_res.json()
        assert info_data["originalName"] == "contract.pdf"
        assert info_data["remainingDownloads"] == 2

        # 8. Download Encrypted File via Vault Token
        dl_res = await client.post(f"/api/vault/{vault_token}/download")
        assert dl_res.status_code == 200
        assert dl_res.content == dummy_encrypted_bytes
        assert dl_res.headers["x-file-iv"] == "dGVzdF9pdl8xMjM0NTY="

        # 9. Verify Download Decrement
        info_res2 = await client.get(f"/api/vault/{vault_token}")
        assert info_res2.status_code == 200
        assert info_res2.json()["remainingDownloads"] == 1

        # 10. Check Audit Logs
        audit_res = await client.get(f"/api/files/{file_id}/audit", headers=headers)
        assert audit_res.status_code == 200
        actions = [log["action"] for log in audit_res.json()["logs"]]
        assert "UPLOADED" in actions
        assert "LINK_ACCESSED" in actions
        assert "DOWNLOADED" in actions

        # 11. Revoke Vault Link
        revoke_res = await client.patch(f"/api/files/{file_id}/revoke", headers=headers)
        assert revoke_res.status_code == 200

        # 12. Verify Revoked Link Blocks Access
        revoked_check = await client.get(f"/api/vault/{vault_token}")
        assert revoked_check.status_code == 403

        # 13. Delete File
        del_res = await client.delete(f"/api/files/{file_id}", headers=headers)
        assert del_res.status_code == 200

        # 14. Logout & Verify Token Invalidation
        logout_res = await client.post("/api/auth/logout", headers=headers)
        assert logout_res.status_code == 200
        invalid_res = await client.get("/api/auth/me", headers=headers)
        assert invalid_res.status_code == 401
