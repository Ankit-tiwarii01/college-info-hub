# 🎓 College Info Hub

An enterprise-grade, comprehensive full-stack platform designed to connect students, alumni, and faculty. It fosters a vibrant campus community through networking, mentorship, career opportunities, event management, and real-time engagement. Built with a modern React (Vite) frontend and a robust FastAPI (Python) backend.

## Start locally (PowerShell)

Open two PowerShell windows from the project folder.

Backend:

```powershell
cd .\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Frontend:

```powershell
cd .\frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://localhost:5173`. API documentation is at `http://127.0.0.1:8001/docs`.

Copy `backend/.env.example` to `backend/.env` for SMTP/Twilio OTP delivery. Copy `frontend/.env.example` to `frontend/.env` when the API URL or WebRTC ICE servers differ from the local defaults. A TURN server is recommended for production video calls across restrictive networks.

---

## 🏗️ Architecture & Tech Stack

### Frontend Architecture
- **Framework**: [React](https://react.dev/) v19 + [Vite](https://vitejs.dev/) for blazing-fast HMR and optimized builds.
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/) via `@tailwindcss/postcss` with custom design tokens defined in `@theme {}` blocks and component utilities in `@layer components`.
- **State Management**: [Redux Toolkit (RTK)](https://redux-toolkit.js.org/) handling complex synchronous states (e.g., Auth, Jobs, Mentorship, Posts).
- **Routing**: [React Router DOM](https://reactrouter.com/) v7 emphasizing nested routing and layout-based guard components (`ProtectedRoute.jsx`).
- **Icons & Motion**: [Lucide React](https://lucide.dev/) for crisp SVGs and [Framer Motion](https://www.framer.com/motion/) for micro-interactions and page transitions.

### Backend Architecture
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python) providing asynchronous endpoint execution, automatic OpenAPI documentation, and Pydantic validation.
- **Database**: MySQL managed via [SQLAlchemy](https://www.sqlalchemy.org/) ORM with explicit session lifecycle handling.
- **Real-Time Engine**: Built-in WebSocket routing for synchronous cross-client feature updates (Notifications).
- **Security & Rate Limiting**: 
  - JWT (JSON Web Tokens) with standard OAuth2 Password Bearer flow.
  - BCrypt password hashing via `passlib`.
  - Rate limiting via `slowapi` to prevent abuse.
  - Proper CORS middleware setup.
- **Logging**: Structured JSON logging via `python-json-logger`.

---

## 🌟 Comprehensive Feature Modules

### 1. Authentication & RBAC (Role-Based Access Control)
- **Roles**: Student, Alumni, Admin.
- **Implementation**: JWT tokens are issued on login and passed as HTTP Bearer headers. Frontend guards (`ProtectedRoute`) map against Redux state (`auth.user.role`).
- **Security Check**: Active polling and token validation happen on app mount. Blocked users are immediately intercepted (+ HTTP 403 on backend).

### 2. Job & Internship Board (Kanban Features)
- **Students**: Browse available jobs, filter by type/location, and apply. See application status tracking.
- **Alumni/Faculty**: Create job postings. Manage applicants using a visual drag-and-drop Kanban Board (Statuses: *Applied, Shortlisted, Interviewing, Hired, Rejected*).

### 3. Mentorship Hub
- **Discovery**: Students see only active, email-verified and phone-verified alumni mentors.
- **Requests**: Students submit a topic, message and preferred time. Duplicate pending requests are blocked; alumni receive live bell notifications and can accept or reject once.
- **Sessions**: Alumni schedule accepted requests and both dashboards show upcoming/completed meetings.
- **Calls**: Authenticated one-to-one WebRTC audio/video rooms use private WebSocket signaling, participant authorization, scheduled access windows, camera/microphone controls and explicit call completion.

### 4. Real-Time Community Feed
- **Posts & Media**: Users can publish text and image posts.
- **Interactions**: Liking and commenting functionalities.
- **Moderation**: All posts undergo an Admin Approval phase. Unapproved posts are hidden from the main feed. Users can also report inappropriate posts or comments.

### 5. Campus Events
- **Discovery & Targeting**: View upcoming events. Events can be specifically targeted by Audience (`Alumni`, `Student`, `All`).
- **RSVP & Integration**: Interactive RSVP system (Going, Interested). Users can export events directly to their native calendar via `.ics` file generation.

### 6. Admin Console
- **User Management**: View all platform users, block/unblock malicious accounts.
- **Content Moderation**: Centralized queue to approve/reject community feed posts.
- **Reports Dashboard**: Handle user-generated reports against posts, comments, or other users.
- **Event Creation**: Only Admins (or authorized personnel) can broadcast events to the community.

### 7. Real-Time WebSockets (Notifications)
- **Infrastructure**: Connections are multiplexed on `/ws/{user_id}`.
- **Triggers**: Live updates trigger when posts are approved, jobs are posted, or mentorship requests update.

---

## 📂 Project Structure Maps

### Backend Directory Structure
```text
backend/
├── app/
│   ├── main.py          # FastAPI application instance, CORS, & logging configuration
│   ├── database.py      # SQLAlchemy engine configuration & session dependency
│   ├── models.py        # Database schema definitions (SQLAlchemy declarative models)
│   ├── schemas.py       # Pydantic models for request/response validation
│   ├── utils.py         # Helper functions (password hashing, JWT token creation)
│   ├── dependencies.py  # Shared FastAPI dependencies (get_current_user, get_current_admin)
│   └── routers/         # Granular API Route handlers
│       ├── admin.py     # Admin actions (users, reports, moderation)
│       ├── auth.py      # Login and Registration routes
│       ├── events.py    # Event CRUD and RSVP endpoints
│       ├── jobs.py      # Job listings and Application Kanban handling
│       ├── mentorship.py# Mentorship discovery, requests, and sessions
│       ├── notifications.py # Notification retrieval
│       ├── posts.py     # Feed posts, likes, comments, and reports
│       ├── users.py     # Profile management
│       └── ws.py        # WebSocket connection manager
├── .env.example         # Environment variable template (copy to .env)
├── seed.py              # Script to populate the database with comprehensive mock data
└── requirements.txt     # Python dependencies with pinned versions
```

### Frontend Directory Structure
```text
frontend/
├── src/
│   ├── app/             # Redux configuration (store.js)
│   ├── components/      # Reusable UI components (Shared Layouts, Modals, Skeleton Loaders)
│   ├── contexts/        # React Context architectures
│   ├── features/        # Redux Toolkit Slices representing modular domains:
│   │   ├── auth/        # Authentication state
│   │   ├── jobs/        # Job platform state
│   │   ├── mentorship/  # Mentorship state
│   │   └── posts/       # Feed interactions state
│   ├── hooks/           # Custom reusable hooks (e.g., useTheme, useDevice, useWebSockets)
│   ├── pages/           # Parent route components:
│   │   ├── admin/       # Admin console views
│   │   ├── auth/        # Public-facing auth forms
│   │   ├── dashboard/   # Dashboard variations (Student vs Alumni)
│   │   ├── events/      # Event discovery and details
│   │   ├── feed/        # Community feed timeline
│   │   └── jobs/        # Job discovery and Alumni Kanban boards
│   ├── services/        # Centralized HTTP request definitions (Axios setup)
│   ├── utils/           # Helper functions (Date formatters, pure functions)
│   ├── App.jsx          # Root component & comprehensive React Router implementation
│   ├── index.css        # Global CSS, dark/light mode CSS design tokens
│   └── main.jsx         # React DOM bootstrap
├── vite.config.js       # Vite bundler configuration
└── package.json         # Node dependencies & run scripts
```

---

## 📖 Comprehensive API Route Reference

The backend features standard OpenAPI documentation. Once running, access it at:
- **Interactive Swagger UI**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- **ReDoc UI**: [http://127.0.0.1:8001/redoc](http://127.0.0.1:8001/redoc)

### Route Domains Summary:
- `/auth/`: `POST /register`, `POST /token` (login).
- `/users/`: `GET /me`, `PUT /me`, `GET /{id}`.
- `/posts/`: `GET /`, `POST /`, `GET /my`, `POST /{id}/like`, `POST /{id}/comments`.
- `/jobs/`: `GET /`, `POST /`, `GET /{id}`, `DELETE /{id}`, `POST /{id}/apply`, `GET /{id}/applications`, `PUT /applications/{id}/status`.
- `/mentorship/`: `GET /mentors`, `POST /request`, `GET /requests`, `GET /requests/incoming`, `PUT /requests/{id}`, `POST /sessions`, `GET /sessions/{request_id}`, `PUT /sessions/{id}`.
- `/events/`: `GET /`, `POST /`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/rsvp`.
- `/admin/`: `GET /stats`, `GET /users`, `DELETE /users/{id}`, `GET /pending-users`, `POST /approve/{id}`, `POST /reject/{id}`, `POST /block/{id}`, `GET /jobs`, `DELETE /jobs/{id}`, `GET /posts`, `GET /posts/pending`, `POST /posts/{id}/approve`, `DELETE /posts/{id}`, `GET /reports`, `POST /reports/{id}/action`.
- `/ws/`: `WS /{user_id}` (WebSocket protocol upgrade).
- `/health`: `GET /health` (uptime probe).

---

## ⚙️ Environment Variables Config

### Backend Setup (`backend/.env`)
Though currently using hardcoded fallbacks for local dev, an `.env` is best practice:
```env
DATABASE_URL=mysql+mysqlconnector://user:password@localhost/college_hub
SECRET_KEY=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Frontend Setup (`frontend/.env`)
Create a `.env` in the `frontend` folder for Vite injection:
```env
VITE_API_URL=http://127.0.0.1:8001
VITE_WS_URL=ws://127.0.0.1:8001
# Define whether to use real API or Mock (if Mock adapter is kept)
VITE_USE_MOCK=false
```

---

## 💾 Database Schema (ER Diagram)

The following diagram maps the exact SQLAlchemy Relational structure:

```mermaid
erDiagram
    ADMIN {
        int id PK
        string name
        string email
        string password
        string phone
        datetime created_at
    }

    STUDENT {
        int id PK
        string name
        string email
        string password
        string phone
        string role "Student, Alumni"
        string status "Active, Blocked, Pending"
        string reg_no
        string course
        string batch
        string session
        datetime created_at
    }

    STUDENT_ACADEMIC {
        int id PK
        int student_id FK
        string enrollment_no
        string degree
        string specialization
        string department
        string year
        string batch
    }

    STUDENT_EXPERIENCE {
        int id PK
        int student_id FK
        string company_name
        string role
        string experience_type
        date start_date
        date end_date
        text description
    }

    STUDENT_PROFILE {
        int id PK
        int student_id FK
        text skills
        text bio
        text achievements
        string location
        text avatar
    }

    POST {
        int id PK
        int user_id FK
        text content
        text image
        string type
        int likes_count
        boolean is_approved
        datetime approved_at
        datetime created_at
    }

    COMMENT {
        int id PK
        int post_id FK
        int user_id FK
        text text
        datetime created_at
    }

    POST_LIKE {
        int id PK
        int post_id FK
        int user_id FK
        datetime created_at
    }

    EVENT {
        int id PK
        string title
        string type
        string audience
        date date
        string time
        string location
        text description
        text image
        int attendees
    }

    EVENT_ATTENDEE {
        int id PK
        int event_id FK
        int student_id FK
        string status "going, interested, not_going"
        datetime created_at
    }

    JOB {
        int id PK
        string title
        string company
        string type
        string location
        string apply_link
        text description
        boolean is_active
        string posted_by
        datetime posted_date
    }

    JOB_APPLICATION {
        int id PK
        int job_id FK
        int student_id FK
        string status "Applied, Shortlisted, Interviewing, Hired, Rejected"
        text cover_letter
        string resume_url
        datetime applied_date
        datetime updated_at
    }

    JOB_APP_STATUS_HISTORY {
        int id PK
        int application_id FK
        string old_status
        string new_status
        text note
        datetime changed_at
    }

    MENTORSHIP_REQUEST {
        int id PK
        int student_id FK
        int mentor_id FK
        text message
        string status "Pending, Accepted, Rejected, Completed"
        text mentor_note
        datetime created_at
        datetime expires_at
    }

    MENTORSHIP_SESSION {
        int id PK
        int request_id FK
        datetime scheduled_at
        int duration_minutes
        string topic
        text notes
        string status "Scheduled, Completed, Cancelled"
        datetime created_at
    }

    NOTIFICATION {
        int id PK
        int user_id FK
        text text
        boolean read
        string type
        datetime created_at
    }

    REPORT {
        int id PK
        int reporter_id FK
        int target_id
        string target_type "Post, Comment, User"
        string reason
        text description
        string status "Pending, Resolved, Dismissed"
        datetime created_at
    }

    %% Relationships
    STUDENT ||--o| STUDENT_ACADEMIC : has
    STUDENT ||--o{ STUDENT_EXPERIENCE : has
    STUDENT ||--o| STUDENT_PROFILE : has
    
    STUDENT ||--o{ POST : creates
    POST ||--o{ COMMENT : has
    STUDENT ||--o{ COMMENT : writes
    POST ||--o{ POST_LIKE : receives
    STUDENT ||--o{ POST_LIKE : gives

    EVENT ||--o{ EVENT_ATTENDEE : has
    STUDENT ||--o{ EVENT_ATTENDEE : rsvps

    JOB ||--o{ JOB_APPLICATION : receives
    STUDENT ||--o{ JOB_APPLICATION : submits
    JOB_APPLICATION ||--o{ JOB_APP_STATUS_HISTORY : tracks

    STUDENT ||--o{ MENTORSHIP_REQUEST : sends
    STUDENT ||--o{ MENTORSHIP_REQUEST : receives
    MENTORSHIP_REQUEST ||--o{ MENTORSHIP_SESSION : includes

    STUDENT ||--o{ NOTIFICATION : receives
    STUDENT ||--o{ REPORT : submits
```

---

## 🚀 Extreme Detail Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.12+)
- **MySQL Engine** running locally (or remotely) on default port `3306`.

### 1. Database Initialization
Ensure you have created the MySQL Database before launching the backend:
```sql
CREATE DATABASE college_hub;
```

### 2. Backend Setup
The backend requires a Python Virtual Environment.

1. **Navigate to the Backend**:
   ```bash
   cd backend
   ```
2. **Setup Virtual Environment**:
   ```bash
   python -m venv venv
   ```
3. **Activate Environment**:
   - **Windows**: `venv\Scripts\activate`
   - **Mac/Linux**: `source venv/bin/activate`
4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Data Seeding (`seed.py`)**:
   We provide a high-fidelity data seeding script to populate the Database with default Students, Alumni, Mentors, Jobs, and an Admin account.
   ```bash
   python seed.py
   ```
   **Default Admin Credentials from Seed**: 
   - Email: `admin@college.edu`
   - Password: `admin`
6. **Start the API Configuration via Uvicorn**:
   ```bash
   uvicorn app.main:app --reload
   ```

### 3. Frontend Setup
1. **Navigate to the Frontend**:
   ```bash
   cd frontend
   ```
2. **Install Node Packages**:
   ```bash
   npm install
   ```
3. **Run Vite Dev Server**:
   ```bash
   npm run dev
   ```
   *(Ensure the Backend is running concurrently to accept API traffic).*

---

## 🤝 Contribution Guidelines

We highly encourage contributions following a strict Trunk-Based development approach with explicit Feature Branches.

1. **Fork the platform repository.**
2. **Create a granular Feature Branch** (`git checkout -b feature/EventCalendarExport`).
3. **Ensure strict Linting** (Our frontend utilizes ESLint. Run `npm run lint` before committing).
4. **Commit with Conventional Commits** (`git commit -m 'feat: add event .ics export'`).
5. **Push to Origin** (`git push origin feature/EventCalendarExport`).
6. **Open a comprehensive Pull Request**, tagging maintainers for review.

*In the Pull Request, detail your changes, provide before/after visual context for UI components, and explicitly document any requested backend SQLAlchemy schema modifications.*

---

## ⚠️ Known Limitations & Future Work

- **No email verification**: Accounts are activated purely by admin approval. Email-based OTP verification is a planned enhancement.
- **SQLite for development**: The default `DATABASE_URL` points to an SQLite file (`college_hub.db`). Switch to MySQL for production.
- **Plaintext image storage**: Post images and avatars are stored as base64/URL strings in a `Text` column. A cloud storage integration (e.g., Cloudinary or S3) is the recommended upgrade.
- **Alumni self-registration**: When a user registers as "Alumni", the backend currently assigns `Student` role and upgrades it on admin approval. A dedicated alumni onboarding flow is planned.
- **WebSocket scalability**: The current `ConnectionManager` keeps sockets in-memory. For multi-worker deployments, a Redis pub/sub adapter is required.
- **Rate limits**: Current limits are generous (set for development). Tighten `slowapi` limits before production deployment.
