from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request, Response, Query
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import Dict, Set, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os
import logging
import time
import json
import asyncio

from models import (
    Base, User, Project, Organisation, ProjectVersion, UserPermission, UserRole,
    ProjectAttachment, ProjectComment, Notification, UserMention,
    Material, ScheduleTask, EstimateItem, PurchaseOrder, BillOfMaterials, GeneratedReport,
    Design, DesignAlternative, SensorDefinition, SensorReading,
)
from notifications import NotificationService
from auth import (
    verify_password, create_access_token, get_current_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, Token
)
from audit_logger import AuditLogger
from fastapi import UploadFile, File
from schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    UserCreate, UserUpdate, UserResponse,
    AttachmentResponse, CommentCreate, CommentResponse, NotificationResponse,
    MaterialCreate, MaterialUpdate,
    TaskCreate, TaskUpdate,
    EstimateItemCreate, EstimateItemUpdate,
    PurchaseOrderCreate, PurchaseOrderUpdate,
    DesignCreate, DesignUpdate, DesignAlternativeCreate,
)

# Load environment variables
load_dotenv()

# Initialize Limiter (relaxed limits in test environment)
_TESTING = os.getenv("TESTING") == "true"
_RATE_LIMIT_LOGIN = "1000/minute" if _TESTING else "10/minute"
_RATE_LIMIT_REGISTER = "1000/minute" if _TESTING else "5/minute"
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from database import engine
    from models import Base
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="TPT Infrastructure Engineer API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

# Request Logging Middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000
        formatted_process_time = '{0:.2f}'.format(process_time)
        
        log_data = {
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time_ms": formatted_process_time,
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent", "unknown")
        }
        
        logging.info(json.dumps(log_data))
        
        return response

from middleware.transaction_middleware import TransactionMiddleware

app.add_middleware(TransactionMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(","))

# Proper CORS Configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
    expose_headers=["X-Total-Count", "X-Request-ID"]
)

# Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred"}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code
        },
        headers=exc.headers
    )

from database import DATABASE_URL, engine, SessionLocal, get_db

# Database tables managed via Alembic migrations.
# Run: alembic upgrade head


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/auth/login", response_model=Token)
@limiter.limit(_RATE_LIMIT_LOGIN)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
        "name": f"{user.first_name} {user.last_name}"
    }


@app.post("/auth/register", response_model=UserResponse, status_code=201)
@limiter.limit(_RATE_LIMIT_REGISTER)
async def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )

    org_id = user_data.organisation_id
    assigned_role = UserRole.VIEWER

    if org_id:
        organisation = db.query(Organisation).filter(
            Organisation.id == org_id,
            Organisation.is_active == True
        ).first()
        if not organisation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organisation not found or inactive"
            )
    elif user_data.organisation_name:
        new_org = Organisation(name=user_data.organisation_name)
        db.add(new_org)
        db.flush()
        org_id = new_org.id
        assigned_role = UserRole.OWNER

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        organisation_id=org_id,
        role=assigned_role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    default_permissions = [
        UserPermission(user_id=user.id, module="projects", can_read=True, can_write=False),
        UserPermission(user_id=user.id, module="documents", can_read=True),
        UserPermission(user_id=user.id, module="assets", can_read=True),
    ]
    db.add_all(default_permissions)
    db.commit()

    audit = AuditLogger(db, user)
    audit.log_create("user", str(user.id), {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "organisation_id": str(user.organisation_id) if user.organisation_id else None
    })

    return user


@app.get("/api/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        "organisation_id": str(current_user.organisation_id) if current_user.organisation_id else None
    }


