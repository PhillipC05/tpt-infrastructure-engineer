# TPT Infrastructure Engineer - Technical Stack Design

Complete technology stack specification, designed specifically for civil infrastructure engineering requirements.

---

## ✅ Architecture Principles

| Principle | Implementation |
|---|---|
| **Security First** | End-to-end encryption, immutable audit trails, least privilege access |
| **Performance** | 100ms response targets, client side rendering, optimized geospatial queries |
| **Offline Capable** | Works without internet, syncs when reconnected |
| **Auditable** | Every user action permanently logged with full before/after values |
| **Standards Compliant** | Built to international engineering standards from day one |
| **Extensible** | Modular architecture, plugin system for custom calculations |

---

## 🔧 Backend Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Web Framework | **FastAPI** | 0.136+ | Modern async API with OpenAPI generation |
| ASGI Server | **Uvicorn** | 0.44+ | High performance production server |
| ORM | **SQLAlchemy 2.0** | 2.0.49+ | Type safe database queries |
| Database | **PostgreSQL 16** | 16+ | Primary datastore |
| Geospatial Extension | **PostGIS 3.4** | 3.4+ | Geospatial calculations, location tracking, site boundaries |
| Authentication | **python-jose** | 3.5+ | JWT tokens with HS256 |
| Password Hashing | **passlib + bcrypt** | 1.7.4+ | OWASP compliant password storage |
| Engineering Maths | **NumPy / SciPy** | Latest | Structural calculations, load analysis, statistics |
| Geospatial Library | **GeoPandas / Shapely** | Latest | Survey data processing, coordinate transformations |
| Audit System | Custom implementation | | Immutable audit trail with IP & user agent capture |

---

## 🎨 Frontend Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **React 19** | 19+ | Component based UI |
| Language | **TypeScript 5** | 5+ | Full type safety across application |
| Build Tool | **Vite** | 5+ | Fast HMR development & production builds |
| Styling | **Tailwind CSS 3** | 3.4+ | Utility first responsive design system |
| UI Components | **Headless UI** | 2+ | Accessible unstyled components |
| Icons | **Heroicons 2** | 2 | Official icon set |
| Drawing Engine | **Fabric.js** | 6+ | 2D canvas drawing, engineering snapping, dimensioning |
| 3D Visualisation | **Three.js / R3F** | 0.160+ | 3D model viewing, BIM visualisation |
| State Management | **TanStack Query** | 5+ | Server state cache, background updates |
| Tables | **TanStack Table** | 8+ | High performance data grids for BoMs & schedules |
| Charts | **Recharts** | 2+ | Cost analysis, timeline Gantt charts |
| HTTP Client | **Axios** | 1.6+ | API client with automatic retries |

---

## 🧠 AI & Analysis Stack

| Component | Technology | Purpose |
|---|---|---|
| Local LLM | **Llama 3 70B** | Design generation, risk analysis, report writing |
| LLM Framework | **LangChain** | Orchestration, tool usage, structured outputs |
| Vector Database | **pgvector** | Engineering knowledge base, semantic search |
| Simulation Engine | Custom Python | Monte Carlo analysis, probabilistic risk modelling |
| OCR | **Tesseract 5** | Scan drawing import & measurement extraction |

---

## 📦 Deployment Stack

| Component | Technology |
|---|---|
| Container Runtime | **Docker** |
| Orchestration | **Docker Compose (single server) / Kubernetes** |
| Reverse Proxy | **Traefik** |
| SSL | **LetsEncrypt** |
| Object Storage | **MinIO / S3** |
| Backup | **pg_dump + incremental WAL** |
| Monitoring | **Prometheus + Grafana** |
| Logging | **Loki** |

---

## 📐 File Format Support

| Format | Support Status |
|---|---|
| ✅ DWG / DXF | Read + Write via libdxfrw |
| ✅ IFC 2x3 / 4 | Import via IfcOpenShell |
| ✅ PDF | Export + Import |
| ✅ Excel | Import / Export via openpyxl |
| ✅ Word | Document generation via docxtpl |
| ✅ CSV / GeoJSON | Full support |
| ✅ PNG / JPEG / TIFF | Image attachments |

---

## 🛡️ Security Standards

| Control | Implementation |
|---|---|
| Password Hashing | bcrypt cost factor 12 |
| Session Duration | 8 hours, inactivity timeout |
| Data At Rest | AES-256 full database encryption |
| Audit Retention | Permanent immutable logs |
| Role System | 8 granular roles with module level permissions |
| API | All endpoints authenticated by default |
| Input Validation | Pydantic schema validation on 100% of inputs |
| Output Sanitization | Automatic XSS protection |

---

## 📊 Performance Targets

| Operation | Target |
|---|---|
| API Endpoint Response | < 100ms |
| Page Load Time | < 500ms |
| Drawing Canvas Update | < 16ms (60fps) |
| Project Save | < 300ms |
| Report Generation | < 2 seconds |
| Database Query | < 50ms |

---

## ✅ Status

✅ **All core dependencies installed**
✅ **Backend framework implemented**
✅ **Database schema designed**
✅ **Authentication system complete**
✅ **Project workspace module complete**

This stack has been specifically selected for civil infrastructure engineering requirements. Every component was chosen for reliability, performance and suitability for technical calculation workloads.