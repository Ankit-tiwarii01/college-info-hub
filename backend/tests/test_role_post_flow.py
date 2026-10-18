"""Run: python -m pytest tests/test_role_post_flow.py -q (isolated temp DB)."""
import os
from datetime import date, timedelta
from pathlib import Path
_test_dir = Path(__file__).resolve().parents[1] / '.test-tmp'
_test_dir.mkdir(exist_ok=True)
_test_db_path = _test_dir / 'role_post_flow.db'
if _test_db_path.exists():
    _test_db_path.unlink()
os.environ['DATABASE_URL'] = 'sqlite:///' + str(_test_db_path)
os.environ['SECRET_KEY'] = 'isolated-test-key'
from fastapi.testclient import TestClient
from app.main import app
from app import database, models, utils

client = TestClient(app)
app.state.limiter.enabled = False

def headers(role):
    return {'Authorization': 'Bearer ' + utils.create_access_token({'sub': role+'@example.com', 'role': role})}

def setup_module():
    with database.SessionLocal() as db:
        for role in ['student', 'alumni']:
            db.add(models.Student(name=role, email=role+'@example.com', password=utils.get_password_hash('Password123!'), role=role.title(), status='Active'))
        db.add(models.Admin(name='Admin', email='admin@example.com', password=utils.get_password_hash('Password123!')))
        db.commit()

def teardown_module():
    database.engine.dispose()

def test_admin_only_routes():
    for role in ['student', 'alumni']:
        assert client.get('/admin/stats', headers=headers(role)).status_code == 403
        assert client.post('/auth/cleanup-pending', headers=headers(role)).status_code == 403
    assert client.get('/admin/stats', headers=headers('admin')).status_code == 200

def test_student_post_requires_admin_approval_and_notifies():
    created = client.post('/posts/', json={'content':'Student academic update'}, headers=headers('student'))
    assert created.status_code == 200, created.text
    post = created.json(); pid = post['id']
    assert post['approval_status'] == 'Pending' and post['is_approved'] is False
    assert pid in [item['id'] for item in client.get('/posts/', headers=headers('student')).json()]
    assert pid not in [item['id'] for item in client.get('/posts/', headers=headers('alumni')).json()]
    admin_notifications = client.get('/notifications/', headers=headers('admin')).json()
    assert any(item['type'] == 'post_pending' and item['entity_id'] == pid for item in admin_notifications)
    approved = client.post(f'/admin/posts/{pid}/approve', headers=headers('admin'))
    assert approved.status_code == 200, approved.text
    assert pid in [item['id'] for item in client.get('/posts/', headers=headers('alumni')).json()]
    student_notifications = client.get('/notifications/', headers=headers('student')).json()
    assert any(item['type'] == 'post_approved' and item['entity_id'] == pid for item in student_notifications)

def test_alumni_moderation_visibility_and_interaction():
    r=client.post('/posts/', json={'content':'Alumni opportunity'}, headers=headers('alumni'))
    assert r.status_code == 200, r.text
    post=r.json(); pid=post['id']; assert post['is_approved'] is False
    assert pid not in [p['id'] for p in client.get('/posts/', headers=headers('student')).json()]
    for path in [f'/posts/{pid}', f'/posts/{pid}/like', f'/posts/{pid}/comments']:
        r=client.get(path, headers=headers('student')) if path == f'/posts/{pid}' else client.post(path, json={'text':'hidden'}, headers=headers('student'))
        assert r.status_code == 404
    assert client.get(f'/posts/{pid}').status_code == 401
    assert client.post(f'/admin/posts/{pid}/approve', headers=headers('student')).status_code == 403
    r=client.post(f'/admin/posts/{pid}/approve', headers=headers('admin')); assert r.status_code == 200, r.text
    assert pid in [p['id'] for p in client.get('/posts/', headers=headers('student')).json()]
    assert client.post(f'/posts/{pid}/like', headers=headers('student')).json()['liked'] is True
    assert len(client.get(f'/posts/{pid}', headers=headers('student')).json()['liked_by']) == 1
    assert client.post(f'/posts/{pid}/like', headers=headers('student')).json()['liked'] is False
    assert client.post(f'/posts/{pid}/comments', json={'text':'Thank you'}, headers=headers('student')).status_code == 200
    assert client.delete(f'/posts/{pid}', headers=headers('student')).status_code == 403
    assert client.delete(f'/posts/{pid}', headers=headers('alumni')).status_code == 200
    with database.SessionLocal() as db:
        assert db.query(models.Comment).filter_by(post_id=pid).count() == 0

