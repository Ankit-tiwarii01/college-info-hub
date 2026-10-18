import requests

BASE_URL = "http://127.0.0.1:8000"

def log(msg, success=True):
    icon = "✅" if success else "❌"
    print(f"{icon} {msg}")

def verify_public_endpoints():
    print("--- Verifying Public Endpoints ---")
    
    # 1. Login as Student
    print("Logging in as Student...")
    # From seed.py: student1@test.com / password
    resp = requests.post(f"{BASE_URL}/auth/token", json={"email": "student1@test.com", "password": "password"})
    if resp.status_code != 200:
        log(f"Login Failed: {resp.text}", False)
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    log("Logged In")

    # 2. Get Jobs
    print("\nFetching Jobs...")
    resp = requests.get(f"{BASE_URL}/jobs/", headers=headers)
    if resp.status_code == 200:
        jobs = resp.json()
        log(f"Jobs: {len(jobs)}")
        if len(jobs) > 0:
            log(f"First Job: {jobs[0]['title']}")
    else:
        log(f"Fetch Jobs Failed: {resp.status_code} - {resp.text}", False)

    # 3. Get Posts
    print("\nFetching Posts...")
    resp = requests.get(f"{BASE_URL}/posts/", headers=headers)
    if resp.status_code == 200:
        posts = resp.json()
        log(f"Posts: {len(posts)}")
        if len(posts) > 0:
            log(f"First Post: {posts[0]['content']}")
    else:
        log(f"Fetch Posts Failed: {resp.status_code} - {resp.text}", False)
        
    # 4. Get Events
    print("\nFetching Events...")
    resp = requests.get(f"{BASE_URL}/events/", headers=headers)
    if resp.status_code == 200:
        events = resp.json()
        log(f"Events: {len(events)}")
    else:
        log(f"Fetch Events Failed: {resp.status_code} - {resp.text}", False)

    # 5. Get Profile
    print("\nFetching Profile...")
    resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if resp.status_code == 200:
        user = resp.json()
        log(f"Profile: {user['name']} ({user['email']})")
    else:
        log(f"Fetch Profile Failed: {resp.status_code} - {resp.text}", False)

if __name__ == "__main__":
    verify_public_endpoints()
