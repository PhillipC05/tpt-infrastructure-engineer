# TPT Infrastructure Engineer

An end-to-end infrastructure engineering platform for project management, cost estimation, scheduling, CAD/BIM workflows, and real-time collaboration. Built for civil engineers, project managers, quantity surveyors, and contractors.

[![CI](https://github.com/PhillipC05/tpt-infrastructure-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipC05/tpt-infrastructure-engineer/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## Features

| Module | Description |
|--------|-------------|
| Project Workspace | CRUD, version control, activity feed, file attachments, commenting |
| 2D Drawing Board | Fabric.js canvas with snapping, dimensioning, layers, annotations |
| 3D Scene Viewer | Three.js + web-ifc viewer with orbit controls and IFC/BIM model support |
| AI Design Generator | Parametric templates with scored structural alternatives |
| Design Comparison | Side-by-side cost, structural and carbon comparison |
| DXF / IFC Importer | Import AutoCAD DXF drawings and IFC BIM models |
| Materials Database | AS/NZS-rated library with regional pricing, supplier info, carbon tracking |
| Cost Estimator | Quantity take-off, overhead/profit, contingency, escalation |
| CPM Scheduler | Gantt chart, critical path, resource levelling, milestone tracking |
| Feasibility Engine | Geotechnical, environmental, hydrological, traffic analysis |
| Risk Analysis | Risk register, Monte Carlo simulation, mitigation planning |
| Report Generator | PDF/Excel/Word export with approval workflow |
| Procurement | BOM, tender packages, purchase orders, supplier comparison |
| Carbon Dashboard | Scope 1/2/3 emissions breakdown and benchmark comparison |
| Compliance Checker | Validate designs against AS/NZS structural and environmental standards |
| AI Assistant | Rule-based Q&A; LLM-powered when `AI_ENABLED=true` |
| Real-time Collaboration | WebSocket presence, live cursors, document locking |
| Role-based Access | Owner, Engineer, PM, Surveyor, Draftsman, Contractor, Supplier, Viewer |
| Audit Trail | Full create/update/delete audit log per organisation |
| i18n | English and Māori (te reo) translations |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Drawing | Fabric.js v7 |
| 3D / BIM | Three.js r170 + web-ifc-three |
| Charts | Recharts |
| State | Zustand + TanStack Query |
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| ORM | SQLAlchemy 2 + GeoAlchemy2 |
| Auth | JWT HS256 (python-jose) + bcrypt |
| Calculations | NumPy + SciPy |
| GIS | GeoPandas + Shapely |
| Containers | Docker + docker-compose |
| CI/CD | GitHub Actions |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16 with PostGIS 3.4

### 1. Clone and configure

```bash
git clone https://github.com/PhillipC05/tpt-infrastructure-engineer.git
cd tpt-infrastructure-engineer
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY to a random 64-char hex string:
# python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Database setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE tpt_infrastructure;"
psql -U postgres -c "CREATE EXTENSION postgis;" -d tpt_infrastructure

# Apply migrations
cd backend
alembic upgrade head
```

### 3. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API: `http://localhost:8000` — Interactive docs: `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

### 5. Docker (full stack)

```bash
cp backend/.env.example backend/.env   # fill in credentials
docker-compose up --build
```

---

## Project Structure

```
tpt-infrastructure-engineer/
├── backend/
│   ├── main.py              API endpoints + WebSocket
│   ├── auth.py              JWT authentication
│   ├── models.py            SQLAlchemy ORM models
│   ├── schemas.py           Pydantic request/response schemas
│   ├── database.py          DB engine + session factory
│   ├── audit_logger.py      Audit trail
│   ├── websocket_manager.py Real-time connection manager
│   ├── compliance.py        AS/NZS compliance rules
│   ├── anomaly.py           Cost anomaly detection
│   ├── integrations.py      AI + GIS + IoT integrations
│   ├── estimation.py        Cost estimation engine
│   ├── feasibility.py       Feasibility assessment engine
│   ├── scheduling.py        CPM scheduler (NetworkX)
│   ├── procurement.py       Procurement workflow
│   ├── reporting.py         Report generator
│   ├── materials.py         Materials database
│   └── middleware/          Security, logging, transaction middleware
├── frontend/src/
│   ├── App.tsx              Routes + layout
│   ├── pages/               Feature pages (Dashboard, Projects, etc.)
│   ├── components/          Shared UI + drawing/3D components
│   ├── store/               Zustand auth store
│   ├── lib/                 API client, i18n, utilities
│   └── providers/           React context providers
├── tests/                   pytest test suite (SQLite in-memory)
├── alembic/                 Database migrations
├── docs/                    Deployment and runbook docs
├── docker-compose.yml
└── Dockerfile
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | 64-char random hex for JWT signing |
| `DATABASE_URL` | No | PostgreSQL connection string (default: localhost) |
| `TPT_TOKEN_EXPIRE_MINUTES` | No | JWT expiry in minutes (default: 480) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `ALLOWED_HOSTS` | No | Comma-separated trusted hosts |
| `AI_ENABLED` | No | `true` to enable LLM-powered assistant |
| `SMTP_HOST` | No | SMTP server for email notifications |

For the frontend, copy `frontend/.env.example` to `frontend/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend URL (default: `http://localhost:8000`) |

---

## Running Tests

```bash
cd backend
python -m pytest ../tests/ -v

# Load testing
cd tests/load_testing
locust -f locustfile.py
```

---

## API Documentation

FastAPI generates interactive Swagger UI at `/docs` and ReDoc at `/redoc` automatically when the backend is running.

---

## Innovative Roadmap

Planned for future releases:

- **PWA / Offline Mode** — service worker so field engineers can annotate without connectivity
- **Live Materials Pricing** — supplier price feed integration for real-time unit rates
- **Drone Survey Import** — LAS/LAZ point cloud to 3D mesh pipeline
- **Digital Twin Sync** — push design changes to IoT sensor networks
- **QR Site Signs** — one-click printable QR-coded project information boards

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, code standards, and PR process.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[Apache 2.0](LICENSE) © 2026 TPT Solutions
