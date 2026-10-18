import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def debug_reject_endpoint():
    print("--- Debugging Admin Reject Endpoint ---")
    
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        # 1. Login to get token
        f.write("Logging in...\n")
        try:
            resp = requests.post(f"{BASE_URL}/auth/token", json={"email": "admin@collegehub.com", "password": "admin123"})
            if resp.status_code != 200:
                f.write(f"❌ Login Failed: {resp.status_code} - {resp.text}\n")
                return
            token = resp.json().get("access_token")
            f.write("✅ Login Successful\n")
        except Exception as e:
            f.write(f"❌ Connection Error: {e}\n")
            return

        # 2. Try to hit the reject endpoint
        target_id = 8
        f.write(f"\nTesting POST /admin/reject/{target_id}...\n")
        headers = {
            "Authorization": f"Bearer {token}",
            "Origin": "http://localhost:5173"
        }
        
        try:
            resp = requests.post(f"{BASE_URL}/admin/reject/{target_id}", headers=headers)
            f.write(f"Status: {resp.status_code}\n")
            f.write(f"Response: {resp.text}\n")
            f.write(f"Headers: {resp.headers}\n")
            
        except Exception as e:
            f.write(f"❌ Request Error: {e}\n")

if __name__ == "__main__":
    debug_reject_endpoint()
