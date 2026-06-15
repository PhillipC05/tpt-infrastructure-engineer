# TPT Infrastructure Engineer — TODO / Known Issues

This file tracks current tasks, bugs, improvements, and gaps that need attention beyond the feature-complete implementation checklist.

---

## ✅ ALL FIXES APPLIED IN THIS SESSION

| # | Fix | Status |
|---|------|--------|
| 1 | Router placeholder components → real page imports | ✅ Done |
| 2 | `Base.metadata.create_all()` removed from main.py | ✅ Done |
| 3 | TrustedHostMiddleware wildcard fixed (reads from env) | ✅ Done |
| 4 | ConnectionManager extracted to `backend/websocket_manager.py` | ✅ Done |
| 5 | `__import__('math')` → proper `import math` in engineers.py | ✅ Done |
| 6 | Duplicate file hash init removed in upload handler | ✅ Done |
| 7 | Frontend nginx service added to docker-compose.yml | ✅ Done |
| 8 | DB credentials switched to env vars in docker-compose | ✅ Done |
| 9 | Setup docs updated with .env + Alembic steps | ✅ Done |
| 10 | Pagination (`skip`/`limit`) + `X-Total-Count` on list endpoints | ✅ Done |
| 11 | CI/CD workflow created (`.github/workflows/ci.yml`) | ✅ Done |
| 12 | `CHANGELOG.md` created with full release notes | ✅ Done |
| 13 | `CONTRIBUTING.md` created with contribution guidelines | ✅ Done |
| 14 | API client expanded with full endpoint coverage (projects, notifications, comments, attachments, activity) | ✅ Done |
| 15 | DashboardPage wired to real API (activity feed + project count) with loading/error/empty states | ✅ Done |
| 16 | NotificationCentre wired to real API (polling, mark-read, mark-all-read) | ✅ Done |

---

## 🔴 HIGH PRIORITY — Remaining

### Frontend — Pages Still Have Hardcoded Data
**Files:** `frontend/src/pages/MaterialsPage.tsx`, `frontend/src/pages/SchedulePage.tsx`, etc.

These pages still use hardcoded arrays instead of calling the API. The API client now has all the necessary methods (`getProjects`, `getNotifications`, etc.).

**Fix:** Import `api` and add `useEffect` + loading states to fetch from backend.

### Frontend — Components Show Mock/Hardcoded Data
**Files:** `frontend/src/components/DashboardCharts.tsx`, `frontend/src/components/CostEstimator.tsx`, etc.

Chart components still use hardcoded data. The backend doesn't have dedicated endpoints for chart data yet.

**Fix:** Add backend chart endpoints then connect components.

### Frontend — Error/Loading States Pattern
Only `DashboardPage` and `NotificationCentre` use the error/loading/empty state pattern. Other pages still lack this.

**Fix:** Apply the same `loading`/`error`/`data` pattern to remaining pages.

---

## 🟡 MEDIUM PRIORITY — Remaining

### i18n — Configured But Not Used
**File:** `frontend/src/lib/i18n.ts`

i18next is configured with English and Māori translations. No component calls `useTranslation()` or `t()`. The framework is ready to use — just needs to be wired into the UI strings.

### Backend — Email/Push Notifications Missing
Phase 14 lists "Email & push notifications" but only in-app WebSocket notifications exist.

### Tests — Expanded Coverage
Auth tests: 11 tests covering registration, login, profile, invalid tokens, health check
Project CRUD tests: 14 tests covering create, list, pagination, get, update, versioning, delete (archive), org isolation, activity feed, dashboard stats
Existing: procurement + reporting

### Final End-to-End Testing
Carried forward from Phase 20.
