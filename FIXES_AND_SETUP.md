# College Info Hub — fixes and setup

## Run on Windows (Python 3.11/3.12 and Node.js 20.19+ or 22.12+)

1. Extract the ZIP. Open a terminal in College-info-hub-main.
2. Run `cd frontend`, then `npm ci`, then `cd ..` to install frontend packages.
3. Double-click `setup_backend.bat`. It installs backend packages and generates a local signing key if .env is missing.
4. Double-click `start.bat`.
5. Open http://127.0.0.1:5173. The API is http://127.0.0.1:8001/docs.

The active College Info Hub frontend is in the `frontend` subfolder. The launcher starts that folder so the older root-level frontend cannot be opened accidentally.
The ZIP excludes installed node_modules/venv and build caches. They must be installed locally.
Original database files and project documents are retained. No database reset is needed.
Do not run reinit_db.py or reset scripts unless you intend to reset existing data.

For a new admin account, in the backend folder run:

```powershell
.\venv\Scripts\python.exe create_admin.py
```

Use the regular login page for all roles. Existing alumni directory-only entries from before this fix do not automatically gain a password; create a matching Alumni login through Admin > Users. New alumni registrations create both records together.

## Expected flow

- Student: register at /register, verify email and phone OTPs, then sign in.
- Alumni: register at /alumni/register, verify both OTPs, wait for admin approval, then sign in.
- Admin: sign in, publish posts immediately; approve alumni posts in Pending Approvals.
- An alumni post stays visible to its author and admin while pending; students see it after approval.
- Only author/admin may delete posts. Students cannot create posts through UI or API.
- Registration never bypasses delivery failures: missing SMTP or Twilio credentials return a clear service-configuration error.

## Email and mobile OTP setup

Copy the following variables from `backend/.env.example` into `backend/.env` and provide real service credentials:

```env
SMTP_EMAIL=your-gmail-address
SMTP_PASSWORD=your-gmail-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=your-twilio-sms-number
```

Gmail accounts should use an App Password, not the normal account password. The Twilio number must be SMS-capable, and trial accounts can send only to verified recipients. OTPs expire after five minutes, are stored as HMAC-SHA256 hashes, allow five attempts, enforce a 60-second resend cooldown, and are limited to five sends per destination/purpose in 24 hours. There is no hard-coded or development OTP fallback.

## Corrected issues

- Admin endpoints previously accepted any authenticated user.
- Student accounts could publish posts; their composer is now hidden and API denies publishing.
- Alumni registration previously created only a directory record, with no usable login.
- Student registration route/form was disabled.
- Profile responses mutated stored role enums into lowercase values.
- Blocked/pending accounts and stale-role tokens could continue using protected APIs.
- Pending posts could be fetched/commented/liked by guessing their IDs.
- Likes used hard-coded user ID 1 and did not survive feed refresh visually.
- Failed post/comment submissions discarded drafts; network errors could mask the real error.
- Delete button was shown to unauthorized viewers; post deletion left dependent records.
- Admin/student ID collisions exposed student notifications to admins.
- Dashboard post author names used a nonexistent API field.
- CORS ignored its configured origin allowlist; MySQL received SQLite-only options.
- Missing backend dependencies, .env loading, legacy bcrypt compatibility, and incorrect Windows launcher path.
- Embedded SMTP password removed; unset JWT keys now use unpredictable temporary keys.
- Direct reset-password requests now count failed OTP attempts.

## Verification and limits

Production frontend build succeeded. Fifteen isolated backend regression tests passed, covering roles, two-channel OTP registration, alumni approval, post/job moderation, mentorship delivery/counts, meeting permissions, multi-tab notifications, student visibility, interactions, profile persistence and role-specific notifications. Tests never touch the supplied database.

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest tests -q
```

Existing unrelated lint debt remains (mostly unused variables, plus React/style diagnostics); full lint is not clean. Build reports a large JavaScript chunk. Live SMTP/SMS delivery cannot be tested until real credentials are supplied. MySQL integration was not run.

The original source contained an SMTP application password: revoke/rotate it with the email provider before enabling email. Set fresh SMTP_EMAIL and SMTP_PASSWORD in backend/.env; never share that file. For deployment set a strong persistent SECRET_KEY and your exact ALLOWED_ORIGINS. Existing historical archives may still contain the old credential.
