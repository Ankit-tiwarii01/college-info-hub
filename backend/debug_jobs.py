
import requests

BASE_URL = "http://localhost:8000"

def test_create_job():
    # Login as Alumni first
    login_res = requests.post(f"{BASE_URL}/auth/token", json={
        "email": "alumni@collegehub.com",
        "password": "alumni123"
    })
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # Payload matching frontend
    payload = {
        "title": "Debug Job",
        "company": "Debug Corp",
        "location": "Remote",
        "type": "Full-time",
        "description": "Debugging 422",
        "posted_by": "Alice Alumni" # Extra field
    }
    
    print(f"Testing POST /jobs/ with payload: {payload}")
    response = requests.post(f"{BASE_URL}/jobs/", json=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Created Job ID: {data.get('id')}")
        print(f"Posted By: {data.get('posted_by')}")
    else:
        print(f"Response Body: {response.text}")

    # Test Case 2: Without posted_by (simulating JobsPage)
    payload2 = {
        "title": "Debug Job 2",
        "company": "Debug Corp",
        "location": "Remote",
        "type": "Contract",
        "description": "Debugging jobs page"
    }
    print(f"\nTesting POST /jobs/ WITHOUT posted_by: {payload2}")
    response2 = requests.post(f"{BASE_URL}/jobs/", json=payload2, headers=headers)
    print(f"Status Code: {response2.status_code}")
    if response2.status_code == 200:
        data = response2.json()
        print(f"Created Job ID: {data.get('id')}")
        print(f"Posted By (Should be auto-filled): {data.get('posted_by')}")
    else:
         print(f"Response Body: {response2.text}")

if __name__ == "__main__":
    test_create_job()
