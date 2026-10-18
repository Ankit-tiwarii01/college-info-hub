# 🎓 Campus Info Hub

A full-stack campus platform that connects **students, alumni and administrators** through a moderated community feed, a jobs board, mentorship, events, an alumni directory and real-time notifications.

Built with **React + Vite** on the frontend and **FastAPI** on the backend.

> **Live demo:** _add your Vercel link here_
> **API docs:** _add your Render link_ + `/docs`

---

## ✨ Features

**Roles:** Student, Alumni, Admin (role-based access on both frontend and API)

- **Authentication** – JWT login, student and alumni registration, email OTP verification, forgot/reset password
- **Community feed** – posts, likes and comments. Admins publish instantly, alumni posts wait for admin approval, students can read and interact
- **Jobs & internships** – alumni/admins post jobs, students apply, applicants are managed on a Kanban board
- **Mentorship** – browse mentors, send requests, accept/reject, schedule sessions
- **Events** – audience-targeted events, RSVP, calendar export
- **Alumni directory** – public directory, profile photos, admin management and export
- **Internal mail** – inbox, sent, starred and read/unread messages
- **Notices & reports** – campus notices, users can report content, admins take action
- **Admin console** – dashboard stats, user approval/blocking, content moderation, jobs, events, notices, settings
- **Real-time notifications** – WebSocket toasts for approvals and updates
- **Security** – bcrypt password hashing, rate limiting, CORS allow-list, blocked-account checks

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Redux Toolkit, React Router 7, Framer Motion, Axios, Sonner |
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2, python-jose (JWT), passlib + bcrypt, SlowAPI |
| Database | SQLite by default, optional MySQL via `DATABASE_URL` |
| Realtime | FastAPI WebSockets |
| Deployment | Vercel (frontend), Render (backend) |

---

## 📂 Project Structure

```
college-info-hub/
├── src/                    # React app
│   ├── pages/              # admin, auth, alumni, dashboard, events, feed, jobs, mail, mentorship, profile
│   ├── features/           # Redux slices (auth, jobs, mentorship, posts)
│   ├── components/         # shared UI
│   ├── hooks/              # e.g. useNotificationSocket
│   └── services/           # axios API client
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── database.py     # DB engine and session
│   │   └── routers/        # auth, users, posts, jobs, events, mentorship, admin, alumni, mail, ws ...
│   ├── tests/              # pytest regression tests
│   ├── create_admin.py     # create an admin account
│   ├── seed*.py            # optional demo data
│   └── requirements.txt
├── index.html
├── package.json
└── vercel.json             # SPA rewrite rules
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js **20.19+** or **22.12+**
- Python **3.11** or **3.12**
- Git

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/college-info-hub.git
cd college-info-hub
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
```

Generate a secret key and paste it into `backend/.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Create an admin account and start the API:

```bash
python create_admin.py
uvicorn app.main:app --reload
```

API: http://localhost:8000 · Swagger docs: http://localhost:8000/docs

Tables are created automatically on first start.

### 3. Frontend

In a new terminal, from the project root:

```bash
npm ci
npm run dev
```

App: http://localhost:5173

> **Windows shortcut:** run `setup_backend.bat` once, then `start.bat` to launch both servers.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SECRET_KEY` | **Required.** Long random string used to sign JWTs |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs allowed by CORS |
| `DATABASE_URL` | Optional. Defaults to local SQLite. MySQL example: `mysql+mysqlconnector://user:pass@host/college_hub` |
| `SMTP_EMAIL` / `SMTP_PASSWORD` | Needed for OTP emails (use a Gmail App Password) |
| `SMTP_HOST` / `SMTP_PORT` | Default `smtp.gmail.com` / `587` |

### Frontend (`.env` in project root)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL, e.g. `http://localhost:8000` or your Render URL (no trailing slash) |

Never commit `.env` files. Use `.env.example` as the template.

---

## 🧪 Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/test_role_post_flow.py -q
```

The tests run against an isolated database and never touch your real data.

---

## ☁️ Deployment

1. **Database:** create a cloud MySQL database (or use a persistent disk with SQLite).
2. **Backend (Render):**
   - Root directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_ORIGINS`, `SMTP_*`
3. **Frontend (Vercel):** import the repo, set `VITE_API_URL` to the Render URL.
4. Add the Vercel URL to `ALLOWED_ORIGINS` on Render and redeploy.

Note: free hosting tiers have temporary disks, so use an external database and external file storage for uploaded photos if you need data to persist.

---

## 🖼️ Screenshots

_Add screenshots in a `docs/` folder and link them here._

| Landing page | Dashboard |
|---|---|
| ![Landing](docs/landing.png) | ![Dashboard](docs/dashboard.png) |

---

## ⚠️ Known Limitations

- Registration does not prove email ownership unless SMTP/OTP is configured.
- Uploaded alumni photos are stored on the server's local disk.
- ESLint reports some unused-variable warnings.
- Not a full security audit; review before production use with real user data.

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

## 👤 Author

**YOUR NAME** · [GitHub](https://github.com/YOUR_USERNAME) · [LinkedIn](https://www.linkedin.com/in/YOUR_PROFILE)
