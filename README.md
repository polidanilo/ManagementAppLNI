# LNI Management App

A mobile-first management tool built to solve a real-world problem at the LNI nautical center: transitioning daily operations from paper logs to a streamlined digital workspace for tracking boat problems, volunteer shifts, and purchase orders.

[GIF preview here]

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python, SQLAlchemy ORM |
| Database | PostgreSQL 15 (Docker) |
| Auth | JWT via Bearer token |

## Architecture
```
React SPA → Axios (JWT) → FastAPI routes → Pydantic validation → SQLAlchemy ORM → PostgreSQL
```

The frontend is a decoupled SPA that never touches the database directly. FastAPI exposes RESTful endpoints grouped by domain (/orders, /boats, /problems, /reports). Pydantic schemas strictly validate every incoming payload before it reaches the ORM layer — ensuring sensitive fields (like password hashes) are explicitly excluded from API responses.

## How to run locally

**1. Database**
```bash
cd backend 
sudo docker compose up -d
```

**2. Backend**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
# → API live at: [http://127.0.0.1:8000](http://127.0.0.1:8000)
```

**3. Frontend**
```bash
cd frontend 
npm install 
npm run dev
# → App live at: http://localhost:3000
```

## Known limitations

- **Auth storage:** JWTs are currently stored in `localStorage`, which is vulnerable to XSS. Moving to `HttpOnly` secure cookies is the planned production-ready alternative.
- **No RBAC:** All authenticated users currently share the same permission level. An Admin/User hierarchy is required before wider deployment.
- **No automated tests:** The current version relies on extensive manual edge-case testing. Implementing an automated test suite (`pytest` for backend, `Cypress` for frontend) is the next structural step.
