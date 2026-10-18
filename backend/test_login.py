import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_login(email, password):
    url = f"{BASE_URL}/auth/token"
    payload = {
        "email": email,
        "password": password
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"Attempting login for {email}...")
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Testing Admin Login:")
    test_login("admin@collegehub.com", "admin123")
    
    print("\nTesting Student Login:")
    test_login("student1@test.com", "password")
