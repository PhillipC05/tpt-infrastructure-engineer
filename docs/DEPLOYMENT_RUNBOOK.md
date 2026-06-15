# TPT Infrastructure Engineer - Production Deployment Runbook
## Phase 19 Deployment & Production

---

## ✅ Desktop Deployment (Normal Windows/Mac/Linux)

This application runs perfectly on standard desktop computers:

### Quick Start on Desktop
1. Install **Docker Desktop** (free download from docker.com)
2. Open terminal in project folder
3. Run:
   ```bash
   docker compose up -d
   ```
4. Open browser at: **http://localhost:8000**

✅ Works on Windows 10+, MacOS 12+, Ubuntu 20.04+
✅ No programming knowledge required
✅ Runs completely locally - no cloud required
✅ All data stays on your computer

---

## Production Environment Configuration

| Variable | Purpose | Default |
|---|---|---|
| `ENVIRONMENT` | Runtime environment | `production` |
| `DEBUG` | Debug mode | `false` |
| `DATABASE_URL` | PostgreSQL connection string | |
| `SECRET_KEY` | Application encryption key | *auto-generated* |
| `JWT_SECRET_KEY` | JWT signing key | *auto-generated* |
| `ALLOWED_HOSTS` | Allowed host headers | `localhost` |
| `CORS_ORIGINS` | Allowed CORS origins | |
| `S3_ENDPOINT_URL` | Object storage endpoint | |

---

## Monitoring & Observability

Endpoint | Description
---|---
`GET /api/health` | Application health check
`GET /api/health/details` | Detailed system status
`GET /api/metrics` | Prometheus metrics endpoint
`GET /api/admin/status` | Admin system status

---

## Log Aggregation System

Application logs are structured JSON output:
- All requests are logged with timestamps, user id, response time
- Error logs include stack traces and request context
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL

Central logging configuration for production:
- File rotation logging (max 100MB per file, 10 backups)
- Stdout logging for Docker / Kubernetes environments
- Optional integration with Elasticsearch, Datadog, Splunk

---

## Backup & Disaster Recovery Procedures

### Automated Backups
1. Daily full database backup at 02:00 UTC
2. Incremental transaction log backups every 15 minutes
3. File uploads backup daily
4. Backups are encrypted at rest
5. Offsite backup replication to 2 geographically separate locations

### Recovery Time Objectives
- RTO: < 15 minutes
- RPO: < 15 minutes

### Recovery Procedure
1. Stop application services
2. Restore latest database backup
3. Restore file system data
4. Run database migrations
5. Start services
6. Verify application health

---

## Staging Environment

Staging environment mirrors production exactly:
- Same infrastructure specifications
- Same database schema
- Same software versions
- Anonymized production data
- Automatic deployments on main branch commits

---

## Production Deployment Checklist

1. [ ] Run full test suite `pytest`
2. [ ] Check migration status `alembic current`
3. [ ] Backup database
4. [ ] Deploy with zero downtime rolling update
5. [ ] Verify health check endpoint
6. [ ] Monitor error logs for 15 minutes
7. [ ] Run smoke tests against production
8. [ ] Notify users of deployment completion