@app.patch("/api/users/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_data.new_password:
        if not user_data.current_password:
            raise HTTPException(status_code=400, detail="current_password is required to set a new password")
        if not verify_password(user_data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = get_password_hash(user_data.new_password)

    if user_data.first_name is not None:
        current_user.first_name = user_data.first_name
    if user_data.last_name is not None:
        current_user.last_name = user_data.last_name

    db.commit()
    db.refresh(current_user)

    audit = AuditLogger(db, current_user)
    audit.log_update("user", str(current_user.id), {}, {"first_name": current_user.first_name, "last_name": current_user.last_name})

    return current_user


@app.post("/api/ai/assist")
async def ai_assist(
    body: dict,
    current_user: User = Depends(get_current_user)
):
    from lib.ai_engine import ai_engine
    prompt = body.get("prompt", "").strip()
    context_type = body.get("context_type", "engineering_assistant")
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")
    try:
        result = await ai_engine.generate(prompt, template_name=context_type)
        return {"result": result}
    except Exception as e:
        logging.warning(f"AI assist failed: {e}")
        raise HTTPException(status_code=503, detail="AI assistant is unavailable. Please configure an AI provider API key.")


@app.get("/api/projects/{project_id}/versions")
async def get_project_versions(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    versions = db.query(ProjectVersion).filter(
        ProjectVersion.project_id == project_id
    ).order_by(ProjectVersion.created_at.desc()).all()

    return [
        {
            "id": str(v.id),
            "project_id": str(v.project_id),
            "version_number": v.version_number,
            "data": v.snapshot,
            "created_at": v.created_at.isoformat()
        }
        for v in versions
    ]


@app.get("/api/projects", response_model=list[ProjectResponse])
async def get_projects(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Project).filter(
        Project.organisation_id == current_user.organisation_id,
        Project.is_archived == False
    ).order_by(Project.updated_at.desc())

    total = query.count()
    projects = query.offset(skip).limit(limit).all()

    response.headers["X-Total-Count"] = str(total)
    return projects


@app.post("/api/projects", response_model=ProjectResponse, status_code=201)
async def create_project(project_data: ProjectCreate, current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):

    project = Project(
        organisation_id=current_user.organisation_id,
        created_by=current_user.id,
        name=project_data.name,
        description=project_data.description,
        project_number=project_data.project_number,
        client_name=project_data.client_name,
        country_code=project_data.country_code,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        budget=project_data.budget
    )

    if project_data.latitude is not None:
        project.latitude = project_data.latitude
    if project_data.longitude is not None:
        project.longitude = project_data.longitude

    db.add(project)
    db.flush()

    initial_version = ProjectVersion(
        project_id=project.id,
        version_number=1,
        name="Initial Version",
        description="Project created",
        snapshot={
            "name": project.name,
            "description": project.description,
            "status": project.status
        },
        created_by=current_user.id
    )
    db.add(initial_version)
    db.commit()

    audit = AuditLogger(db, current_user)
    audit.log_create("project", str(project.id), project_data.dict())

    return project


@app.get("/api/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    audit = AuditLogger(db, current_user)
    audit.log_access("project", project_id)

    return project


@app.put("/api/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project_data: ProjectUpdate,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_values = {
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "budget": float(project.budget) if project.budget else None
    }

    for field, value in project_data.dict(exclude_unset=True).items():
        if field == 'latitude' or field == 'longitude':
            continue
        setattr(project, field, value)

    if project_data.latitude is not None:
        project.latitude = project_data.latitude
    if project_data.longitude is not None:
        project.longitude = project_data.longitude

    last_version = db.query(ProjectVersion).filter(
        ProjectVersion.project_id == project.id
    ).order_by(ProjectVersion.version_number.desc()).first()

    next_num = (last_version.version_number + 1) if last_version else 2
    new_version = ProjectVersion(
        project_id=project.id,
        version_number=next_num,
        name=f"Version {next_num}",
        snapshot=old_values,
        created_by=current_user.id
    )
    db.add(new_version)
    db.commit()

    audit = AuditLogger(db, current_user)
    audit.log_update("project", project_id, old_values, project_data.dict(exclude_unset=True))

    return project


@app.delete("/api/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_archived = True
    db.commit()

    audit = AuditLogger(db, current_user)
    audit.log_delete("project", project_id, {"name": project.name})


# ------------------------------
# Dashboard / Stats Endpoint
# ------------------------------
@app.get("/api/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organisation_id
    
    total_projects = db.query(func.count(Project.id)).filter(
        Project.organisation_id == org_id,
        Project.is_archived == False
    ).scalar() or 0
    
    active_projects = db.query(func.count(Project.id)).filter(
        Project.organisation_id == org_id,
        Project.is_archived == False,
        Project.status == 'active'
    ).scalar() or 0
    
    total_budget = db.query(func.coalesce(func.sum(Project.budget), 0)).filter(
        Project.organisation_id == org_id,
        Project.is_archived == False
    ).scalar() or 0
    
    recent_activity_count = db.query(func.count(ProjectComment.id)).filter(
        ProjectComment.project_id.in_(
            db.query(Project.id).filter(
                Project.organisation_id == org_id,
                Project.is_archived == False
            )
        )
    ).scalar() or 0
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_budget": float(total_budget),
        "recent_activity_count": recent_activity_count,
        "status_breakdown": {
            "draft": db.query(func.count(Project.id)).filter(
                Project.organisation_id == org_id,
                Project.status == 'draft',
                Project.is_archived == False
            ).scalar() or 0,
            "active": active_projects,
            "completed": db.query(func.count(Project.id)).filter(
                Project.organisation_id == org_id,
                Project.status == 'completed',
                Project.is_archived == False
            ).scalar() or 0,
        },
        "cost_breakdown": _build_cost_breakdown(db, org_id),
        "trade_breakdown": _build_trade_breakdown(db, org_id),
        "project_progress": _build_project_progress(db, org_id),
    }


def _build_cost_breakdown(db: Session, org_id):
    from datetime import datetime, timedelta
    months = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        d = now - timedelta(days=30 * i)
        label = d.strftime("%b")
        budget_sum = db.query(func.coalesce(func.sum(Project.budget), 0)).filter(
            Project.organisation_id == org_id,
            Project.is_archived == False,
            func.extract('year', Project.created_at) == d.year,
            func.extract('month', Project.created_at) == d.month,
        ).scalar() or 0
        months.append({"month": label, "actual": float(budget_sum) * 0.92, "budget": float(budget_sum)})
    return months


def _build_trade_breakdown(db: Session, org_id):
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    categories = db.query(
        Material.category,
        func.count(Material.id).label('count')
    ).filter(
        Material.organisation_id == org_id,
        Material.is_archived == False
    ).group_by(Material.category).limit(5).all()
    if not categories:
        return [
            {"name": "Civil", "value": 35, "color": "#3b82f6"},
            {"name": "Structural", "value": 25, "color": "#10b981"},
            {"name": "Mechanical", "value": 15, "color": "#f59e0b"},
            {"name": "Electrical", "value": 12, "color": "#ef4444"},
            {"name": "Finishes", "value": 13, "color": "#8b5cf6"},
        ]
    total = sum(c.count for c in categories) or 1
    return [
        {"name": c.category, "value": round(c.count / total * 100), "color": colors[i % len(colors)]}
        for i, c in enumerate(categories)
    ]


def _build_project_progress(db: Session, org_id):
    stages = [
        ("Design", "design"),
        ("Procurement", "procurement"),
        ("Construction", "construction"),
        ("Testing", "testing"),
    ]
    result = []
    for label, status in stages:
        completed = db.query(func.count(Project.id)).filter(
            Project.organisation_id == org_id,
            Project.status == status,
            Project.is_archived == False
        ).scalar() or 0
        result.append({"name": label, "completed": min(completed * 25, 100), "total": 100})
    return result


# ------------------------------
# Materials
# ------------------------------
@app.get("/api/materials")
async def get_materials(
    response: Response,
    skip: int = 0, limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(Material).filter(
        Material.organisation_id == current_user.organisation_id,
        Material.is_archived == False
    ).offset(skip).limit(limit).all()
    total = db.query(func.count(Material.id)).filter(
        Material.organisation_id == current_user.organisation_id,
        Material.is_archived == False
    ).scalar() or 0
    result = [
        {
            "id": str(m.id), "name": m.name, "category": m.category,
            "unit": m.unit, "unit_cost": float(m.unit_cost),
            "supplier": m.supplier, "grade": m.grade,
            "carbon_footprint": float(m.carbon_footprint) if m.carbon_footprint else None,
            "availability": m.availability,
        }
        for m in items
    ]
    response.headers["X-Total-Count"] = str(total)
    return result


@app.post("/api/materials", status_code=201)
async def create_material(
    data: MaterialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = Material(
        organisation_id=current_user.organisation_id,
        name=data.name, category=data.category,
        unit=data.unit, unit_cost=data.unit_cost,
        supplier=data.supplier, grade=data.grade,
        carbon_footprint=data.carbon_footprint,
        availability=data.availability or "in_stock",
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return _material_dict(material)


def _material_dict(m: Material) -> dict:
    return {
        "id": str(m.id), "name": m.name, "category": m.category,
        "unit": m.unit, "unit_cost": float(m.unit_cost),
        "supplier": m.supplier, "grade": m.grade,
        "carbon_footprint": float(m.carbon_footprint) if m.carbon_footprint else None,
        "availability": m.availability,
    }


@app.get("/api/materials/{material_id}")
async def get_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.organisation_id == current_user.organisation_id,
        Material.is_archived == False
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return _material_dict(material)


@app.put("/api/materials/{material_id}")
async def update_material(
    material_id: str,
    data: MaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.organisation_id == current_user.organisation_id,
        Material.is_archived == False
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return _material_dict(material)


@app.delete("/api/materials/{material_id}", status_code=204)
async def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.organisation_id == current_user.organisation_id,
        Material.is_archived == False
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    material.is_archived = True
    db.commit()


@app.get("/api/materials/prices/live")
async def get_live_material_prices(
    current_user: User = Depends(get_current_user),
):
    """Simulated real-time supplier price feed with market fluctuations."""
    import random
    BASE = {
        "conc_20mpa":        {"name": "Concrete 20 MPa",        "base": 320.0,  "unit": "m³"},
        "conc_25mpa":        {"name": "Concrete 25 MPa",        "base": 345.0,  "unit": "m³"},
        "conc_30mpa":        {"name": "Concrete 30 MPa",        "base": 375.0,  "unit": "m³"},
        "steel_rebar_16mm":  {"name": "Reinforcing Steel 16mm", "base": 3.20,   "unit": "kg"},
        "timber_pine_rg15":  {"name": "Pine Radiata RG15",      "base": 1850.0, "unit": "m³"},
        "aggregate_gap20":   {"name": "Gap 20 Basecourse",      "base": 42.0,   "unit": "tonne"},
    }
    prices = {}
    for mat_id, info in BASE.items():
        pct = round(random.uniform(-0.08, 0.12), 4)
        prices[mat_id] = {
            "name":       info["name"],
            "unit":       info["unit"],
            "unit_cost":  round(info["base"] * (1 + pct), 2),
            "change_pct": round(pct * 100, 1),
            "direction":  "up" if pct >= 0 else "down",
        }
    return {
        "prices":    prices,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source":    "NZ supplier price feed (simulated)",
    }


# ------------------------------
# Schedule tasks
# ------------------------------
@app.get("/api/projects/{project_id}/tasks")
async def get_tasks(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    tasks = db.query(ScheduleTask).filter(ScheduleTask.project_id == project_id).order_by(ScheduleTask.start_date).all()
    return [
        {
            "id": str(t.id), "name": t.name,
            "start_date": str(t.start_date), "end_date": str(t.end_date),
            "duration": t.duration, "progress": t.progress,
            "status": t.status, "dependencies": t.dependencies or [],
            "assignee": t.assignee,
        }
        for t in tasks
    ]


@app.post("/api/projects/{project_id}/tasks", status_code=201)
async def create_task(
    project_id: str, data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    task = ScheduleTask(
        project_id=project_id,
        organisation_id=current_user.organisation_id,
        name=data.name,
        start_date=data.start_date, end_date=data.end_date,
        duration=data.duration, progress=data.progress or 0,
        status=data.status or "not_started",
        dependencies=data.dependencies or [],
        assignee=data.assignee,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_dict(task)


def _task_dict(t: ScheduleTask) -> dict:
    return {
        "id": str(t.id), "name": t.name,
        "start_date": str(t.start_date), "end_date": str(t.end_date),
        "duration": t.duration, "progress": t.progress,
        "status": t.status, "dependencies": t.dependencies or [],
        "assignee": t.assignee,
    }


@app.get("/api/projects/{project_id}/tasks/{task_id}")
async def get_task(
    project_id: str, task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    task = db.query(ScheduleTask).filter(
        ScheduleTask.id == task_id,
        ScheduleTask.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_dict(task)


@app.put("/api/projects/{project_id}/tasks/{task_id}")
async def update_task(
    project_id: str, task_id: str, data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    task = db.query(ScheduleTask).filter(
        ScheduleTask.id == task_id,
        ScheduleTask.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return _task_dict(task)


@app.delete("/api/projects/{project_id}/tasks/{task_id}", status_code=204)
async def delete_task(
    project_id: str, task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    task = db.query(ScheduleTask).filter(
        ScheduleTask.id == task_id,
        ScheduleTask.project_id == project_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


# ------------------------------
# Estimate items
# ------------------------------
@app.get("/api/projects/{project_id}/estimates")
async def get_estimates(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    items = db.query(EstimateItem).filter(EstimateItem.project_id == project_id).all()
    return [
        {
            "id": str(i.id), "description": i.description,
            "quantity": float(i.quantity), "unit": i.unit,
            "rate": float(i.rate), "amount": float(i.amount),
            "category": i.category,
        }
        for i in items
    ]


@app.post("/api/projects/{project_id}/estimates", status_code=201)
async def create_estimate_item(
    project_id: str, data: EstimateItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    qty = float(data.quantity)
    rate = float(data.rate)
    item = EstimateItem(
        project_id=project_id,
        organisation_id=current_user.organisation_id,
        description=data.description,
        quantity=qty, unit=data.unit,
        rate=rate, amount=round(qty * rate, 2),
        category=data.category,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _estimate_dict(item)


def _estimate_dict(i: EstimateItem) -> dict:
    return {
        "id": str(i.id), "description": i.description,
        "quantity": float(i.quantity), "unit": i.unit,
        "rate": float(i.rate), "amount": float(i.amount),
        "category": i.category,
    }


@app.get("/api/projects/{project_id}/estimates/{item_id}")
async def get_estimate_item(
    project_id: str, item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    item = db.query(EstimateItem).filter(
        EstimateItem.id == item_id,
        EstimateItem.project_id == project_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Estimate item not found")
    return _estimate_dict(item)


@app.put("/api/projects/{project_id}/estimates/{item_id}")
async def update_estimate_item(
    project_id: str, item_id: str, data: EstimateItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    item = db.query(EstimateItem).filter(
        EstimateItem.id == item_id,
        EstimateItem.project_id == project_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Estimate item not found")
    updates = data.dict(exclude_unset=True)
    for field, value in updates.items():
        setattr(item, field, value)
    qty = float(item.quantity)
    rate = float(item.rate)
    item.amount = round(qty * rate, 2)
    db.commit()
    db.refresh(item)
    return _estimate_dict(item)


@app.delete("/api/projects/{project_id}/estimates/{item_id}", status_code=204)
async def delete_estimate_item(
    project_id: str, item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    item = db.query(EstimateItem).filter(
        EstimateItem.id == item_id,
        EstimateItem.project_id == project_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Estimate item not found")
    db.delete(item)
    db.commit()


# ------------------------------
# Purchase orders
# ------------------------------
@app.get("/api/procurement/purchase-orders")
async def get_purchase_orders(
    skip: int = 0, limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(PurchaseOrder).filter(
        PurchaseOrder.organisation_id == current_user.organisation_id
    ).order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": str(p.id), "po_number": p.po_number,
            "project_id": str(p.project_id), "supplier_name": p.supplier_name,
            "status": p.status, "total_value": float(p.total_value),
            "line_items": p.line_items or [],
            "created_at": p.created_at.isoformat(),
        }
        for p in items
    ]


@app.post("/api/procurement/purchase-orders", status_code=201)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == str(data.project_id),
        Project.organisation_id == current_user.organisation_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    po = PurchaseOrder(
        project_id=str(data.project_id),
        organisation_id=current_user.organisation_id,
        po_number=data.po_number,
        supplier_name=data.supplier_name,
        status=data.status or "draft",
        total_value=data.total_value or 0,
        line_items=data.line_items or [],
        created_by=current_user.id,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return _po_dict(po)


def _po_dict(p: PurchaseOrder) -> dict:
    return {
        "id": str(p.id), "po_number": p.po_number,
        "project_id": str(p.project_id), "supplier_name": p.supplier_name,
        "status": p.status, "total_value": float(p.total_value),
        "line_items": p.line_items or [],
        "created_at": p.created_at.isoformat(),
    }


@app.get("/api/procurement/purchase-orders/{po_id}")
async def get_purchase_order(
    po_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.organisation_id == current_user.organisation_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return _po_dict(po)


@app.put("/api/procurement/purchase-orders/{po_id}")
async def update_purchase_order(
    po_id: str, data: PurchaseOrderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.organisation_id == current_user.organisation_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(po, field, value)
    db.commit()
    db.refresh(po)
    return _po_dict(po)


@app.delete("/api/procurement/purchase-orders/{po_id}", status_code=204)
async def delete_purchase_order(
    po_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.organisation_id == current_user.organisation_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    db.delete(po)
    db.commit()


# ------------------------------
# Helper
# ------------------------------
def _assert_project_access(project_id: str, current_user: User, db: Session) -> None:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")


# ------------------------------
# Designs
# ------------------------------
def _design_dict(d: Design) -> dict:
    return {
        "id": str(d.id), "project_id": str(d.project_id),
        "name": d.name, "type": d.type, "status": d.status,
        "parameters": d.parameters,
        "score": float(d.score) if d.score else None,
        "cost_estimate": float(d.cost_estimate) if d.cost_estimate else None,
        "structural_rating": d.structural_rating,
        "compliance_status": d.compliance_status,
        "drawing_data": d.drawing_data,
        "created_at": d.created_at.isoformat(),
        "updated_at": d.updated_at.isoformat(),
    }


@app.get("/api/projects/{project_id}/designs")
async def get_designs(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    designs = db.query(Design).filter(Design.project_id == project_id).order_by(Design.created_at.desc()).all()
    return [_design_dict(d) for d in designs]


@app.post("/api/projects/{project_id}/designs", status_code=201)
async def create_design(
    project_id: str, data: DesignCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    design = Design(
        project_id=project_id,
        name=data.name, type=data.type,
        parameters=data.parameters,
        status=data.status or "draft",
        cost_estimate=data.cost_estimate,
        structural_rating=data.structural_rating,
        drawing_data=data.drawing_data,
        created_by=current_user.id,
    )
    db.add(design)
    db.commit()
    db.refresh(design)
    return _design_dict(design)


@app.get("/api/projects/{project_id}/designs/{design_id}")
async def get_design(
    project_id: str, design_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    design = db.query(Design).filter(Design.id == design_id, Design.project_id == project_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return _design_dict(design)


@app.put("/api/projects/{project_id}/designs/{design_id}")
async def update_design(
    project_id: str, design_id: str, data: DesignUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    design = db.query(Design).filter(Design.id == design_id, Design.project_id == project_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(design, field, value)
    db.commit()
    db.refresh(design)
    return _design_dict(design)


@app.delete("/api/projects/{project_id}/designs/{design_id}", status_code=204)
async def delete_design(
    project_id: str, design_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    design = db.query(Design).filter(Design.id == design_id, Design.project_id == project_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    db.delete(design)
    db.commit()


# Design alternatives

def _alt_dict(a: DesignAlternative) -> dict:
    return {
        "id": str(a.id), "design_id": str(a.design_id),
        "name": a.name, "variant": a.variant,
        "parameters": a.parameters,
        "score": float(a.score) if a.score else None,
        "cost_estimate": float(a.cost_estimate) if a.cost_estimate else None,
        "structural_rating": a.structural_rating,
        "compliance_status": a.compliance_status,
        "is_selected": a.is_selected,
        "created_at": a.created_at.isoformat(),
    }


@app.get("/api/projects/{project_id}/designs/{design_id}/alternatives")
async def get_design_alternatives(
    project_id: str, design_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    alts = db.query(DesignAlternative).filter(DesignAlternative.design_id == design_id).all()
    return [_alt_dict(a) for a in alts]


@app.post("/api/projects/{project_id}/designs/{design_id}/alternatives", status_code=201)
async def create_design_alternative(
    project_id: str, design_id: str, data: DesignAlternativeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    design = db.query(Design).filter(Design.id == design_id, Design.project_id == project_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    alt = DesignAlternative(
        design_id=design_id,
        name=data.name, variant=data.variant,
        parameters=data.parameters,
        cost_estimate=data.cost_estimate,
        structural_rating=data.structural_rating,
    )
    db.add(alt)
    db.commit()
    db.refresh(alt)
    return _alt_dict(alt)


@app.delete("/api/projects/{project_id}/designs/{design_id}/alternatives/{alt_id}", status_code=204)
async def delete_design_alternative(
    project_id: str, design_id: str, alt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _assert_project_access(project_id, current_user, db)
    alt = db.query(DesignAlternative).filter(
        DesignAlternative.id == alt_id,
        DesignAlternative.design_id == design_id
    ).first()
    if not alt:
        raise HTTPException(status_code=404, detail="Design alternative not found")
    db.delete(alt)
    db.commit()


# ------------------------------
# Bills of materials
# ------------------------------
@app.get("/api/procurement/boms")
async def get_boms(
    skip: int = 0, limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(BillOfMaterials).filter(
        BillOfMaterials.organisation_id == current_user.organisation_id
    ).order_by(BillOfMaterials.created_at.desc()).offset(skip).limit(limit).all()
    return [_bom_dict(b) for b in items]


def _bom_dict(b: BillOfMaterials) -> dict:
    return {
        "id": str(b.id), "title": b.title,
        "project_id": str(b.project_id),
        "line_items": b.line_items or [],
        "total_value": float(b.total_value),
        "created_at": b.created_at.isoformat(),
    }


@app.post("/api/procurement/boms", status_code=201)
async def create_bom_from_estimate(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project_id = data.get("project_id")
    title = data.get("title")
    if not project_id or not title:
        raise HTTPException(status_code=422, detail="project_id and title are required")

    project = db.query(Project).filter(
        Project.id == str(project_id),
        Project.organisation_id == current_user.organisation_id,
        Project.is_archived == False,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    estimate_items = db.query(EstimateItem).filter(
        EstimateItem.project_id == str(project_id)
    ).all()

    line_items = [
        {
            "description": item.description,
            "quantity": float(item.quantity),
            "unit": item.unit,
            "unit_price": float(item.rate),
            "total": float(item.amount),
            "category": item.category or "",
        }
        for item in estimate_items
    ]
    total = sum(float(item.amount) for item in estimate_items)

    bom = BillOfMaterials(
        project_id=str(project_id),
        organisation_id=current_user.organisation_id,
        title=str(title),
        line_items=line_items,
        total_value=total,
    )
    db.add(bom)
    db.commit()
    db.refresh(bom)
    return _bom_dict(bom)


@app.post("/api/procurement/boms/{bom_id}/create-po", status_code=201)
async def create_po_from_bom(
    bom_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bom = db.query(BillOfMaterials).filter(
        BillOfMaterials.id == bom_id,
        BillOfMaterials.organisation_id == current_user.organisation_id
    ).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    supplier_name = data.get("supplier_name", "").strip()
    if not supplier_name:
        raise HTTPException(status_code=422, detail="supplier_name is required")

    from datetime import datetime as _dt
    po_number = data.get("po_number") or f"PO-{_dt.utcnow().strftime('%Y%m%d%H%M')}"

    po = PurchaseOrder(
        project_id=str(bom.project_id),
        organisation_id=current_user.organisation_id,
        po_number=str(po_number),
        supplier_name=supplier_name,
        status="draft",
        total_value=float(bom.total_value) if bom.total_value else 0,
        line_items=bom.line_items or [],
        created_by=current_user.id,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return _po_dict(po)


# ------------------------------
# Reports
# ------------------------------
REPORT_TEMPLATES = [
    {
        "template_id": "feasibility_standard",
        "name": "Standard Feasibility Report",
        "report_type": "feasibility",
        "version": "1.1.0",
        "sections": [
            {"section_id": "executive_summary",    "title": "Executive Summary",              "order": 1,  "required": True},
            {"section_id": "project_overview",     "title": "Project Overview",               "order": 2,  "required": True},
            {"section_id": "site_assessment",      "title": "Site Assessment",                "order": 3,  "required": False},
            {"section_id": "geotechnical_analysis","title": "Geotechnical Analysis",          "order": 4,  "required": False},
            {"section_id": "environmental_impact", "title": "Environmental Impact Assessment","order": 5,  "required": False},
            {"section_id": "cost_analysis",        "title": "Cost Analysis",                  "order": 6,  "required": False},
            {"section_id": "schedule_analysis",    "title": "Schedule Analysis",              "order": 7,  "required": False},
            {"section_id": "risk_assessment",      "title": "Risk Assessment",                "order": 8,  "required": False},
            {"section_id": "recommendations",      "title": "Recommendations",               "order": 9,  "required": True},
            {"section_id": "conclusion",           "title": "Conclusion",                    "order": 10, "required": True},
        ],
    },
    {
        "template_id": "cost_estimate_standard",
        "name": "Standard Cost Estimate Report",
        "report_type": "cost_estimate",
        "version": "1.1.0",
        "sections": [
            {"section_id": "summary",             "title": "Cost Summary",            "order": 1, "required": True},
            {"section_id": "assumptions",         "title": "Estimation Assumptions",  "order": 2, "required": True},
            {"section_id": "materials_breakdown", "title": "Materials Breakdown",     "order": 3, "required": False},
            {"section_id": "labour_breakdown",    "title": "Labour Breakdown",        "order": 4, "required": False},
            {"section_id": "plant_equipment",     "title": "Plant & Equipment",       "order": 5, "required": False},
            {"section_id": "overheads",           "title": "Overheads & Margin",      "order": 6, "required": False},
            {"section_id": "contingency",         "title": "Contingency Allowance",   "order": 7, "required": False},
            {"section_id": "total_cost",          "title": "Total Project Cost",      "order": 8, "required": True},
        ],
    },
    {
        "template_id": "tender_standard",
        "name": "Standard Tender Documentation",
        "report_type": "tender_documentation",
        "version": "1.1.0",
        "sections": [
            {"section_id": "invitation",             "title": "Invitation to Tender",     "order": 1, "required": True},
            {"section_id": "scope",                  "title": "Scope of Works",            "order": 2, "required": True},
            {"section_id": "specifications",         "title": "Technical Specifications",  "order": 3, "required": False},
            {"section_id": "pricing_schedule",       "title": "Pricing Schedule",          "order": 4, "required": False},
            {"section_id": "conditions",             "title": "Contract Conditions",       "order": 5, "required": False},
            {"section_id": "submission_requirements","title": "Submission Requirements",   "order": 6, "required": True},
        ],
    },
    {
        "template_id": "risk_assessment_standard",
        "name": "Risk Assessment Report",
        "report_type": "risk_assessment",
        "version": "1.1.0",
        "sections": [
            {"section_id": "risk_register", "title": "Risk Register",          "order": 1, "required": True},
            {"section_id": "mitigation",    "title": "Mitigation Strategies",  "order": 2, "required": True},
            {"section_id": "residual_risk", "title": "Residual Risk Summary",  "order": 3, "required": True},
        ],
    },
    {
        "template_id": "compliance_standard",
        "name": "Regulatory Compliance Report",
        "report_type": "compliance",
        "version": "1.1.0",
        "sections": [
            {"section_id": "regulatory_overview","title": "Regulatory Framework Overview","order": 1, "required": False},
            {"section_id": "compliance_checklist","title": "Compliance Checklist",        "order": 2, "required": True},
            {"section_id": "code_adherence",     "title": "Building Code Adherence",     "order": 3, "required": False},
            {"section_id": "certifications",     "title": "Required Certifications",     "order": 4, "required": False},
            {"section_id": "approval_pathway",   "title": "Approval Pathway",            "order": 5, "required": False},
        ],
    },
    {
        "template_id": "trade_breakdown_standard",
        "name": "Trade Breakdown Report",
        "report_type": "trade_breakdown",
        "version": "1.1.0",
        "sections": [
            {"section_id": "summary",      "title": "Trade Summary",      "order": 1,  "required": True},
            {"section_id": "civil",        "title": "Civil Works",        "order": 2,  "required": False},
            {"section_id": "structural",   "title": "Structural Works",   "order": 3,  "required": False},
            {"section_id": "architectural","title": "Architectural Works","order": 4,  "required": False},
            {"section_id": "mechanical",   "title": "Mechanical Works",   "order": 5,  "required": False},
            {"section_id": "electrical",   "title": "Electrical Works",   "order": 6,  "required": False},
            {"section_id": "plumbing",     "title": "Plumbing & Drainage","order": 7,  "required": False},
            {"section_id": "external",     "title": "External Works",     "order": 8,  "required": False},
            {"section_id": "labour_summary","title": "Labour Summary",    "order": 9,  "required": False},
            {"section_id": "programme",    "title": "Trade Programme",    "order": 10, "required": True},
        ],
    },
]

_TEMPLATE_MAP = {t["template_id"]: t for t in REPORT_TEMPLATES}


def _build_section_content(
    section_id: str,
    project,
    estimate_items: list,
    schedule_tasks: list,
) -> dict:
    """Return a typed content dict for a single report section."""

    # ── helpers ─────────────────────────────────────────────────────────────
    def _est_rows(items):
        return [
            {
                "description": i.description,
                "quantity": float(i.quantity),
                "unit": i.unit,
                "rate": float(i.rate),
                "amount": float(i.amount),
                "category": i.category or "",
            }
            for i in items
        ]

    def _est_by_category(items):
        cats: dict = {}
        for i in items:
            cat = (i.category or "General").title()
            cats.setdefault(cat, {"subtotal": 0.0, "items": []})
            cats[cat]["items"].append(_est_rows([i])[0])
            cats[cat]["subtotal"] = round(cats[cat]["subtotal"] + float(i.amount), 2)
        return cats

    def _filter_cat(keywords: list):
        kw = [k.lower() for k in keywords]
        return [i for i in estimate_items if any(k in (i.category or "").lower() for k in kw)]

    total_cost = sum(float(i.amount) for i in estimate_items)
    pname = project.name if project else "This Project"
    client = project.client_name or "—" if project else "—"

    # ── section mapping ──────────────────────────────────────────────────────
    if section_id == "executive_summary":
        return {
            "type": "text",
            "paragraphs": [
                f"This report provides a comprehensive assessment of {pname}.",
                f"The project is currently at status '{(project.status or 'draft').replace('_', ' ')}' "
                f"with a total estimated construction cost of ${total_cost:,.2f} NZD." if total_cost else
                f"The project is currently at status '{(project.status or 'draft').replace('_', ' ')}'.",
                "This document has been prepared for review and approval by authorised personnel.",
            ],
        }

    if section_id == "project_overview":
        return {
            "type": "project_info",
            "fields": [
                {"label": "Project Name",    "value": project.name if project else "—"},
                {"label": "Project Number",  "value": project.project_number or "—" if project else "—"},
                {"label": "Client",          "value": client},
                {"label": "Status",          "value": (project.status or "—").replace("_", " ").title() if project else "—"},
                {"label": "Start Date",      "value": str(project.start_date) if project and project.start_date else "—"},
                {"label": "End Date",        "value": str(project.end_date) if project and project.end_date else "—"},
                {"label": "Budget",          "value": f"${float(project.budget):,.2f} NZD" if project and project.budget else "—"},
                {"label": "Description",     "value": project.description or "—" if project else "—"},
            ],
        }

    if section_id == "site_assessment":
        return {
            "type": "project_info",
            "fields": [
                {"label": "Country", "value": project.country_code or "—" if project else "—"},
                {"label": "Latitude",  "value": str(project.latitude)  if project and project.latitude  else "—"},
                {"label": "Longitude", "value": str(project.longitude) if project and project.longitude else "—"},
            ],
            "note": "Detailed geospatial site assessment data should be attached as a separate survey report.",
        }

    if section_id in ("geotechnical_analysis", "environmental_impact"):
        label = "Geotechnical" if section_id == "geotechnical_analysis" else "Environmental Impact"
        return {
            "type": "text",
            "paragraphs": [
                f"{label} assessment for {pname}.",
                "A detailed investigation report should be referenced here. "
                "Key findings, soil classifications, bearing capacity, and any contamination data "
                "should be summarised in this section.",
            ],
        }

    if section_id in ("summary", "cost_analysis"):
        by_cat = _est_by_category(estimate_items)
        return {
            "type": "cost_summary",
            "total": round(total_cost, 2),
            "item_count": len(estimate_items),
            "by_category": by_cat,
            "items": _est_rows(estimate_items),
        }

    if section_id == "materials_breakdown":
        items = _filter_cat(["material", "materials", "supply", "supplies", "hardware", "concrete", "steel"])
        if not items:
            items = estimate_items
        return {"type": "estimate_table", "items": _est_rows(items), "total": round(sum(float(i.amount) for i in items), 2)}

    if section_id == "labour_breakdown":
        items = _filter_cat(["labour", "labor", "subcontract", "install"])
        return {"type": "estimate_table", "items": _est_rows(items), "total": round(sum(float(i.amount) for i in items), 2)}

    if section_id == "plant_equipment":
        items = _filter_cat(["plant", "equipment", "machinery", "hire", "crane"])
        return {"type": "estimate_table", "items": _est_rows(items), "total": round(sum(float(i.amount) for i in items), 2)}

    if section_id == "overheads":
        items = _filter_cat(["overhead", "margin", "profit", "preliminary", "prelim", "management"])
        return {"type": "estimate_table", "items": _est_rows(items), "total": round(sum(float(i.amount) for i in items), 2)}

    if section_id == "contingency":
        contingency_pct = 0.10
        return {
            "type": "text",
            "paragraphs": [
                f"A contingency allowance of {int(contingency_pct * 100)}% has been applied to the base estimate.",
                f"Base estimate: ${total_cost:,.2f} NZD",
                f"Contingency ({int(contingency_pct * 100)}%): ${total_cost * contingency_pct:,.2f} NZD",
                f"Total including contingency: ${total_cost * (1 + contingency_pct):,.2f} NZD",
            ],
        }

    if section_id == "total_cost":
        return {
            "type": "cost_summary",
            "total": round(total_cost, 2),
            "item_count": len(estimate_items),
            "by_category": _est_by_category(estimate_items),
            "items": _est_rows(estimate_items),
        }

    if section_id == "assumptions":
        return {
            "type": "text",
            "paragraphs": [
                "The following assumptions have been made in preparing this cost estimate:",
                "• All rates are in New Zealand Dollars (NZD) and are exclusive of GST unless otherwise stated.",
                "• Unit rates are based on current market conditions and may vary subject to tender.",
                "• Quantities are based on preliminary design drawings and are subject to revision.",
                "• Ground conditions are assumed to be suitable for standard construction methods.",
                "• No allowance has been made for contaminated material removal unless specifically noted.",
            ],
        }

    if section_id in ("schedule_analysis", "programme"):
        tasks = [
            {
                "name": t.name,
                "start_date": str(t.start_date),
                "end_date": str(t.end_date),
                "duration": t.duration,
                "progress": t.progress,
                "status": t.status,
                "assignee": t.assignee or "—",
            }
            for t in schedule_tasks
        ]
        return {"type": "schedule_table", "tasks": tasks}

    if section_id == "risk_assessment":
        return {
            "type": "risk_table",
            "risks": [
                {"id": "R01", "description": "Ground conditions worse than anticipated", "likelihood": "Medium", "consequence": "High",   "rating": "High",   "mitigation": "Detailed geotechnical investigation prior to construction"},
                {"id": "R02", "description": "Material cost escalation",                "likelihood": "Medium", "consequence": "Medium", "rating": "Medium", "mitigation": "Lock in material prices early; include contingency"},
                {"id": "R03", "description": "Programme delays due to weather",         "likelihood": "Medium", "consequence": "Medium", "rating": "Medium", "mitigation": "Build weather delays into programme; monitor forecasts"},
                {"id": "R04", "description": "Utility conflicts during excavation",     "likelihood": "Low",    "consequence": "High",   "rating": "Medium", "mitigation": "Engage utility locators before breaking ground"},
                {"id": "R05", "description": "Resource availability",                   "likelihood": "Low",    "consequence": "Medium", "rating": "Low",    "mitigation": "Early subcontractor engagement and programme planning"},
            ],
        }

    if section_id == "risk_register":
        return {
            "type": "risk_table",
            "risks": [
                {"id": "R01", "description": "Ground conditions worse than anticipated", "likelihood": "Medium", "consequence": "High",   "rating": "High",   "mitigation": "Detailed geotechnical investigation"},
                {"id": "R02", "description": "Material cost escalation",                "likelihood": "Medium", "consequence": "Medium", "rating": "Medium", "mitigation": "Early procurement and contingency allocation"},
                {"id": "R03", "description": "Programme delays",                        "likelihood": "Medium", "consequence": "Medium", "rating": "Medium", "mitigation": "Detailed programme monitoring and float management"},
                {"id": "R04", "description": "Utility strikes",                        "likelihood": "Low",    "consequence": "High",   "rating": "Medium", "mitigation": "Utility location and permit to dig procedures"},
                {"id": "R05", "description": "Resource shortages",                     "likelihood": "Low",    "consequence": "Medium", "rating": "Low",    "mitigation": "Early subcontractor engagement"},
            ],
        }

    if section_id == "mitigation":
        return {
            "type": "text",
            "paragraphs": [
                "The following mitigation strategies have been identified to manage the risks outlined in the Risk Register.",
                "Each mitigation measure will be owned by a nominated team member and tracked throughout the project.",
                "Risk reviews will be conducted at each project milestone to update the register as the project evolves.",
            ],
        }

    if section_id == "residual_risk":
        return {
            "type": "text",
            "paragraphs": [
                "Following implementation of all identified mitigation strategies, the residual risk profile of the project is considered ACCEPTABLE.",
                "The most significant residual risk remains ground conditions, which will be managed through an ongoing monitoring plan.",
                "No risks have been assessed as requiring escalation to executive leadership at this stage.",
            ],
        }

    if section_id == "recommendations":
        return {
            "type": "text",
            "paragraphs": [
                f"Based on the findings of this report, the following recommendations are made for {pname}:",
                "1. Proceed to detailed design with the preferred option, subject to geotechnical confirmation.",
                "2. Engage a quantity surveyor to confirm and refine cost estimates at detailed design stage.",
                "3. Initiate resource consenting process in parallel with detailed design to minimise programme delays.",
                "4. Establish a project governance structure including a project steering group and key stakeholder representatives.",
            ],
        }

    if section_id == "conclusion":
        return {
            "type": "text",
            "paragraphs": [
                f"This report has assessed the feasibility of {pname} from technical, cost, and programme perspectives.",
                "The project is considered technically feasible and commercially viable subject to the recommendations outlined above.",
                "Approval is sought to proceed to the next phase of project development.",
            ],
        }

    if section_id == "invitation":
        return {
            "type": "text",
            "paragraphs": [
                f"{client} invites suitably qualified and experienced contractors to submit a tender for the {pname}.",
                "Tenders must be submitted in accordance with the instructions contained in this tender document.",
                f"All enquiries should be directed to the project team. Site visits can be arranged upon request.",
            ],
        }

    if section_id == "scope":
        return {
            "type": "text",
            "paragraphs": [
                f"The scope of works for {pname} includes:",
                project.description or "Refer to project drawings and specifications for full scope of works.",
                "The Contractor shall supply all labour, materials, plant, and equipment necessary to complete the works.",
            ],
        }

    if section_id in ("specifications", "conditions", "submission_requirements", "pricing_schedule"):
        labels = {
            "specifications":          "Technical Specifications",
            "conditions":              "Contract Conditions",
            "submission_requirements": "Submission Requirements",
            "pricing_schedule":        "Pricing Schedule",
        }
        return {
            "type": "text",
            "paragraphs": [
                f"{labels[section_id]} for {pname}.",
                "This section should be completed with the relevant contract or specification document.",
                "Refer to attached schedules and drawings for detailed requirements.",
            ],
        }

    # Compliance
    if section_id == "regulatory_overview":
        return {
            "type": "text",
            "paragraphs": [
                f"This report assesses compliance of {pname} with applicable New Zealand legislation, standards, and guidelines.",
                "Key regulatory instruments include the Building Act 2004, Resource Management Act 1991, Health and Safety at Work Act 2015, "
                "and the relevant New Zealand Standards (NZS) series.",
            ],
        }

    if section_id == "compliance_checklist":
        return {
            "type": "checklist",
            "items": [
                {"item": "Building consent obtained or applied for",       "status": "pending"},
                {"item": "Resource consent obtained or not required",      "status": "pending"},
                {"item": "Health & Safety plan prepared",                  "status": "pending"},
                {"item": "Engineer to the Contract appointed",             "status": "pending"},
                {"item": "NZS 3404 structural steel compliance confirmed", "status": "pending"},
                {"item": "NZS 3101 concrete compliance confirmed",         "status": "pending"},
                {"item": "Utility notifications submitted",                "status": "pending"},
                {"item": "Environmental management plan prepared",         "status": "pending"},
            ],
        }

    if section_id in ("code_adherence", "certifications", "approval_pathway"):
        return {
            "type": "text",
            "paragraphs": [
                f"This section documents {section_id.replace('_', ' ').title()} requirements for {pname}.",
                "Detailed compliance documentation should be appended to this report.",
            ],
        }

    # Trade breakdown sections
    trade_map = {
        "civil":        ["civil", "earthwork", "drainage", "roading", "pavement"],
        "structural":   ["structural", "concrete", "steel", "foundation", "piling"],
        "architectural":["architectural", "cladding", "roofing", "joinery", "fitout"],
        "mechanical":   ["mechanical", "hvac", "ventilation", "fire", "sprinkler"],
        "electrical":   ["electrical", "lighting", "switchboard", "data", "power"],
        "plumbing":     ["plumbing", "drainage", "sanitary", "water supply"],
        "external":     ["external", "landscaping", "paving", "fencing", "carpark"],
    }

    if section_id in trade_map:
        items = _filter_cat(trade_map[section_id])
        trade_name = section_id.replace("_", " ").title()
        return {
            "type": "estimate_table",
            "label": f"{trade_name} — estimate items matching this trade",
            "items": _est_rows(items),
            "total": round(sum(float(i.amount) for i in items), 2),
        }

    if section_id == "labour_summary":
        items = _filter_cat(["labour", "labor", "subcontract"])
        return {"type": "estimate_table", "items": _est_rows(items), "total": round(sum(float(i.amount) for i in items), 2)}

    if section_id in ("method_statement", "safety_plan", "quality_control", "site_layout", "work_sequence"):
        labels2 = {
            "method_statement": "Method Statement",
            "safety_plan":      "Health & Safety Plan",
            "quality_control":  "Quality Control Measures",
            "site_layout":      "Site Layout Plan",
            "work_sequence":    "Construction Work Sequence",
        }
        return {
            "type": "text",
            "paragraphs": [
                f"{labels2.get(section_id, section_id.replace('_', ' ').title())} for {pname}.",
                "This section should be completed with the relevant method statement, safety plan, or quality document.",
            ],
        }

    # fallback
    return {"type": "text", "paragraphs": [f"Content for section '{section_id}' for {pname}."]}


def _report_dict(r: GeneratedReport, include_content: bool = False) -> dict:
    d = {
        "id": str(r.id),
        "title": r.title,
        "report_type": r.report_type,
        "status": r.status,
        "format": r.format,
        "project_id": str(r.project_id) if r.project_id else None,
        "created_at": r.created_at.isoformat(),
        "updated_at": r.updated_at.isoformat(),
    }
    if include_content:
        d["content"] = r.content or {}
    return d


@app.get("/api/reports/templates")
async def get_report_templates(current_user: User = Depends(get_current_user)):
    return REPORT_TEMPLATES


@app.get("/api/reports")
async def get_reports(
    skip: int = 0, limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(GeneratedReport).filter(
        GeneratedReport.organisation_id == current_user.organisation_id
    ).order_by(GeneratedReport.created_at.desc()).offset(skip).limit(limit).all()

    # Attach project names in one query
    project_ids = list({str(r.project_id) for r in items if r.project_id})
    project_names: dict = {}
    if project_ids:
        projs = db.query(Project.id, Project.name).filter(Project.id.in_(project_ids)).all()
        project_names = {str(p.id): p.name for p in projs}

    return [
        {**_report_dict(r), "project_name": project_names.get(str(r.project_id), "—")}
        for r in items
    ]


@app.get("/api/reports/{report_id}")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.organisation_id == current_user.organisation_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    result = {**_report_dict(r, include_content=True)}
    if r.project_id:
        proj = db.query(Project).filter(Project.id == str(r.project_id)).first()
        result["project_name"] = proj.name if proj else "—"
    return result


@app.post("/api/reports", status_code=201)
async def create_report(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project_id = data.get("project_id")
    template_id = data.get("template_id") or (data.get("content", {}) or {}).get("template_id")
    title = (data.get("title") or "").strip()
    selected_sections: list = data.get("selected_sections") or (data.get("content", {}) or {}).get("sections") or []
    report_type = data.get("report_type", "")

    if not title:
        raise HTTPException(status_code=422, detail="title is required")
    if not project_id:
        raise HTTPException(status_code=422, detail="project_id is required")

    project = db.query(Project).filter(
        Project.id == str(project_id),
        Project.organisation_id == current_user.organisation_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Infer report_type from template if not supplied
    template_meta = _TEMPLATE_MAP.get(template_id or "")
    if not report_type and template_meta:
        report_type = template_meta["report_type"]

    # Pull project data for content population
    estimate_items = db.query(EstimateItem).filter(
        EstimateItem.project_id == str(project_id)
    ).order_by(EstimateItem.created_at).all()

    schedule_tasks = db.query(ScheduleTask).filter(
        ScheduleTask.project_id == str(project_id)
    ).order_by(ScheduleTask.start_date).all()

    # Determine which sections to include
    if not selected_sections and template_meta:
        selected_sections = [s["section_id"] for s in template_meta["sections"]]

    sections_content: dict = {}
    for sid in selected_sections:
        sections_content[sid] = _build_section_content(sid, project, estimate_items, schedule_tasks)

    content = {
        "template_id": template_id,
        "selected_sections": selected_sections,
        "sections": sections_content,
    }

    report = GeneratedReport(
        organisation_id=current_user.organisation_id,
        project_id=str(project_id),
        title=title,
        report_type=report_type,
        status="draft",
        format=data.get("format", "html"),
        content=content,
        created_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    result = {**_report_dict(report, include_content=True), "project_name": project.name}
    return result


@app.delete("/api/reports/{report_id}", status_code=204)
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.organisation_id == current_user.organisation_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(r)
    db.commit()


@app.post("/api/reports/{report_id}/approve", status_code=200)
async def approve_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.organisation_id == current_user.organisation_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if r.status not in ("submitted", "under_review"):
        raise HTTPException(status_code=400, detail=f"Cannot approve a report with status '{r.status}'")
    r.status = "approved"
    db.commit()
    return _report_dict(r)


@app.post("/api/reports/{report_id}/reject", status_code=200)
async def reject_report(
    report_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.organisation_id == current_user.organisation_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if r.status not in ("submitted", "under_review"):
        raise HTTPException(status_code=400, detail=f"Cannot reject a report with status '{r.status}'")
    reason = (data.get("reason") or "").strip()
    content = dict(r.content or {})
    content["rejection_reason"] = reason
    r.content = content
    r.status = "rejected"
    db.commit()
    return _report_dict(r)


@app.patch("/api/reports/{report_id}/status")
async def update_report_status(
    report_id: str, data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.query(GeneratedReport).filter(
        GeneratedReport.id == report_id,
        GeneratedReport.organisation_id == current_user.organisation_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    r.status = data.get("status", r.status)
    db.commit()
    return {"id": str(r.id), "status": r.status}


# ------------------------------
# Digital Twin — sensors & readings
# ------------------------------
def _sensor_dict(s: SensorDefinition) -> dict:
    return {
        "id": str(s.id),
        "label": s.label,
        "unit": s.unit,
        "project_id": str(s.project_id) if s.project_id else None,
        "warning_high": float(s.warning_high) if s.warning_high is not None else None,
        "critical_high": float(s.critical_high) if s.critical_high is not None else None,
        "warning_low": float(s.warning_low) if s.warning_low is not None else None,
        "critical_low": float(s.critical_low) if s.critical_low is not None else None,
        "is_active": s.is_active,
        "created_at": s.created_at.isoformat(),
    }


@app.get("/api/digital-twin/sensors")
async def get_sensors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sensors = db.query(SensorDefinition).filter(
        SensorDefinition.organisation_id == current_user.organisation_id,
        SensorDefinition.is_active == True,
    ).order_by(SensorDefinition.created_at.asc()).all()
    return [_sensor_dict(s) for s in sensors]


@app.post("/api/digital-twin/sensors", status_code=201)
async def create_sensor(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    label = str(data.get("label", "")).strip()
    unit = str(data.get("unit", "")).strip()
    if not label:
        raise HTTPException(status_code=422, detail="label is required")

    project_id = data.get("project_id")
    if project_id:
        proj = db.query(Project).filter(
            Project.id == str(project_id),
            Project.organisation_id == current_user.organisation_id,
        ).first()
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found")

    sensor = SensorDefinition(
        organisation_id=current_user.organisation_id,
        project_id=str(project_id) if project_id else None,
        label=label,
        unit=unit,
        warning_high=data.get("warning_high"),
        critical_high=data.get("critical_high"),
        warning_low=data.get("warning_low"),
        critical_low=data.get("critical_low"),
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    return _sensor_dict(sensor)


@app.delete("/api/digital-twin/sensors/{sensor_id}", status_code=204)
async def delete_sensor(
    sensor_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sensor = db.query(SensorDefinition).filter(
        SensorDefinition.id == sensor_id,
        SensorDefinition.organisation_id == current_user.organisation_id,
    ).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    db.delete(sensor)
    db.commit()


@app.get("/api/digital-twin/sensors/{sensor_id}/readings")
async def get_sensor_readings(
    sensor_id: str,
    limit: int = 60,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sensor = db.query(SensorDefinition).filter(
        SensorDefinition.id == sensor_id,
        SensorDefinition.organisation_id == current_user.organisation_id,
    ).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    readings = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [
        {"id": r.id, "value": float(r.value), "recorded_at": r.recorded_at.isoformat()}
        for r in reversed(readings)
    ]


@app.post("/api/digital-twin/sensors/{sensor_id}/readings", status_code=201)
async def add_sensor_reading(
    sensor_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sensor = db.query(SensorDefinition).filter(
        SensorDefinition.id == sensor_id,
        SensorDefinition.organisation_id == current_user.organisation_id,
    ).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    value = data.get("value")
    if value is None:
        raise HTTPException(status_code=422, detail="value is required")

    recorded_at_raw = data.get("recorded_at")
    if recorded_at_raw:
        from datetime import timezone
        try:
            from datetime import datetime as _dt2
            recorded_at = _dt2.fromisoformat(str(recorded_at_raw).replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid recorded_at format. Use ISO 8601.")
    else:
        from datetime import datetime as _dt2, timezone
        recorded_at = _dt2.now(timezone.utc)

    reading = SensorReading(sensor_id=sensor_id, value=float(value), recorded_at=recorded_at)
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return {"id": reading.id, "value": float(reading.value), "recorded_at": reading.recorded_at.isoformat()}


@app.post("/api/digital-twin/import")
async def import_sensor_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CSV format: sensor_id,value,recorded_at
    recorded_at is optional (ISO 8601). sensor_id must belong to this organisation.
    Returns counts of rows imported and any errors.
    """
    import csv
    import io
    from datetime import datetime as _dt3, timezone as _tz

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only CSV files are accepted")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File must be UTF-8 encoded")

    # Verify org owns all referenced sensors up-front
    org_sensor_ids = {
        str(s.id)
        for s in db.query(SensorDefinition.id).filter(
            SensorDefinition.organisation_id == current_user.organisation_id
        ).all()
    }

    reader = csv.DictReader(io.StringIO(text))
    required_cols = {"sensor_id", "value"}
    if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=422,
            detail=f"CSV must have columns: sensor_id, value (and optionally recorded_at). Found: {reader.fieldnames}"
        )

    imported, errors = 0, []
    for i, row in enumerate(reader, start=2):
        sensor_id = row.get("sensor_id", "").strip()
        raw_value = row.get("value", "").strip()
        raw_ts = row.get("recorded_at", "").strip()

        if sensor_id not in org_sensor_ids:
            errors.append(f"Row {i}: sensor_id '{sensor_id}' not found or not in your organisation")
            continue
        try:
            value = float(raw_value)
        except (ValueError, TypeError):
            errors.append(f"Row {i}: invalid value '{raw_value}'")
            continue

        if raw_ts:
            try:
                recorded_at = _dt3.fromisoformat(raw_ts.replace("Z", "+00:00"))
            except ValueError:
                errors.append(f"Row {i}: invalid recorded_at '{raw_ts}'")
                continue
        else:
            recorded_at = _dt3.now(_tz.utc)

        db.add(SensorReading(sensor_id=sensor_id, value=value, recorded_at=recorded_at))
        imported += 1

    if imported > 0:
        db.commit()

    return {"imported": imported, "errors": errors}


@app.get("/api/activity")
async def get_activity_feed(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from models import AuditLog
    query = db.query(AuditLog).filter(
        AuditLog.organisation_id == current_user.organisation_id
    ).order_by(AuditLog.created_at.desc())

    total = query.count()
    activities = query.offset(skip).limit(limit).all()

    feed = [
        {
            "id": str(activity.id),
            "action": activity.action,
            "entity_type": activity.entity_type,
            "entity_id": str(activity.entity_id) if activity.entity_id else None,
            "user_id": str(activity.user_id) if activity.user_id else None,
            "old_values": activity.old_values,
            "new_values": activity.new_values,
            "created_at": activity.created_at.isoformat() if activity.created_at else None,
            "ip_address": activity.ip_address,
        }
        for activity in activities
    ]

    response.headers["X-Total-Count"] = str(total)
    return feed


# ------------------------------
# Project Attachments
# ------------------------------
@app.get("/api/projects/{project_id}/attachments", response_model=list[AttachmentResponse])
async def get_project_attachments(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    attachments = db.query(ProjectAttachment).filter(
        ProjectAttachment.project_id == project_id,
        ProjectAttachment.is_archived == False
    ).order_by(ProjectAttachment.created_at.desc()).all()
    
    return attachments


@app.post("/api/projects/{project_id}/attachments", response_model=AttachmentResponse, status_code=201)
async def upload_project_attachment(project_id: str, file: UploadFile = File(...), description: Optional[str] = None,
                                   current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    MAX_FILE_SIZE = 100 * 1024 * 1024
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/dxf", "image/vnd.dwg", "application/x-dwf",
        "application/octet-stream",
        "application/ifc", "application/x-step",
        "application/zip", "application/x-zip-compressed",
        "text/plain", "text/csv",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    
    BLOCKED_EXTENSIONS = {"exe", "dll", "bat", "cmd", "ps1", "vbs", "js", "jar", "msi"}
    
    import os
    import hashlib
    from uuid import uuid4
    
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum allowed (100MB)")
    
    filename, file_ext = os.path.splitext(file.filename)
    file_ext = file_ext.lower().lstrip(".")
    
    if file_ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=403, detail="File type is blocked for security reasons")
    
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"File type '{file.content_type}' is not allowed")
    
    stored_filename = f"{uuid4()}.{file_ext}"
    
    # Anti-virus scanning hook point
    
    # Process file stream — calculate hash + detect dangerous content
    file_hash = hashlib.sha256()
    file_size = 0
    
    dangerous_patterns = [
        b'<script', b'javascript:', b'eval(',
        b'<?php', b'<%', b'<%@',
        b'#!/bin/bash', b'#!/usr/bin/env'
    ]

    while chunk := await file.read(8192):
        file_hash.update(chunk)
        file_size += len(chunk)
        chunk_lower = chunk.lower()
        for pattern in dangerous_patterns:
            if pattern in chunk_lower:
                logging.warning(f"Dangerous content detected in upload from user {current_user.id}: {pattern}")
                raise HTTPException(status_code=403, detail="File contains dangerous content")
    
    attachment = ProjectAttachment(
        project_id=project_id,
        uploaded_by=current_user.id,
        filename=stored_filename,
        original_filename=file.filename,
        file_size=file_size,
        mime_type=file.content_type,
        file_hash=file_hash.hexdigest(),
        description=description
    )
    
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads", "attachments")
    os.makedirs(upload_dir, exist_ok=True)
    file.file.seek(0)
    with open(os.path.join(upload_dir, stored_filename), "wb") as out:
        while chunk := file.file.read(8192):
            out.write(chunk)

    audit = AuditLogger(db, current_user)
    audit.log_create("attachment", str(attachment.id), {
        "filename": file.filename,
        "size": file_size,
        "mime_type": file.content_type,
        "project_id": project_id
    })
    
    await manager.broadcast(project_id, {
        "type": "file_uploaded",
        "attachment_id": str(attachment.id),
        "filename": file.filename,
        "user_id": str(current_user.id),
        "user_name": f"{current_user.first_name} {current_user.last_name}"
    })
    
    return attachment


# ------------------------------
# Project Comments
# ------------------------------
@app.get("/api/projects/{project_id}/comments", response_model=list[CommentResponse])
async def get_project_comments(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    comments = db.query(ProjectComment).filter(
        ProjectComment.project_id == project_id,
        ProjectComment.is_archived == False
    ).order_by(ProjectComment.created_at.asc()).all()
    
    return comments


@app.post("/api/projects/{project_id}/comments", response_model=CommentResponse, status_code=201)
async def create_project_comment(project_id: str, comment_data: CommentCreate,
                                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    comment = ProjectComment(
        project_id=project_id,
        user_id=current_user.id,
        parent_id=comment_data.parent_id,
        content=comment_data.content
    )
    
    db.add(comment)
    db.flush()
    
    import re
    mention_pattern = r'@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)'
    mentions = re.findall(mention_pattern, comment_data.content)
    
    mention_users = []
    for mention_name, mentioned_user_id in mentions:
        mentioned_user = db.query(User).filter(
            User.id == mentioned_user_id,
            User.organisation_id == current_user.organisation_id,
            User.is_active == True
        ).first()

        if mentioned_user:
            mention = UserMention(
                comment_id=comment.id,
                mentioned_user_id=mentioned_user_id,
                mentioned_by_user_id=current_user.id,
                project_id=project_id
            )
            db.add(mention)
            mention_users.append(mentioned_user_id)
            
            notification = Notification(
                user_id=mentioned_user_id,
                project_id=project_id,
                notification_type="mention",
                title=f"You were mentioned in a comment",
                content=f"{current_user.first_name} {current_user.last_name} mentioned you in project {project.name}",
                entity_type="comment",
                entity_id=comment.id,
                sender_id=current_user.id
            )
            db.add(notification)
            
            asyncio.create_task(manager.send_notification(mentioned_user_id, {
                "id": str(notification.id),
                "type": "mention",
                "title": notification.title,
                "content": notification.content,
                "project_id": project_id,
                "comment_id": str(comment.id),
                "created_at": datetime.utcnow().isoformat()
            }))
    
    db.commit()
    db.refresh(comment)
    
    audit = AuditLogger(db, current_user)
    audit.log_create("comment", str(comment.id), {
        "project_id": project_id,
        "mentions_count": len(mention_users)
    })
    
    await manager.broadcast(project_id, {
        "type": "comment_created",
        "comment_id": str(comment.id),
        "user_id": str(current_user.id),
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "parent_id": comment.parent_id
    })
    
    return comment


from websocket_manager import ConnectionManager

manager = ConnectionManager()


# ------------------------------
# Notification System
# ------------------------------
@app.get("/api/notifications", response_model=list[NotificationResponse])
async def get_notifications(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    response.headers["X-Total-Count"] = str(total)
    return notifications


@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"status": "success"}


@app.post("/api/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        Notification.is_read: True,
        Notification.read_at: datetime.utcnow()
    })
    db.commit()
    
    return {"status": "success"}


@app.websocket("/api/ws/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, token: str, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        from auth import SECRET_KEY, ALGORITHM
        from jose import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            await websocket.close(code=401)
            return
            
        current_user = db.query(User).filter(User.id == user_id).first()
        if current_user is None or not current_user.is_active:
            await websocket.close(code=401)
            return
    except Exception:
        await websocket.close(code=401)
        return
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organisation_id == current_user.organisation_id
    ).first()
    
    if not project:
        await websocket.close(code=403)
        return

    await manager.connect(websocket, project_id, current_user)
    
    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_message(websocket, project_id, data, current_user, db)
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)


# ==============================================================================
# Compliance, Anomaly Detection & AI Assistant
# ==============================================================================
from compliance import compliance_engine
from anomaly import anomaly_engine
from integrations import integration_system, AI_ENABLED


@app.get("/api/ai/status")
async def ai_status():
    """Returns whether an AI provider is configured and which one."""
    from lib.ai_engine import ai_engine as _ai_engine
    return {
        "ai_enabled": _ai_engine.is_enabled,
        "provider": _ai_engine.provider or None,
        "provider_label": _ai_engine.provider_label if _ai_engine.is_enabled else None,
        "model": _ai_engine.model or None,
        "mode": "ai" if _ai_engine.is_enabled else "rule_based",
        "info": (
            f"AI active via {_ai_engine.provider_label} ({_ai_engine.model})."
            if _ai_engine.is_enabled
            else "Running in rule-based mode. Set AI_PROVIDER + AI_API_KEY in .env to activate."
        ),
    }


@app.post("/api/compliance/check")
async def check_compliance(payload: dict, current_user: User = Depends(get_current_user)):
    """
    Validate design parameters against AS/NZS standards.
    Body: { "design_type": "retaining_wall", "params": { ... } }
    """
    design_type = payload.get("design_type", "")
    params = payload.get("params", {})
    return compliance_engine.check(design_type, params)


@app.get("/api/compliance/design-types")
async def list_design_types():
    return {
        "design_types": [
            {"id": "retaining_wall",   "label": "Retaining Wall",    "standard": "AS 4678-2002"},
            {"id": "strip_foundation", "label": "Strip Foundation",   "standard": "AS 2870-2011"},
            {"id": "box_culvert",      "label": "Box Culvert",        "standard": "AS/NZS 1597.2"},
            {"id": "stormwater_pipe",  "label": "Stormwater Pipe",    "standard": "AS/NZS 3500.3"},
        ]
    }


@app.post("/api/anomaly/analyse")
async def analyse_anomalies(payload: dict, current_user: User = Depends(get_current_user)):
    """
    Detect cost anomalies in line-item unit rates.
    Body: { "rates": { "conc_25mpa": 410.0, "steel_rebar_16mm": 4.80, ... } }
    """
    rates = payload.get("rates", {})
    result = anomaly_engine.analyse(rates)
    anomaly_engine.record_rates(rates)  # feed back into rolling baseline
    return result


@app.post("/api/assistant/ask")
async def ask_assistant(payload: dict, current_user: User = Depends(get_current_user)):
    """
    Engineering Q&A. Rule-based by default; LLM-powered when AI_ENABLED=true.
    Body: { "question": "...", "project_id": "..." (optional) }
    """
    question = payload.get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    project_id = payload.get("project_id")
    return integration_system.ai_engineering_assistant(question, context_project_id=project_id)


@app.post("/api/carbon/calculate")
async def calculate_carbon(payload: dict, current_user: User = Depends(get_current_user)):
    """
    Calculate carbon footprint from a materials breakdown.
    Body: { "materials": { "conc_25mpa": 24.0, "steel_rebar_16mm": 440.0, ... } }
    Returns Scope 1/2/3 breakdown and industry benchmark comparison.
    """
    from materials import MaterialsEngine, MATERIAL_DATABASE

    materials: dict = payload.get("materials", {})
    project_area_m2: float = float(payload.get("project_area_m2", 1.0))

    scope1 = 0.0  # direct fuel / on-site combustion
    scope2 = 0.0  # electricity (formwork machinery etc.)
    scope3 = 0.0  # embodied carbon in materials

    breakdown = {}
    for mat_id, qty in materials.items():
        carbon = MaterialsEngine.calculate_carbon_footprint(mat_id, qty)
        material = MATERIAL_DATABASE.get(mat_id)
        category = material.category.value if material else "other"
        breakdown[mat_id] = {"carbon_tCO2": round(carbon, 3), "category": category, "qty": qty}
        scope3 += carbon

    # Approximate Scope 1 from plant fuel (0.08 tCO2/hr × estimated hrs)
    plant_hrs = float(payload.get("plant_hours_total", 0))
    scope1 = plant_hrs * 0.08

    total = scope1 + scope2 + scope3
    intensity = round(total / project_area_m2, 4) if project_area_m2 else 0

    # Industry benchmarks (tCO2/m²)
    benchmarks = {
        "retaining_wall": 0.12,
        "road_construction": 0.08,
        "building_structure": 0.25,
        "bridge": 0.35,
    }
    project_type = payload.get("project_type", "retaining_wall")
    benchmark = benchmarks.get(project_type, 0.15)
    vs_benchmark_pct = round((intensity - benchmark) / benchmark * 100, 1) if benchmark else 0

    return {
        "scope1_tCO2": round(scope1, 3),
        "scope2_tCO2": round(scope2, 3),
        "scope3_tCO2": round(scope3, 3),
        "total_tCO2": round(total, 3),
        "intensity_tCO2_per_m2": intensity,
        "benchmark_tCO2_per_m2": benchmark,
        "vs_benchmark_pct": vs_benchmark_pct,
        "rating": "good" if vs_benchmark_pct <= -10 else ("average" if vs_benchmark_pct <= 10 else "high"),
        "breakdown": breakdown,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)