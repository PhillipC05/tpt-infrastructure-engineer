# Contributing to TPT Infrastructure Engineer

Thank you for your interest in contributing! This project is an end-to-end infrastructure engineering platform.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow the setup instructions in `Notes.txt` or `README.md`
4. Create a feature branch: `git checkout -b feature/my-feature`

## Development Workflow

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Edit as needed
alembic upgrade head
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Code Standards

### Python
- Type hints required for all function signatures
- Use Pydantic models for request/response validation
- Use SQLAlchemy ORM for database operations
- Follow PEP 8 style

### TypeScript/React
- TypeScript strict mode enabled — use proper types
- Use Zustand for state management
- Use react-hook-form + zod for form validation
- Tailwind CSS for styling — no inline styles
- Component files use PascalCase

## Testing

```bash
# Backend tests
cd backend && python -m pytest ../tests/ -v

# Load testing
cd tests/load_testing && locust -f locustfile.py
```

## Pull Request Process

1. Ensure all tests pass
2. Add tests for new functionality
3. Update CHANGELOG.md with your changes
4. Run `alembic check` to verify no unapplied migrations
5. Create a PR against the `develop` branch

## Commit Messages

Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `docs:` documentation changes
- `chore:` tooling, dependencies, CI
- `perf:` performance improvements

## Project Structure

```
tpt-infrastructure-engineer/
├── frontend/          React + TypeScript + Tailwind
├── backend/           FastAPI + SQLAlchemy
├── database/          SQL schema + migrations
├── schemas/           Engineering calculation schemas
├── docs/              Documentation
└── tests/             Test suite
```

## Questions?

Open a GitHub Discussion or issue for any questions.