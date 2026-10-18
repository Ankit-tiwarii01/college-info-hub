
import requests
import sys

BASE_URL = "http://localhost:8000"

def get_auth_token():
    try:
        # Use a known test user or admin
        response = requests.post(f"{BASE_URL}/auth/token", json={
            "email": "admin@collegehub.com", 
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"❌ Auth failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Auth error: {e}")
        return None

def check_endpoint(method, path, token=None, data=None):
    try:
        url = f"{BASE_URL}{path}"
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers)
        
        if response.status_code >= 500:
            print(f"❌ {method} {path} failed with {response.status_code}")
            return False
        elif response.status_code == 404:
            print(f"❌ {method} {path} returned 404 Not Found")
            return False
        elif response.status_code == 401:
            print(f"❌ {method} {path} returned 401 Unauthorized (Auth failed)")
            return False
        else:
            print(f"✅ {method} {path} returned {response.status_code}")
            return True
    except Exception as e:
        print(f"❌ {method} {path} error: {e}")
        return False

print("Starting System Health Check...")

token = get_auth_token()
if not token:
    print("⚠ Skipping authenticated checks due to login failure.")

# Public Endpoints
check_endpoint("GET", "/")
check_endpoint("GET", "/jobs/") 
check_endpoint("GET", "/jobs/3") # Verify specific job fetch
check_endpoint("GET", "/posts/") 

# Authenticated Endpoints
if token:
    print("\n--- Authenticated Checks ---")
    check_endpoint("GET", "/events/", token)
    check_endpoint("GET", "/mentorship/mentors", token)
    check_endpoint("GET", "/users/me", token)

print("\nHealth Check Complete.")
