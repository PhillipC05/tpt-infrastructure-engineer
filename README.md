# TPT Infrastructure Engineer

<<<<<<< Updated upstream
An end-to-end infrastructure engineering platform for project management, cost estimation, scheduling, CAD/BIM workflows, and real-time collaboration. Built for civil engineers, project managers, quantity surveyors, and contractors.

[![CI](https://github.com/PhillipT1/tpt-infrastructure-engineer/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipT1/tpt-infrastructure-engineer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

| Module | Description |
|--------|-------------|
| Project Workspace | CRUD, version control, activity feed, file attachments, commenting |
| 2D Drawing Board | Fabric.js canvas with snapping, dimensioning, layers, annotations |
| 3D Scene Viewer | Three.js scene rendering with IFC/BIM model support |
| AI Design Generator | Parametric templates and structural validation |
| Materials Database | Classification, regional pricing, supplier info, carbon tracking |
| Trade Breakdown | WBS generator with labour and plant databases |
| Cost Estimator | Quantity take-off, overhead/profit, contingency, escalation |
| CPM Scheduler | Gantt chart, resource levelling, milestone tracking |
| Feasibility Engine | Geotechnical, environmental, hydrological, traffic analysis |
| Risk Analysis | Risk register, Monte Carlo simulation, mitigation planning |
| Report Generator | PDF/Excel export with approval workflow |
| Procurement | BOM, tender packages, supplier comparison |
| CAD/BIM Integration | Bi-directional DXF, DWG, IFC support |
| AI Assistant | Multi-provider support (OpenAI, Anthropic, Grok, OpenRouter) |
| Real-time Collaboration | WebSocket presence, live cursors, document locking |
| Role-based Access | Owner, Engineer, PM, Surveyor, and more |
| i18n | English and Māori translations |
=======
End-to-end platform for infrastructure engineering — planning, design, costing, scheduling and reporting. Built for civil engineers, project managers, quantity surveyors and contractors.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

| Module | Description |
|---|---|
| 2D Drawing Board | Fabric.js canvas with layers, grid snap, and drawing tools |
| 3D Scene Viewer | Three.js viewer with orbit controls and model inspection |
| AI Design Generator | Parametric design templates with scored alternatives |
| Design Comparison | Side-by-side cost, structural and carbon comparison |
| DXF Importer | Import AutoCAD DXF drawings directly |
| IFC / BIM Importer | Load IFC BIM models via web-ifc |
| Materials Database | Engineering materials library (AS/NZS standards) |
| Cost Estimator | Quantity takeoff and complete cost build-up with Recharts visualisation |
| CPM Scheduler | Critical path scheduling with resource levelling |
| Risk Analysis | Monte Carlo simulation for contingency modelling |
| Report Generator | PDF / Word / Excel / HTML regulatory and project reports |
| Procurement | BOM generation, purchase orders, tender and quote management |
| Role-Based Access | 8-role permission matrix (Owner → Viewer) |
| Audit Trail | Full audit log for every create / update / delete |
| Real-time Collaboration | WebSocket project broadcasting |

---
>>>>>>> Stashed changes

## Tech Stack

| Layer | Technology |
<<<<<<< Updated upstream
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| State | Zustand, TanStack Query |
| Backend | FastAPI, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Migrations | Alembic |
| Real-time | WebSockets |
| Containers | Docker + docker-compose |
| CI/CD | GitHub Actions |

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16 with PostGIS 3.4

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/PhillipT1/tpt-infrastructure-engineer.git
cd tpt-infrastructure-engineer
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and API keys
```

### 2. Database setup

```bash
# Windows — start PostgreSQL service (adjust service name if needed)
net start postgresql-x64-16

# Verify it is running
netstat -ano | findstr :5432

# Create the database
psql -U postgres -c "CREATE DATABASE tpt_infrastructure;"

# Apply migrations
cd backend
alembic upgrade head
```

### 3. Backend
=======
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS v4 |
| Drawing | Fabric.js v7 |
| 3D | Three.js + web-ifc-three |
| Charts | Recharts |
| Backend | FastAPI + Python 3.12 |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| ORM | SQLAlchemy 2 + GeoAlchemy2 |
| Auth | JWT (python-jose) + bcrypt |
| Calculations | NumPy + SciPy |
| GIS | GeoPandas + Shapely |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16 with PostGIS extension

### 1. Clone

```bash
git clone https://github.com/your-org/tpt-infrastructure-engineer.git
cd tpt-infrastructure-engineer
```

### 2. Backend
>>>>>>> Stashed changes

```bash
cd backend
pip install -r requirements.txt
<<<<<<< Updated upstream
uvicorn main:app --reload
```

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 4. Frontend
=======

# Create your .env (copy the example and fill in values)
cp ../.env.example ../.env
# Edit .env — set TPT_SECRET_KEY to a random 64-char string

# Apply the database schema
psql -U postgres -d tpt_infrastructure -f ../database/schema.sql

# Start the API server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend
>>>>>>> Stashed changes

```bash
cd frontend
npm install
npm run dev
```

<<<<<<< Updated upstream
Frontend: `http://localhost:5173`

## Docker

```bash
docker-compose up --build
```

## Running Tests

```bash
# Backend unit + integration tests
cd backend
python -m pytest ../tests/ -v

# Load testing
cd tests/load_testing
locust -f locustfile.py
```
=======
The app will open at `http://localhost:5173`.

---
>>>>>>> Stashed changes

## Project Structure

```
tpt-infrastructure-engineer/
<<<<<<< Updated upstream
├── frontend/          React + TypeScript + Tailwind
├── backend/           FastAPI + SQLAlchemy
├── tests/             Test suite
├── alembic/           Database migrations
├── docs/              Deployment and runbook docs
├── docker-compose.yml
└── Dockerfile
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, code standards, and PR process.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[MIT](LICENSE) © 2026 TPT Solutions
=======
├── backend/              FastAPI application
│   ├── main.py           API endpoints + WebSocket
│   ├── auth.py           JWT authentication
│   ├── models.py         SQLAlchemy ORM models
│   ├── schemas.py        Pydantic request/response schemas
│   ├── estimation.py     Cost estimation engine
│   ├── feasibility.py    Feasibility assessment engine
│   ├── scheduling.py     CPM scheduler (NetworkX)
│   ├── procurement.py    Procurement workflow
│   ├── reporting.py      Report generator (5 templates, 6 formats)
│   ├── integrations.py   BIM / GIS / drone / IoT / weather / AI
│   ├── engineers.py      Structural calculations
│   ├── materials.py      Materials database
│   ├── trades.py         Labour rates and plant database
│   └── audit_logger.py   Audit trail
├── frontend/             React application
│   └── src/
│       ├── App.tsx        Platform dashboard + navigation
│       └── components/    Feature modules (11 components)
├── database/
│   └── schema.sql         PostgreSQL schema (14 tables)
├── tests/                 pytest test suite
├── docs/                  Technical documentation
├── .env.example           Environment variable template
└── LICENSE
```

---

## Environment Variables

Copy `.env.example` to `.env` in the project root and set:

| Variable | Required | Description |
|---|---|---|
| `TPT_SECRET_KEY` | Yes | 64-char random secret for JWT signing |
| `DATABASE_URL` | No | PostgreSQL connection string (default: localhost) |
| `TPT_TOKEN_EXPIRE_MINUTES` | No | JWT expiry in minutes (default: 480) |

Generate a secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## API Documentation

FastAPI generates interactive Swagger UI at `/docs` and ReDoc at `/redoc` automatically when the backend is running.

---

## Innovative Roadmap

The following enhancements are planned for future releases:

- **AI Cost Anomaly Detection** — flag estimates that deviate significantly from historical project benchmarks
- **Carbon Dashboard** — project-level sustainability scorecard and Scope 3 emissions tracking
- **Live Materials Pricing** — integration with supplier price feeds for real-time unit rates
- **Automated Compliance Checking** — validate designs against AS/NZS structural and environmental standards
- **PWA / Offline Mode** — field engineers can access and annotate projects without connectivity
- **Drone Survey Import** — point cloud (LAS/LAZ) to 3D mesh pipeline for as-built capture
- **Digital Twin Sync** — push design changes to IoT sensor networks and live site dashboards
- **QR Site Signs** — one-click generation of printable QR-coded project information boards

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss significant changes.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for full text.

Copyright (c) 2026 TPT Infrastructure Engineer
>>>>>>> Stashed changes
