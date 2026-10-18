import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_admin_flow():
    # 1. Login as Admin
    print("--- 1. Login as Admin ---")
    login_url = f"{BASE_URL}/auth/token"
    # Credentials from seed.py
    login_payload = {"email": "admin@collegehub.com", "password": "password"} # seed.py uses admin123 hash but let's check what verify_password expects.
    # update: seed.py sets password to "admin123". verify_password checks hash. 
    # BUT wait, seed.py uses `utils.get_password_hash("admin123")`.
    # AND `auth.py` compares `verify_password(credentials.password, db_user.password)`.
    # So I should send "admin123".
    
    login_payload = {"email": "admin@collegehub.com", "password": "admin123"}
    headers = {"Content-Type": "application/json"}
    
    token = None
    try:
        resp = requests.post(login_url, json=login_payload, headers=headers)
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            print(f"✅ Admin Login successful. Token: {token[:10]}...")
        else:
            print(f"❌ Admin Login failed: {resp.text}")
            return
    except Exception as e:
        print(f"❌ Login exception: {e}")
        return

    admin_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Get Stats
    print("\n--- 2. Get Admin Stats ---")
    try:
        resp = requests.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
        if resp.status_code == 200:
            print(f"✅ Stats: {resp.json()}")
        else:
            print(f"❌ Get Stats failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Stats exception: {e}")

    # 3. Get Users
    print("\n--- 3. Get Users ---")
    target_user_id = None
    try:
        resp = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers)
        if resp.status_code == 200:
            users = resp.json()
            print(f"✅ Users count: {len(users)}")
            if users:
                print(f"First user: {users[0]['email']} - Status: {users[0]['status']}")
                target_user_id = users[0]['id']
        else:
            print(f"❌ Get Users failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Users exception: {e}")

    # 4. Toggle Block Status
    if target_user_id:
        print(f"\n--- 4. Toggle Block User {target_user_id} ---")
        try:
            resp = requests.post(f"{BASE_URL}/admin/block/{target_user_id}", headers=admin_headers)
            if resp.status_code == 200:
                print(f"✅ Block Toggle: {resp.json()}")
            else:
                print(f"❌ Block Toggle failed: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"❌ Block exception: {e}")

if __name__ == "__main__":
    test_admin_flow()
