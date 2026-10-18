import requests
import sys

BASE_URL = "http://localhost:8000"

def test_api():
    print(f"Testing API at {BASE_URL}...")
    try:
        # 1. Test Root Endpoint
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ Root endpoint working")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            return

        # 2. Test DB Connection via Events Endpoint (public)
        # We try to fetch events. If DB is down, this will 500.
        print("Testing Database connection via /events/...")
        response = requests.get(f"{BASE_URL}/events/")
        if response.status_code == 200:
            events = response.json()
            print(f"✅ Database connected. Found {len(events)} events.")
        else:
            print(f"❌ Database/Events endpoint failed: {response.status_code} - {response.text}")
            
        # 3. Test Login (with known mock/seed data if possible)
        # We'll try a bad login to ensure auth endpoint is up
        print("Testing Auth endpoint...")
        login_data = {"username": "wrong@email.com", "password": "wrongpassword"}
        response = requests.post(f"{BASE_URL}/login", data=login_data)
        if response.status_code == 401:
            print("✅ Auth endpoint active (correctly rejected bad credentials)")
        else:
             print(f"❌ Auth endpoint behaving unexpectedly: {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server. Is it running?")

if __name__ == "__main__":
    test_api()
