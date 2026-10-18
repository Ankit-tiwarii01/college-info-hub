import requests
import base64
import json

BASE_URL = "http://127.0.0.1:8000"

def decode_jwt(token):
    try:
        header, payload, signature = token.split(".")
        padded_payload = payload + "=" * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(padded_payload).decode("utf-8")
        return json.loads(decoded)
    except Exception as e:
        return f"Error decoding: {e}"

def debug_admin_auth():
    print("--- Debugging Admin Auth ---")
    
    # 1. Login
    print("Attempting Login...")
    resp = requests.post(f"{BASE_URL}/auth/token", json={"email": "admin@collegehub.com", "password": "admin123"})
    
    if resp.status_code != 200:
        print(f"❌ Login Failed: {resp.status_code} - {resp.text}")
        return
    
    data = resp.json()
    token = data.get("access_token")
    print(f"✅ Login Successful. Token Type: {data.get('token_type')}")
    
    # 2. Inspect Token
    print("\nDecoded Token Payload:")
    payload = decode_jwt(token)
    print(payload)
    
    if payload.get("role") != "admin":
        print("❌ CRITICAL: Token role is NOT 'admin'")
    else:
        print("✅ Token role is 'admin'")

    # 3. Test Protected Endpoint
    print("\nTesting /admin/users...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/admin/users", headers=headers)
    
    if resp.status_code == 200:
        print(f"✅ /admin/users/ success. Count: {len(resp.json())}")
    else:
        print(f"❌ /admin/users/ Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    debug_admin_auth()
