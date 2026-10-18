import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_profile_update():
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

    # 2. Update Profile (Mixed fields)
    print("\n--- 2. Update Profile (User + Profile fields) ---")
    update_payload = {
        "name": "Rahul Updated",
        "phone": "1122334455",
        "bio": "I am a passionate developer.",
        "skills": "Python, React, FastAPI",
        "location": "Bangalore",
        "avatar": "http://example.com/avatar.png"
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/users/me", json=update_payload, headers=auth_headers)
        if resp.status_code == 200:
            user = resp.json()
            print(f"✅ Update Status: {resp.status_code}")
            
            # Verify response (Note: nested profile fields might need specific serialization if not flat)
            # My current schemas.User response doesn't explicitly nest profile yet, but let's check what comes back.
            # actually schemas.User doesn't show profile fields in the response model yet!
            # I might need to update schemas.User to include them if frontend expects them in response.
            # But frontend fetchProfile calls /users/me. 
            # Let's check what came back.
            print(f"Response keys: {user.keys()}")
            
            # If schema.User doesn't have bio/skills, they won't be in response.
            # BUT the update should have persisted.
            
    except Exception as e:
        print(f"❌ Update exception: {e}")

    # 3. Fetch Profile to verify persistence
    print("\n--- 3. Fetch Profile (Verify Persistence) ---")
    # I suspect schemas.User needs update to return these new fields.
    # Let's check schemas.py again. User inherits UserBase. UserBase has role, phone.
    # It does NOT have bio, skills etc.
    # So even if DB is updated, GET /users/me won't return them unless I update the response schema.
    
    # I should update schemas.User to include these fields for the frontend to see them!
    
if __name__ == "__main__":
    test_profile_update()
