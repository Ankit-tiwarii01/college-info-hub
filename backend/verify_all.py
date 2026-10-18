import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_full_flow():
    # 1. Login
    print("--- 1. Login ---")
    login_url = f"{BASE_URL}/auth/token"
    login_payload = {"email": "student1@test.com", "password": "password"}
    headers = {"Content-Type": "application/json"}
    
    token = None
    student_id = None
    try:
        resp = requests.post(login_url, json=login_payload, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            token = data["access_token"]
            student_id = data["id"]
            print(f"✅ Login successful. Token obtained. ID: {student_id}")
        else:
            print(f"❌ Login failed: {resp.text}")
            return
    except Exception as e:
        print(f"❌ Login exception: {e}")
        return

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Notifications
    print("\n--- 2. Fetch Notifications ---")
    try:
        resp = requests.get(f"{BASE_URL}/notifications/", headers=auth_headers)
        if resp.status_code == 200:
            print(f"✅ Notifications fetched: {len(resp.json())} items")
        else:
            print(f"❌ Notifications failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ Notifications exception: {e}")

    # 3. Create a Post (to test like/comment on)
    print("\n--- 3. Create Post ---")
    post_id = None
    try:
        post_payload = {"content": "Test Post for Verification"}
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

    # 4. Like Post
    print(f"\n--- 4. Like Post {post_id} ---")
    try:
        resp = requests.post(f"{BASE_URL}/posts/{post_id}/like", headers=auth_headers)
        if resp.status_code == 200:
            print(f"✅ Like successful. New count: {resp.json().get('likes_count')}")
        else:
            print(f"❌ Like failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ Like exception: {e}")

    # 5. Comment on Post
    print(f"\n--- 5. Comment on Post {post_id} ---")
    try:
        comment_payload = {"text": "This is a test comment"}
        resp = requests.post(f"{BASE_URL}/posts/{post_id}/comments", json=comment_payload, headers=auth_headers)
        if resp.status_code == 200:
            print(f"✅ Comment successful. ID: {resp.json().get('id')}")
        else:
            print(f"❌ Comment failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"❌ Comment exception: {e}")

if __name__ == "__main__":
    test_full_flow()
