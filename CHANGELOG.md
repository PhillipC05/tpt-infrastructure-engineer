# Changelog

## [1.0.0] - 2026-05-07

### Added
- Initial release of TPT Infrastructure Engineer Platform
- Project workspace with CRUD, version control, activity feed, file attachments, and commenting
- 2D Drawing Board with Fabric.js canvas, snapping, dimensioning, layers, annotations
- 3D Scene Viewer with Three.js
- AI Design Generator with parametric templates and structural validation
- Materials Database with classification, properties, regional pricing, supplier info, carbon tracking
- Trade Breakdown System with WBS generator and labour/plant databases
- Cost Estimator with quantity take-off, overhead/profit, contingency, escalation
- CPM Timeline Scheduler with Gantt chart, resource levelling, milestone tracking
- Feasibility Engine with geotechnical, environmental, hydrological, traffic analysis
- Risk Analysis with register, Monte Carlo simulation, mitigation planning
- Report Generator with PDF/Excel export and approval workflow
- Procurement & Purchase Order System with BOM, tender packages, supplier comparison
- CAD/BIM bi-directional integration (DXF, DWG, IFC)
- AI Assistant with multi-provider support (OpenAI, Anthropic, Grok, OpenRouter)
- Real-time collaboration with WebSocket presence, live cursors, document locking
- Notification system with @mentions and in-app alerts
- Role-based access control (Owner, Engineer, PM, Surveyor, etc.)
- i18n support with English and Māori translations
- Full test suite, Docker deployment, and CI/CD pipeline

### Fixed
- Frontend router now imports actual page components instead of placeholder divs
- Removed `Base.metadata.create_all()` on startup — now uses Alembic migrations
- Fixed TrustedHostMiddleware wildcard `["*"]` — now reads from env with safe default
- Extracted ConnectionManager (~170 lines) from main.py into dedicated module
- Replaced `__import__('math')` hack with proper `import math` in engineers.py
- Fixed redundant file hash initialization in upload handler
- Added frontend nginx service to docker-compose.yml
- Switched hardcoded DB credentials to environment variables in docker-compose
- Added `skip`/`limit` pagination with `X-Total-Count` header to list endpoints
- Updated setup documentation with .env creation and Alembic migration steps