def test_admin_post_immediately_visible():
    r=client.post('/posts/', json={'content':'Announcement'}, headers=headers('admin'))
    assert r.status_code == 200, r.text
    assert r.json()['is_approved'] is True
    assert r.json()['id'] in [p['id'] for p in client.get('/posts/', headers=headers('student')).json()]


def test_admin_student_alumni_interactions_use_distinct_identities_and_notifications():
    post = client.post('/posts/', json={'content':'Alumni interaction target'}, headers=headers('alumni')).json()
    pid = post['id']
    assert client.post(f'/admin/posts/{pid}/approve', headers=headers('admin')).status_code == 200

    liked = client.post(f'/posts/{pid}/like', headers=headers('admin'))
    assert liked.status_code == 200, liked.text
    assert liked.json()['liked'] is True and liked.json()['actor_key'].startswith('admin:')
    refreshed = client.get(f'/posts/{pid}', headers=headers('alumni')).json()
    assert liked.json()['actor_key'] in refreshed['liked_by_keys']

    comment = client.post(f'/posts/{pid}/comments', json={'text':'Excellent alumni update'}, headers=headers('admin'))
    assert comment.status_code == 200, comment.text
    assert comment.json()['author']['role'] == 'Admin'
    alumni_notifications = client.get('/notifications/', headers=headers('alumni')).json()
    assert any(item['type'] == 'post_like' and item['entity_id'] == pid for item in alumni_notifications)
    assert any(item['type'] == 'post_comment' and item['entity_id'] == pid for item in alumni_notifications)

    unliked = client.post(f'/posts/{pid}/like', headers=headers('admin'))
    assert unliked.json()['liked'] is False
    reliked = client.post(f'/posts/{pid}/like', headers=headers('admin'))
    assert reliked.json()['liked'] is True
    with database.SessionLocal() as db:
        admin = db.query(models.Admin).filter_by(email='admin@example.com').one()
        assert db.query(models.PostLike).filter_by(post_id=pid, admin_id=admin.id).count() == 1

    admin_post = client.post('/posts/', json={'content':'Admin authored post'}, headers=headers('admin')).json()
    assert admin_post['author']['role'] == 'Admin'
    assert client.post(f"/posts/{admin_post['id']}/like", headers=headers('student')).status_code == 200
    admin_notifications = client.get('/notifications/', headers=headers('admin')).json()
    assert any(item['type'] == 'post_like' and item['entity_id'] == admin_post['id'] for item in admin_notifications)


