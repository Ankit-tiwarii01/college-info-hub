import requests
import sys
import random
import string
import time

BASE_URL = "http://127.0.0.1:8000"

def random_string(length=10):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def run_test():
    print(f"🔄 Testing Events Flow at {BASE_URL}...")
    
    # 1. Register a new student
    email = f"test_{random_string()}@student.com"
    password = "password123"
    name = "Test Student"
    
    print(f"1️⃣ Registering user: {email}")
    reg_data = {
        "email": email,
        "password": password,
        "name": name,
        "role": "Student"
    }
    # Assuming registration endpoint exists at /auth/register or similar. 
    # Let's check routers/users.py or auth.py. 
    # If standard register is not found, we might need to rely on existing seeds or try /users/
    
    # Only login is in auth.py. Users creation often in users.py
    # START TRICK: Use specific endpoint if known, otherwise try common patterns.
    # We added /register (no prefix in main.py)
    try:
        res = requests.post(f"{BASE_URL}/register", json=reg_data)
        if res.status_code not in [200, 201]:
            # Maybe it expects specific schema
            print(f"   ⚠️ Registration failed? {res.status_code} {res.text}")
            # Try to login anyway, maybe user exists?
    except Exception as e:
        print(f"   ⚠️ Exception during reg: {e}")

    # 2. Login
    print("2️⃣ Logging in...")
    login_data = {"username": email, "password": password}
    res = requests.post(f"{BASE_URL}/login", data=login_data)
    
    if res.status_code != 200:
        print(f"❌ Login failed: {res.status_code} {res.text}")
        return

    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   ✅ Login successful")

    # 3. Create Event
    print("3️⃣ Creating Event...")
    event_data = {
        "title": f"Test Event {random_string()}",
        "type": "Social",
        "audience": "Student", # Target Students
        "description": "A test event for RSVP",
        "location": "Test Loc",
        "date": "2024-12-31",
        "time": "10:00 AM"
    }
    
    res = requests.post(f"{BASE_URL}/events/", json=event_data, headers=headers)
    if res.status_code != 200:
        print(f"❌ Create Event failed: {res.status_code} {res.text}")
        return

    event = res.json()
    event_id = event["id"]
    print(f"   ✅ Event created: ID {event_id}, Title: {event['title']}")

    # 4. Check Initial State (Should be None RSVP)
    print("4️⃣ Verifying Initial State...")
    res = requests.get(f"{BASE_URL}/events/", headers=headers)
    my_events = [e for e in res.json() if e["id"] == event_id]
    if not my_events:
        print("❌ Event not found in list")
        return
    
    if my_events[0].get("user_rsvp") is not None:
         print(f"❌ Expected None RSVP, got {my_events[0].get('user_rsvp')}")
    else:
         print("   ✅ Initial RSVP is None")

    # 5. RSVP 'going'
    print("5️⃣ RSVPing 'going'...")
    res = requests.post(f"{BASE_URL}/events/{event_id}/rsvp", json={"status": "going"}, headers=headers)
    if res.status_code != 200:
        print(f"❌ RSVP failed: {res.status_code} {res.text}")
        return
    
    print("   ✅ RSVP request successful")

    # 6. Verify State Change
    print("6️⃣ Verifying RSVP State & Count...")
    res = requests.get(f"{BASE_URL}/events/", headers=headers)
    updated_event = next((e for e in res.json() if e["id"] == event_id), None)
    
    print(f"   Current Data: RSVP={updated_event.get('user_rsvp')}, Attendees={updated_event.get('attendees')}")
    
    if updated_event.get("user_rsvp") != "going":
        print("❌ RSVP status mismatch!")
    elif updated_event.get("attendees") < 1:
         print("❌ Attendee count did not increment!")
    else:
        print("✅✅ TEST PASSED: RSVP Flow works correctly!")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"❌ Test Script Error: {e}")
