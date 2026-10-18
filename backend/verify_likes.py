import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_like_restriction():
    # 1. Login
    print("--- 1. Login ---")
    login_url = f"{BASE_URL}/auth/token"
    login_payload = {"email": "student1@test.com", "password": "password"}
    headers = {"Content-Type": "application/json"}
    
    token = None
    try:
        resp = requests.post(login_url, json=login_payload, headers=headers)
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            print(f"✅ Login successful.")
        else:
            print(f"❌ Login failed: {resp.text}")
            return
    except Exception as e:
        print(f"❌ Login exception: {e}")
        return

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a fresh Post
    print("\n--- 2. Create Post ---")
    post_id = None
    try:
        post_payload = {"content": "Test Post for Like Constraint"}
        resp = requests.post(f"{BASE_URL}/posts/", json=post_payload, headers=auth_headers)
        if resp.status_code == 200:
            post_data = resp.json()
            post_id = post_data["id"]
            print(f"✅ Post created. ID: {post_id}")
        else:
            print(f"❌ Create Post failed: {resp.status_code} {resp.text}")
            return
    except Exception as e:
        print(f"❌ Create Post exception: {e}")
        return

    # 3. Like Post (First time) - Should Succeed
    print(f"\n--- 3. Like Post {post_id} (First Attempt) ---")
    try:
        resp = requests.post(f"{BASE_URL}/posts/{post_id}/like", headers=auth_headers)
        if resp.status_code == 200:
            print(f"✅ First Like successful. Count: {resp.json().get('likes_count')}")
        else:
            print(f"❌ First Like failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ First Like exception: {e}")

    # 4. Like Post (Second time) - Should Fail with 400
    print(f"\n--- 4. Like Post {post_id} (Second Attempt) ---")
    try:
        resp = requests.post(f"{BASE_URL}/posts/{post_id}/like", headers=auth_headers)
        if resp.status_code == 400:
            print(f"✅ Second Like correctly blocked: {resp.status_code} - {resp.json().get('detail')}")
        elif resp.status_code == 200:
             print(f"❌ Second Like allowed (Unexpected): Count {resp.json().get('likes_count')}")
        else:
             print(f"❌ Second Like failed with unexpected status: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ Second Like exception: {e}")

if __name__ == "__main__":
    test_like_restriction()
