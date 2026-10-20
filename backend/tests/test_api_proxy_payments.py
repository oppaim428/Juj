# Backend proxy (FastAPI -> TanStack Node app) and payment webhook / public API regression tests
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture
def s():
    return requests.Session()


# Stripe webhook: unsigned / bad signature rejected
class TestWebhooks:
    def test_stripe_webhook_no_signature(self, s):
        r = s.post(f"{BASE_URL}/api/stripe/webhook", data="{}", headers={"content-type": "application/json"})
        assert r.status_code == 400
        assert r.json().get("error") == "invalid_signature"

    def test_stripe_webhook_bad_signature(self, s):
        r = s.post(f"{BASE_URL}/api/stripe/webhook", data='{"id":"evt_x"}',
                   headers={"stripe-signature": "t=1,v1=deadbeef"})
        assert r.status_code == 400
        assert r.json().get("error") == "invalid_signature"

    def test_crypto_ipn_bad_signature(self, s):
        r = s.post(f"{BASE_URL}/api/payments/crypto/ipn", json={"invoice_id": 1, "payment_status": "finished"})
        assert r.status_code == 400
        assert r.json().get("error") == "bad_signature"


# Base storefront public API through proxy
class TestPublicApi:
    def test_categories(self, s):
        r = s.get(f"{BASE_URL}/api/v1/categories")
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_offers(self, s):
        r = s.get(f"{BASE_URL}/api/v1/offers?limit=5")
        assert r.status_code == 200
        assert r.json() is not None

    def test_offer_4(self, s):
        r = s.get(f"{BASE_URL}/api/v1/offers/4")
        assert r.status_code == 200

    def test_buyer_login_api(self, s):
        r = s.post(f"{BASE_URL}/api/v1/auth/login", json={"email": "buyer1@juj.test", "password": "JujDemo2026!"})
        assert r.status_code == 200
        assert r.json().get("access_token")

    def test_buyer_login_wrong(self, s):
        r = s.post(f"{BASE_URL}/api/v1/auth/login", json={"email": "buyer1@juj.test", "password": "wrongpass"})
        assert r.status_code in (401, 429)

    def test_unknown_api_path(self, s):
        r = s.get(f"{BASE_URL}/api/does-not-exist")
        assert r.status_code in (404, 200)  # report actual behaviour
        print("unknown api status", r.status_code)
