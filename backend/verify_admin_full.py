import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def log(msg, success=True):
    icon = "✅" if success else "❌"
    print(f"{icon} {msg}")

def verify_admin_full():
    print("--- starting Admin Full Verification ---")
    
    # 1. Login
    login_url = f"{BASE_URL}/auth/token"
    login_payload = {"email": "admin@collegehub.com", "password": "admin123"}
    resp = requests.post(login_url, json=login_payload)
    if resp.status_code != 200:
        log(f"Login failed: {resp.text}", False)
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    log("Admin Logged In")

    # 2. Get Pending Users
    resp = requests.get(f"{BASE_URL}/admin/pending-users", headers=headers)
    if resp.status_code != 200:
        log(f"Get Pending Users Failed: {resp.status_code} - {resp.text}", False)
        pending_users = []
    else:
        pending_users = resp.json()
    
    log(f"Pending Users: {len(pending_users)}")
    if len(pending_users) > 0:
        pending_id = pending_users[0]['id']
        
        # 3. Approve User
        resp = requests.post(f"{BASE_URL}/admin/approve/{pending_id}", headers=headers)
        if resp.status_code == 200:
             log(f"Approved User {pending_id}")
        else:
             log(f"Approve Failed: {resp.text}", False)

    # 4. Get Jobs & Delete Job
    resp = requests.get(f"{BASE_URL}/admin/jobs", headers=headers)
    jobs = resp.json()
    log(f"Jobs found: {len(jobs)}")
    if len(jobs) > 0:
        job_id = jobs[0]['id']
        resp = requests.delete(f"{BASE_URL}/admin/jobs/{job_id}", headers=headers)
        if resp.status_code == 200:
            log(f"Deleted Job {job_id}")
        else:
            log(f"Delete Job Failed: {resp.text}", False)

    # 5. Get Reports & Action
    resp = requests.get(f"{BASE_URL}/admin/reports", headers=headers)
    if resp.status_code != 200:
        log(f"Get Reports Failed: {resp.status_code} - {resp.text}", False)
        reports = []
    else:
        reports = resp.json()
    
    log(f"Reports found: {len(reports)}")
    if len(reports) > 0:
        report_id = reports[0]['id']
        # Action: dismiss
        resp = requests.post(f"{BASE_URL}/admin/reports/{report_id}/action", json={"action": "dismiss"}, headers=headers)
        if resp.status_code == 200:
            log(f"Dismissed Report {report_id}")
        else:
            log(f"Report Action Failed: {resp.status_code} - {resp.text}", False)

    # 6. Event Management (PUT/DELETE)
    # First get an event
    resp = requests.get(f"{BASE_URL}/events", headers=headers)
    if resp.status_code != 200:
        log(f"Get Events Failed: {resp.status_code} - {resp.text}", False)
        events = []
    else:
        events = resp.json()
        
    if len(events) > 0:
        event = events[0]
        event_id = event['id']
        
        # Update
        update_data = {
            "title": "Updated Event Title",
            "type": "Academic",
            "audience": "All",
            "date": event['date'],
            "time": "10:00 AM",
            "location": "New Location",
            "description": "Updated Description"
        }
        resp = requests.put(f"{BASE_URL}/events/{event_id}", json=update_data, headers=headers)
        if resp.status_code == 200:
            log(f"Updated Event {event_id}")
        else:
            log(f"Update Event Failed: {resp.text}", False)
            
        # Delete
        resp = requests.delete(f"{BASE_URL}/events/{event_id}", headers=headers)
        if resp.status_code == 200:
            log(f"Deleted Event {event_id}")
        else:
            log(f"Delete Event Failed: {resp.text}", False)
    else:
        log("No events found to test update/delete", False)

if __name__ == "__main__":
    verify_admin_full()
