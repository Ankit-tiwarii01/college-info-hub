import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_notifications():
    # 1. Login to get token
    print("Logging in...")
    login_url = f"{BASE_URL}/auth/token"
    login_payload = {"email": "student1@test.com", "password": "password"}
    headers = {"Content-Type": "application/json"}
    
    try:
        resp = requests.post(login_url, json=login_payload, headers=headers)
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return
        
        token = resp.json()["access_token"]
        print("Login successful. Token received.")
        
        # 2. Fetch Notifications
        print("\nFetching Notifications...")
        auth_headers = {"Authorization": f"Bearer {token}"}
        notif_url = f"{BASE_URL}/notifications/"
        
        resp = requests.get(notif_url, headers=auth_headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            notifs = resp.json()
            print(f"Found {len(notifs)} notifications:")
            for n in notifs:
                print(f"- [{n['type']}] {n['text']} (Read: {n['read']})")
        else:
            print(f"Error: {resp.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_notifications()
