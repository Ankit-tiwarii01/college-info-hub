
import requests

BASE_URL = "http://localhost:8000"

def test_login():
    email = "alumni@collegehub.com"
    password = "alumni123"
    
    print(f"Attempting login for {email}...")
    try:
        # Use JSON and correct keys 'email' and 'password'
        response = requests.post(f"{BASE_URL}/auth/token", json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            print("✅ Login Successful!")
            data = response.json()
            print(f"Token: {data.get('access_token')[:20]}...")
            print(f"Role in Response: {data.get('role')}")
            
            # Verify /users/me
            token = data.get('access_token')
            headers = {"Authorization": f"Bearer {token}"}
            me_res = requests.get(f"{BASE_URL}/users/me", headers=headers)
            print(f"User Profile: {me_res.json()}")

            # Verify Dashboard Endpoints
            print("\nTesting Dashboard Endpoints...")
            mentorship_res = requests.get(f"{BASE_URL}/mentorship/requests/incoming", headers=headers)
            print(f"Mentorship Requests ({mentorship_res.status_code}): {mentorship_res.text[:100]}")
            
            jobs_res = requests.get(f"{BASE_URL}/jobs/", headers=headers)
            print(f"Jobs ({jobs_res.status_code}): {jobs_res.text[:100]}")
            
        else:
            print(f"❌ Login Failed: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