def test_rejected_post_is_preserved_with_reason_and_only_author_or_admin_can_see_it():
    post = client.post('/posts/', json={'content':'Needs more context'}, headers=headers('student')).json()
    pid = post['id']
    rejected = client.post(
        f'/admin/posts/{pid}/reject',
        json={'reason':'Please include the supporting academic details.'},
        headers=headers('admin'),
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()['approval_status'] == 'Rejected'
    assert 'supporting academic details' in rejected.json()['rejection_reason']
    assert pid in [item['id'] for item in client.get('/posts/', headers=headers('student')).json()]
    assert pid not in [item['id'] for item in client.get('/posts/', headers=headers('alumni')).json()]
    assert client.post(f'/posts/{pid}/like', headers=headers('student')).status_code == 404

def test_alumni_job_requires_admin_approval_and_notifies_students():
    payload = {'title':'Backend Intern','company':'Example Labs','type':'Internship','location':'Remote','description':'Build APIs','apply_link':'https://example.com/apply','application_deadline':str(date.today() + timedelta(days=10))}
    r = client.post('/jobs/', json=payload, headers=headers('alumni'))
    assert r.status_code == 200, r.text
    job = r.json(); assert job['approval_status'] == 'Pending'
    assert job['id'] not in [item['id'] for item in client.get('/jobs/').json()]
    admin_notifications = client.get('/notifications/', headers=headers('admin')).json()
    assert any(n['entity_type'] == 'job' and n['entity_id'] == job['id'] for n in admin_notifications)
    r = client.post(f"/admin/jobs/{job['id']}/approve", headers=headers('admin'))
    assert r.status_code == 200, r.text
    assert job['id'] in [item['id'] for item in client.get('/jobs/').json()]
    student_notifications = client.get('/notifications/', headers=headers('student')).json()
    assert any(n['entity_type'] == 'job' and n['entity_id'] == job['id'] for n in student_notifications)

def test_blank_post_rejected():
    assert client.post('/posts/', json={'content':'   '}, headers=headers('alumni')).status_code == 422

def test_profile_does_not_corrupt_enum():
    for role in ['student', 'alumni', 'admin']:
        assert client.get('/users/me', headers=headers(role)).json()['role'] == role
        r=client.put('/users/me', json={'name':role+' updated'}, headers=headers(role))
        assert r.status_code == 200, r.text
        assert client.get('/users/me', headers=headers(role)).status_code == 200
    with database.SessionLocal() as db:
        assert db.query(models.Student).filter_by(email='student@example.com').first().role == 'Student'

def test_blocked_token_revoked():
    with database.SessionLocal() as db:
        user=db.query(models.Student).filter_by(email='student@example.com').first(); user.status='Blocked'; db.commit()
    assert client.get('/posts/', headers=headers('student')).status_code == 403
    assert client.post('/auth/token', json={'email':'student@example.com','password':'Password123!'}).status_code == 403
    with database.SessionLocal() as db:
        user=db.query(models.Student).filter_by(email='student@example.com').first(); user.status='Active'; db.commit()

def test_alumni_registration_requires_otp_and_admin_approval(monkeypatch):
    from app.routers import alumni as alumni_router, auth as auth_router, admin as admin_router
    from app import otp_service
    monkeypatch.setattr(alumni_router, 'send_otp_email', lambda *args: True)
    monkeypatch.setattr(admin_router, 'send_registration_decision_email', lambda *args: True)
    monkeypatch.setattr(otp_service.secrets, 'randbelow', lambda *args: 123456)
    data=dict(name='New Alumni', enrollment_number='AL2020', mobile_number='9876543210',email='newalumni@example.com',password='Password123!',confirm_password='Password123!',date_of_birth='2000-01-01',course_completed='MCA',year_of_admission='2020',year_of_completion='2022',profession='Employed',designation='Developer',organization='Example',current_city='Delhi',current_state='Delhi',willing_to_attend_events='Yes',contributions='Mentorship',terms_accepted='true')
    proof=lambda: {'academic_proof': ('degree.pdf', b'%PDF-1.4\n%%EOF', 'application/pdf')}
    r=client.post('/api/alumni/register', data=data, files=proof()); assert r.status_code == 201, r.text
    assert client.post('/auth/token', json={'email':data['email'],'password':data['password']}).status_code == 403
    assert client.post('/auth/verify-email', json={'email':data['email'],'otp':'123456'}).status_code == 200
    assert client.post('/auth/token', json={'email':data['email'],'password':data['password']}).status_code == 403
    with database.SessionLocal() as db:
        user_id=db.query(models.Student).filter_by(email=data['email']).first().id
    assert client.post(f'/admin/approve/{user_id}', headers=headers('admin')).status_code == 200
    r=client.post('/auth/token', json={'email':data['email'],'password':data['password']}); assert r.status_code == 200, r.text
    assert r.json()['role'] == 'alumni'
    assert client.post('/api/alumni/register', data=data, files=proof()).status_code == 409

def test_student_registration_requires_email_and_admin_approval(monkeypatch):
    from app.routers import auth as auth_router, admin as admin_router
    from app import otp_service
    monkeypatch.setattr(auth_router, 'send_otp_email', lambda *args: True)
    monkeypatch.setattr(admin_router, 'send_registration_decision_email', lambda *args: True)
    monkeypatch.setattr(otp_service.secrets, 'randbelow', lambda *args: 123456)
    data=dict(name='New Student',enrollment_no='ST2025',university_roll_no='ROLL2025',phone='9876543210',email='newstudent@example.com',password='Password123!',confirm_password='Password123!',course='MCA',date_of_birth='2003-01-01',college_name='Example College',university_name='Example University',admission_year='2025',expected_graduation_year='2027',terms_accepted='true')
    assert client.post('/auth/register', data=data).status_code == 422
    fake_file={'college_id_card': ('college-id.pdf', b'not-a-real-pdf', 'application/pdf')}
    assert client.post('/auth/register', data=data, files=fake_file).status_code == 400
    files={'college_id_card': ('college-id.png', b'\x89PNG\r\n\x1a\nvalid', 'image/png')}
    r=client.post('/auth/register', data=data, files=files)
    assert r.status_code == 200, r.text
    assert r.json()['next_step'] == 'email_verification'
    assert client.post('/auth/verify-email', json={'email':'newstudent@example.com','otp':'123456'}).status_code == 200
    assert client.post('/auth/token', json={'email':'newstudent@example.com','password':'Password123!'}).status_code == 403
    with database.SessionLocal() as db:
        user=db.query(models.Student).filter_by(email='newstudent@example.com').first()
        assert user.identity_document_path and user.verification_status == 'pending'
        user_id=user.id
    assert client.get(f'/admin/account-verifications/{user_id}/document', headers=headers('student')).status_code == 403
    assert client.get(f'/admin/account-verifications/{user_id}/document', headers=headers('admin')).status_code == 200
    assert client.post(f'/admin/approve/{user_id}', headers=headers('admin')).status_code == 200
    assert client.post('/auth/token', json={'email':'newstudent@example.com','password':'Password123!'}).status_code == 200

def test_admin_notifications_are_separate_from_student_notifications():
    with database.SessionLocal() as db:
        sid=db.query(models.Student).filter_by(email='student@example.com').first().id
        db.add(models.Notification(user_id=sid,text='Private',type='info')); db.commit()
    notifications = client.get('/notifications/', headers=headers('admin')).json()
    assert all(n['text'] != 'Private' for n in notifications)


def _student_registration_data(email, enrollment, roll):
    return dict(
        name='Approval Matrix Student', enrollment_no=enrollment,
        university_roll_no=roll, phone='9876543210', email=email,
        password='Password123!', confirm_password='Password123!', course='MCA',
        date_of_birth='2003-01-01', college_name='Example College',
        university_name='Example University', admission_year='2025',
        expected_graduation_year='2027', terms_accepted='true',
    )


def _student_id_file():
    return {'college_id_card': ('college-id.png', b'\x89PNG\r\n\x1a\nvalid', 'image/png')}


def test_admin_can_approve_before_email_and_verification_then_activates(monkeypatch):
    from app.routers import auth as auth_router, admin as admin_router
    from app import otp_service
    monkeypatch.setattr(auth_router, 'send_otp_email', lambda *args: True)
    decision_emails = []
    monkeypatch.setattr(admin_router, 'send_registration_decision_email', lambda *args: decision_emails.append(args) or True)
    monkeypatch.setattr(otp_service.secrets, 'randbelow', lambda *args: 654321)
    data = _student_registration_data('matrix@example.com', 'ST-MATRIX', 'ROLL-MATRIX')

    response = client.post('/auth/register', data=data, files=_student_id_file())
    assert response.status_code == 200, response.text
    with database.SessionLocal() as db:
        user = db.query(models.Student).filter_by(email=data['email']).one()
        user_id = user.id
        assert user.email_verified is False
        assert user.verification_status == 'pending'
        assert user.status == 'Pending'

    admin_notifications = client.get('/notifications/', headers=headers('admin')).json()
    matching = [item for item in admin_notifications if item['entity_id'] == user_id and item['type'] == 'student_registration']
    assert len(matching) == 1

    approved = client.post(f'/admin/approve/{user_id}', headers=headers('admin'))
    assert approved.status_code == 200, approved.text
    assert approved.json()['approval_status'] == 'approved'
    assert approved.json()['account_status'] == 'Pending'
    assert approved.json()['email_delivery'] == 'sent'
    duplicate = client.post(f'/admin/approve/{user_id}', headers=headers('admin'))
    assert duplicate.status_code == 200 and len(decision_emails) == 1
    assert client.post('/auth/token', json={'email': data['email'], 'password': data['password']}).json()['detail']['next_step'] == 'verify_email'

    verified = client.post('/auth/verify-email', json={'email': data['email'], 'otp': '654321'})
    assert verified.status_code == 200, verified.text
    assert verified.json()['account_status'] == 'Active'
    assert client.post('/auth/token', json={'email': data['email'], 'password': data['password']}).status_code == 200


def test_registration_rejection_email_failure_is_retryable_and_not_duplicated(monkeypatch):
    from app.routers import auth as auth_router, admin as admin_router
    monkeypatch.setattr(auth_router, 'send_otp_email', lambda *args: True)
    delivery_results = iter([False, True])
    calls = []
    monkeypatch.setattr(
        admin_router,
        'send_registration_decision_email',
        lambda *args: calls.append(args) or next(delivery_results),
    )
    data = _student_registration_data('reject-email@example.com', 'ST-REJECT', 'ROLL-REJECT')
    registered = client.post('/auth/register', data=data, files=_student_id_file())
    assert registered.status_code == 200, registered.text
    with database.SessionLocal() as db:
        user_id = db.query(models.Student).filter_by(email=data['email']).one().id

    rejected = client.post(
        f'/admin/reject/{user_id}', json={'reason':'Identity details need correction.'}, headers=headers('admin')
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()['email_delivery'] == 'failed'
    with database.SessionLocal() as db:
        user = db.query(models.Student).filter_by(id=user_id).one()
        assert user.verification_status == 'rejected' and user.status == 'Rejected'

    retry = client.post(f'/admin/account-verifications/{user_id}/resend-decision-email', headers=headers('admin'))
    assert retry.status_code == 200 and retry.json()['email_delivery'] == 'sent'
    duplicate = client.post(f'/admin/account-verifications/{user_id}/resend-decision-email', headers=headers('admin'))
    assert duplicate.status_code == 200 and len(calls) == 2


def test_registration_retry_does_not_create_duplicate(monkeypatch):
    from app.routers import auth as auth_router
    from app import otp_service
    monkeypatch.setattr(auth_router, 'send_otp_email', lambda *args: True)
    monkeypatch.setattr(otp_service.secrets, 'randbelow', lambda *args: 111111)
    data = _student_registration_data('resume@example.com', 'ST-RESUME', 'ROLL-RESUME')
    first = client.post('/auth/register', data=data, files=_student_id_file())
    assert first.status_code == 200, first.text
    retry = client.post('/auth/register', data=data, files=_student_id_file())
    assert retry.status_code == 429, retry.text
    with database.SessionLocal() as db:
        assert db.query(models.Student).filter_by(email=data['email']).count() == 1
        user_id = db.query(models.Student).filter_by(email=data['email']).one().id
        assert db.query(models.Notification).filter_by(event_key=f'student-registration-submitted:{user_id}:admin:1').count() == 1


def test_smtp_failure_preserves_registration_and_resend_recovers(monkeypatch):
    from app.routers import auth as auth_router
    from app import otp_service
    monkeypatch.setattr(otp_service.secrets, 'randbelow', lambda *args: 222222)
    monkeypatch.setattr(auth_router, 'send_otp_email', lambda *args: False)
    data = _student_registration_data('smtp-recovery@example.com', 'ST-SMTP', 'ROLL-SMTP')

    failed = client.post('/auth/register', data=data, files=_student_id_file())
    assert failed.status_code == 503, failed.text
    with database.SessionLocal() as db:
        assert db.query(models.Student).filter_by(email=data['email']).count() == 1

    monkeypatch.setattr(auth_router, 'send_otp_email', lambda *args: True)
    resent = client.post('/auth/resend-verification-otp', json={'email': data['email']})
    assert resent.status_code == 200, resent.text
    verified = client.post('/auth/verify-email', json={'email': data['email'], 'otp': '222222'})
    assert verified.status_code == 200, verified.text


def test_admin_notification_websocket_receives_persisted_event():
    token = utils.create_access_token({'sub': 'admin@example.com', 'role': 'admin', 'id': 1})
    with client.websocket_connect(f'/ws/notifications?token={token}') as websocket:
        with database.SessionLocal() as db:
            admin = db.query(models.Admin).filter_by(email='admin@example.com').one()
            notification = models.Notification(
                admin_id=admin.id,
                recipient_role='admin',
                text='New registration websocket test',
                type='student_registration',
                event_key='websocket-registration-test',
            )
            db.add(notification)
            db.commit()
            notification_id = notification.id
        message = websocket.receive_json()
        assert message['id'] == notification_id
        assert message['text'] == 'New registration websocket test'
