# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload                         # dev server on :8000
python -m pytest ../tests/ -v                     # all tests
python -m pytest ../tests/test_auth.py -v         # single test file
python -m pytest ../tests/ -k "test_login" -v     # single test by name
alembic upgrade head                              # apply migrations
alembic revision --autogenerate -m "description" # new migration
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # dev server on :5173
npm run build      # production build → frontend/dist
npm run lint
```

### Docker
```bash
docker-compose up --build   # full stack
```

### Environment
```bash
cp backend/.env.example backend/.env   # then edit credentials
```

The CI workflow (`.github/workflows/ci.yml`) runs: backend tests → frontend lint+build → Docker image build, in that order.

## Architecture

### Backend (`backend/`)

FastAPI app with a single `main.py` that wires together all routes, middleware, and startup. There is no router module split — all route handlers live directly in `main.py`.

**Middleware stack** (applied bottom-up):
1. `TrustedHostMiddleware` — reads `ALLOWED_HOSTS` env var
2. `GZipMiddleware`
3. `CORSMiddleware` — reads `CORS_ORIGINS` env var (default: `localhost:5173,3000`)
4. `SecurityHeadersMiddleware` (custom, in `backend/middleware/`)
5. `RequestLoggingMiddleware` (custom) — structured JSON logs
6. `TransactionMiddleware` (custom) — auto-rollback on 4xx/5xx

**Authentication**: JWT HS256 via `python-jose`. `backend/auth.py` holds `SECRET_KEY`, `ALGORITHM`, token creation, and the `get_current_user` FastAPI dependency. All protected routes inject `current_user = Depends(get_current_user)`. Tokens expire after 480 minutes (8 hours). Passwords are hashed with bcrypt via passlib.

**Database**: SQLAlchemy (synchronous sessions) with PostgreSQL + PostGIS. Session dependency via `get_db()` yields and closes a `SessionLocal` session. Geographic columns use `Geography(geometry_type='POINT', srid=4326)` from `geoalchemy2`. UUIDs are used as primary keys throughout.

**Audit logging**: `AuditLogger(db, user)` in `backend/audit_logger.py`. Call `log_create`, `log_update`, `log_delete`, or `log_access` after any state-changing operation on projects or attachments.

**File uploads**: validated for size (100 MB max), extension (blocklist), MIME type (allowlist), and content scan (blocks embedded scripts/shebangs). Files stored with UUID filenames under `./uploads` via the `lib.file_storage` abstraction; original name and SHA256 hash saved in `project_attachments`.

**WebSocket** (`backend/websocket_manager.py`): `ConnectionManager` maintains `active_connections: Dict[project_id, Dict[ws, UserPresence]]` and `document_locks`. The endpoint `/api/ws/projects/{project_id}?token=JWT` validates the JWT, then routes message types: `cursor_update`, `lock_document`, `unlock_document`, `activity_event`, `typing_start`, `typing_stop`.

**Rate limiting**: slowapi decorators on health endpoints. Add `@limiter.limit("N/minute")` to new sensitive endpoints.

### Database & Migrations

Alembic manages schema versions. The connection URL in `alembic.ini` defaults to `postgresql://postgres:postgres@localhost/tpt_infrastructure` — override via `DATABASE_URL` env var.

Key model relationships:
- `users` → `organisations` (many-to-one)
- `projects` → `organisations`, `users` (created_by)
- `project_versions` — snapshot (JSONB) created automatically on every project update
- `notifications` + `user_mentions` — created when `@[name](uuid)` mentions are parsed from comment content
- `audit_logs` — append-only, written by `AuditLogger`

### Frontend (`frontend/src/`)

**Routing**: React Router v7. `App.tsx` defines all routes. Protected routes wrap in `ProtectedRoute` which reads `useAuthStore(state => state.isAuthenticated)`.

**Auth flow**: `AppProviders.tsx` calls `checkAuth()` on mount (checks localStorage token) then `fetchCurrentUser()` to validate it. Until that resolves, a full-screen loading spinner is shown. On 401 from any API call, the Axios response interceptor clears the token and redirects to `/login`.

**State**: Single Zustand store at `store/authStore.ts` for auth. Feature data (projects, notifications, etc.) is fetched via TanStack Query (staleTime: 5 min, retry: 1, no refetch-on-focus).

**API client** (`lib/api.ts`): `ApiClient` singleton wraps Axios. Base URL from `VITE_API_URL` env var or `http://localhost:8000`. Request interceptor injects `Authorization: Bearer {token}`. Pagination responses include `X-Total-Count` header. Login uses `application/x-www-form-urlencoded` (OAuth2 form) with fields `username` and `password`.

**Key UI subsystems**:
- Drawing board: Fabric.js v7 canvas (`components/DrawingBoard.tsx`)
- 3D viewer: Three.js + web-ifc-three (`components/Viewer3D.tsx`, `components/SceneViewer3D.tsx`)
- Charts: Recharts (`components/DashboardCharts.tsx`)
- CAD import: `dxf-parser` for DXF, web-ifc-three for IFC
- Keyboard shortcuts: `providers/KeyboardShortcuts.tsx` — Ctrl+1–7 nav, Ctrl+K search, Shift+? help modal
- i18n: i18next configured in `lib/i18n.ts` with English and Māori namespaces — wired but not yet called from components

### Testing

Tests use an **in-memory SQLite** async engine (not PostgreSQL), so PostGIS geographic types are unavailable in tests. The `tests/conftest.py` creates all tables via `Base.metadata.create_all` per session and rolls back after each test.

Standard test user: `test@tpt.local` / `TestPassword123!`

Load tests live in `tests/load_testing/` (Locust). E2E tests use Playwright (not yet written).

## Key Conventions

- **Organisation isolation**: every list endpoint filters by `current_user.organisation_id` — do not return cross-org data
- **Soft deletes**: projects and attachments use `is_archived=True`, not hard deletes
- **Project versioning**: always create a `ProjectVersion` record (JSONB snapshot) when updating a project
- **Role enum**: `UserRole` has 8 values — OWNER, ENGINEER, SURVEYOR, PROJECT_MANAGER, DRAFTSMAN, CONTRACTOR, SUPPLIER, VIEWER
- **Pagination**: list endpoints accept `skip` + `limit` (default 50) and return `X-Total-Count` header
- **Broadcast on write**: attachment uploads and comment posts broadcast to the project's WebSocket room after DB commit
