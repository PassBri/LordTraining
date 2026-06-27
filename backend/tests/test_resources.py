"""Resources (Blog / API Docs / Support / Status) — FASE 5 backend tests.

Covers:
- Public reads: GET /api/resources/blog, /blog/{slug}, /api-docs, /support, /status
- Super Admin write gating: POST/PUT/DELETE /blog, PUT /api-docs, FAQ CRUD,
  PUT /support/settings, GET /support/messages
- Coach (non-super) forbidden on all writes -> 403
- Public POST /support/contact
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lordcoach-optimize.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

SUPER_EMAIL = "juegolaureado@gmail.com"
SUPER_PASS = "LordTraining2026!"

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'train_db')


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="session")
def super_token(mongo):
    # Clear lockout for this email
    try:
        mongo.login_attempts.delete_many({"email": SUPER_EMAIL})
    except Exception:
        pass
    r = requests.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS}, timeout=15)
    assert r.status_code == 200, f"super login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def coach_token(mongo):
    email = f"coach_res_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"email": email, "password": "CoachPass!2026", "name": "Coach Resources"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        # Try login
        r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "CoachPass!2026"}, timeout=15)
        assert r2.status_code == 200
        token = r2.json()["token"]
    # Force is_super_admin = False just in case
    try:
        mongo.users.update_one({"email": email}, {"$set": {"is_super_admin": False, "role": "coach"}})
    except Exception:
        pass
    return token


# ============== PUBLIC READS ==============
class TestPublicBlog:
    def test_list_blog_seeded(self):
        r = requests.get(f"{API}/resources/blog", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "posts" in data and "categories" in data
        assert isinstance(data["posts"], list)
        assert len(data["posts"]) >= 3, f"expected >=3 seed posts, got {len(data['posts'])}"
        assert isinstance(data["categories"], list) and len(data["categories"]) >= 1
        # field check
        p = data["posts"][0]
        for k in ("id", "slug", "title", "category", "summary", "created_at"):
            assert k in p, f"missing key {k} in blog post"

    def test_get_blog_by_slug(self):
        r = requests.get(f"{API}/resources/blog", timeout=15)
        slug = r.json()["posts"][0]["slug"]
        r2 = requests.get(f"{API}/resources/blog/{slug}", timeout=15)
        assert r2.status_code == 200
        post = r2.json()
        assert post["slug"] == slug
        assert "body" in post

    def test_get_blog_404(self):
        r = requests.get(f"{API}/resources/blog/this-slug-does-not-exist-xyz", timeout=15)
        assert r.status_code == 404


class TestPublicApiDocs:
    def test_get_api_docs(self):
        r = requests.get(f"{API}/resources/api-docs", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "sections" in data and isinstance(data["sections"], list)
        assert len(data["sections"]) >= 4
        ids = {s["id"] for s in data["sections"]}
        # At least the default ids should be present after seed
        assert {"intro", "auth", "endpoints", "examples"}.issubset(ids) or len(ids) >= 4


class TestPublicSupport:
    def test_get_support(self):
        r = requests.get(f"{API}/resources/support", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "faqs" in data and isinstance(data["faqs"], list)
        assert len(data["faqs"]) >= 1
        assert "settings" in data
        assert isinstance(data["settings"], dict)
        assert "email" in data["settings"]

    def test_post_contact_public(self):
        payload = {"name": "TEST_Contact", "email": "test@example.com",
                   "message": f"TEST_msg_{uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{API}/resources/support/contact", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True


class TestPublicStatus:
    def test_status_real(self):
        r = requests.get(f"{API}/resources/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["overall"] == "operational"
        assert "uptime_seconds" in d and isinstance(d["uptime_seconds"], int)
        assert d["uptime_seconds"] >= 0
        names = {c["name"] for c in d["components"]}
        assert "API" in names and "Base de datos" in names
        for c in d["components"]:
            assert c["status"] == "operational"
        # DB component should include latency_ms
        db_comp = next(c for c in d["components"] if c["name"] == "Base de datos")
        assert "latency_ms" in db_comp and isinstance(db_comp["latency_ms"], int)


# ============== SUPER ADMIN WRITES ==============
class TestBlogCRUDSuper:
    created_ids = []

    def test_create_update_delete(self, super_token, mongo):
        h = {"Authorization": f"Bearer {super_token}"}
        title = f"TEST_BlogPost_{uuid.uuid4().hex[:6]}"
        # CREATE
        r = requests.post(f"{API}/resources/blog", json={
            "title": title, "category": "TestCat",
            "summary": "test summary", "body": "test body",
            "image_url": "", "published": True
        }, headers=h, timeout=15)
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
        post = r.json()
        post_id = post["id"]
        slug = post["slug"]
        assert post["title"] == title
        assert post["category"] == "TestCat"

        # GET via slug
        r2 = requests.get(f"{API}/resources/blog/{slug}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["title"] == title

        # UPDATE
        new_title = title + "_upd"
        r3 = requests.put(f"{API}/resources/blog/{post_id}", json={
            "title": new_title, "category": "TestCat2",
            "summary": "x", "body": "y", "image_url": "", "published": True
        }, headers=h, timeout=15)
        assert r3.status_code == 200
        assert r3.json()["title"] == new_title
        assert r3.json()["category"] == "TestCat2"

        # DELETE
        r4 = requests.delete(f"{API}/resources/blog/{post_id}", headers=h, timeout=15)
        assert r4.status_code == 200
        assert r4.json().get("ok") is True

        # Cleanup safety (in case any orphan)
        try:
            mongo.blog_posts.delete_many({"title": {"$regex": "^TEST_BlogPost_"}})
        except Exception:
            pass


class TestApiDocsSuper:
    def test_update_docs(self, super_token):
        h = {"Authorization": f"Bearer {super_token}"}
        # Get current docs first
        current = requests.get(f"{API}/resources/api-docs", timeout=15).json()
        original = current["sections"]
        # PUT with a small perturbation (then restore)
        modified = [dict(s) for s in original]
        modified[0]["content"] = original[0]["content"] + " TEST_marker"
        r = requests.put(f"{API}/resources/api-docs",
                         json={"sections": modified}, headers=h, timeout=15)
        assert r.status_code == 200
        assert "TEST_marker" in r.json()["sections"][0]["content"]
        # Restore
        r2 = requests.put(f"{API}/resources/api-docs",
                          json={"sections": original}, headers=h, timeout=15)
        assert r2.status_code == 200


class TestSupportSuper:
    def test_faq_crud_and_settings_and_messages(self, super_token, mongo):
        h = {"Authorization": f"Bearer {super_token}"}
        # CREATE FAQ
        r = requests.post(f"{API}/resources/support/faqs", json={
            "question": "TEST_Q_" + uuid.uuid4().hex[:6],
            "answer": "TEST_A", "order": 99
        }, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        faq = r.json()
        fid = faq["id"]
        # UPDATE
        r2 = requests.put(f"{API}/resources/support/faqs/{fid}", json={
            "question": "TEST_Q_upd", "answer": "TEST_A_upd", "order": 100
        }, headers=h, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["question"] == "TEST_Q_upd"
        # DELETE
        r3 = requests.delete(f"{API}/resources/support/faqs/{fid}",
                             headers=h, timeout=15)
        assert r3.status_code == 200

        # Settings update (restore original after)
        before = requests.get(f"{API}/resources/support", timeout=15).json()["settings"]
        new_settings = {**before, "intro": "TEST_intro " + uuid.uuid4().hex[:4]}
        r4 = requests.put(f"{API}/resources/support/settings",
                          json=new_settings, headers=h, timeout=15)
        assert r4.status_code == 200
        # Verify GET reflects
        check = requests.get(f"{API}/resources/support", timeout=15).json()["settings"]
        assert check["intro"] == new_settings["intro"]
        # Restore
        requests.put(f"{API}/resources/support/settings",
                     json=before, headers=h, timeout=15)

        # Messages list (super only)
        r5 = requests.get(f"{API}/resources/support/messages",
                          headers=h, timeout=15)
        assert r5.status_code == 200
        assert "messages" in r5.json() and isinstance(r5.json()["messages"], list)

        # Cleanup any TEST_ leftovers
        try:
            mongo.support_faqs.delete_many({"question": {"$regex": "^TEST_Q_"}})
            mongo.support_messages.delete_many({"name": "TEST_Contact"})
        except Exception:
            pass


# ============== GATING (non-super coach -> 403) ==============
class TestNonSuperForbidden:
    def test_blog_create_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.post(f"{API}/resources/blog", json={
            "title": "x", "category": "x", "summary": "", "body": "", "image_url": "", "published": True
        }, headers=h, timeout=15)
        assert r.status_code == 403

    def test_blog_update_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.put(f"{API}/resources/blog/some-id", json={
            "title": "x", "category": "x", "summary": "", "body": "", "image_url": "", "published": True
        }, headers=h, timeout=15)
        assert r.status_code == 403

    def test_blog_delete_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.delete(f"{API}/resources/blog/some-id", headers=h, timeout=15)
        assert r.status_code == 403

    def test_api_docs_put_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.put(f"{API}/resources/api-docs",
                         json={"sections": [{"id": "x", "title": "x", "content": "x"}]},
                         headers=h, timeout=15)
        assert r.status_code == 403

    def test_faq_create_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.post(f"{API}/resources/support/faqs",
                         json={"question": "x", "answer": "x", "order": 0},
                         headers=h, timeout=15)
        assert r.status_code == 403

    def test_faq_update_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.put(f"{API}/resources/support/faqs/xid",
                         json={"question": "x", "answer": "x", "order": 0},
                         headers=h, timeout=15)
        assert r.status_code == 403

    def test_faq_delete_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.delete(f"{API}/resources/support/faqs/xid",
                            headers=h, timeout=15)
        assert r.status_code == 403

    def test_support_settings_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.put(f"{API}/resources/support/settings",
                         json={"email": "", "phone": "", "tutorials_url": "", "intro": ""},
                         headers=h, timeout=15)
        assert r.status_code == 403

    def test_messages_forbidden(self, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = requests.get(f"{API}/resources/support/messages", headers=h, timeout=15)
        assert r.status_code == 403


# ============== REGRESSION ==============
class TestAuthRegression:
    def test_login_returns_token_and_refresh(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": SUPER_EMAIL, "password": SUPER_PASS},
                          timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
        assert "refresh_token" in d and isinstance(d["refresh_token"], str)
