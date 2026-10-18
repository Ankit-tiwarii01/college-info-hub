import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_fixes():
    # 1. Login
    print("--- 1. Login ---")
    login_url = f"{BASE_URL}/auth/token"
    login_payload = {"email": "student1@test.com", "password": "password"}
    headers = {"Content-Type": "application/json"}
    
    token = None
    try:
        resp = requests.post(login_url, json=login_payload, headers=headers)
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            print(f"✅ Login successful.")
        else:
            print(f"❌ Login failed: {resp.text}")
            return
    except Exception as e:
        print(f"❌ Login exception: {e}")
        return

    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Test GET /mentorship/requests/incoming
    print("\n--- 2. GET /mentorship/requests/incoming ---")
    try:
        resp = requests.get(f"{BASE_URL}/mentorship/requests/incoming", headers=auth_headers)
        if resp.status_code == 200:
            print(f"✅ Incoming requests fetched: {len(resp.json())} items")
        else:
            print(f"❌ Incoming requests failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ Incoming requests exception: {e}")

    # 3. Test PUT /users/me
    print("\n--- 3. PUT /users/me ---")
    try:
        update_payload = {"phone": "9876543210", "course": "B.Tech Updated"}
        resp = requests.put(f"{BASE_URL}/users/me", json=update_payload, headers=auth_headers)
        if resp.status_code == 200:
            user = resp.json()
            print(f"✅ Profile updated. Phone: {user.get('phone')}, Course: {user.get('course')}")
            if user.get('phone') == "9876543210" and user.get('course') == "B.Tech Updated":
                 print("✅ Verification: Data matches payload.")
            else:
                 print("❌ Verification: Data mismatch!")
        else:
            print(f"❌ Profile update failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ Profile update exception: {e}")

if __name__ == "__main__":
    test_fixes()
