# TPT Infrastructure Engineer

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

## Tech Stack

| Layer | Technology |
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

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

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

## Project Structure

```
tpt-infrastructure-engineer/
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
