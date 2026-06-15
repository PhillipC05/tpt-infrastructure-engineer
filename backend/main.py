from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from typing import Dict, Set, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker, Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os
import logging
import time
import json
import asyncio

from models import Base, User, Project, Organisation, ProjectVersion, UserPermission, UserRole, ProjectAttachment, ProjectComment, Notification, UserMention
from notifications import NotificationService
from auth import (
    verify_password, create_access_token, get_current_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, Token
)
from audit_logger import AuditLogger
from fastapi import UploadFile, File
from schemas import ProjectCreate, ProjectUpdate, ProjectResponse, UserCreate, UserResponse, AttachmentResponse, CommentCreate, CommentResponse, NotificationResponse
from geoalchemy2.elements import WKTElement

# Load environment variables
load_dotenv()

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="TPT Infrastructure Engineer API", version="1.0.0")
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
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Request-ID"]
)

# Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "type": type(exc).__name__
        }
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

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/tpt_infrastructure")
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Database tables managed via Alembic migrations.
# Run: alembic upgrade head

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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
        "role": user.role.value,
        "name": f"{user.first_name} {user.last_name}"
    }


@app.post("/auth/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )

    if user_data.organisation_id:
        organisation = db.query(Organisation).filter(
            Organisation.id == user_data.organisation_id,
            Organisation.is_active == True
        ).first()
        if not organisation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organisation not found or inactive"
            )

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        organisation_id=user_data.organisation_id,
        role=UserRole.VIEWER
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
        "role": current_user.role.value,
        "organisation_id": str(current_user.organisation_id) if current_user.organisation_id else None
    }


@app.get("/api/projects", response_model=list[ProjectResponse])
async def get_projects(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Project).filter(
        Project.organisation_id == current_user.organisation_id,
        Project.is_archived == False
    ).order_by(Project.updated_at.desc())
    
    total = query.count()
    projects = query.offset(skip).limit(limit).all()
    
    return JSONResponse(
        content=[ProjectResponse.from_orm(p).dict() for p in projects],
        headers={"X-Total-Count": str(total)}
    )


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

    if project_data.latitude and project_data.longitude:
        project.location = WKTElement(f'POINT({project_data.longitude} {project_data.latitude})', srid=4326)

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

    if project_data.latitude and project_data.longitude:
        project.location = WKTElement(f'POINT({project_data.longitude} {project_data.latitude})', srid=4326)

    last_version = db.query(ProjectVersion).filter(
        ProjectVersion.project_id == project.id
    ).order_by(ProjectVersion.version_number.desc()).first()

    new_version = ProjectVersion(
        project_id=project.id,
        version_number=last_version.version_number + 1,
        name=f"Version {last_version.version_number + 1}",
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
        }
    }


@app.get("/api/activity", response_model=list[dict])
async def get_activity_feed(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from models import AuditLog
    query = db.query(AuditLog).filter(
        AuditLog.organisation_id == current_user.organisation_id
    ).order_by(AuditLog.created_at.desc())
    
    total = query.count()
    activities = query.offset(skip).limit(limit).all()
    
    feed = []
    for activity in activities:
        feed.append({
            "id": str(activity.id),
            "action": activity.action,
            "entity_type": activity.entity_type,
            "entity_id": str(activity.entity_id) if activity.entity_id else None,
            "user_id": str(activity.user_id) if activity.user_id else None,
            "old_values": activity.old_values,
            "new_values": activity.new_values,
            "created_at": activity.created_at.isoformat() if activity.created_at else None,
            "ip_address": activity.ip_address
        })
    
    return JSONResponse(
        content=feed,
        headers={"X-Total-Count": str(total)}
    )


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
        logging.warning(f"Unusual file type uploaded: {file.content_type} - {file.filename}")
    
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
        
        for pattern in dangerous_patterns:
            if pattern in chunk.lower():
                logging.warning(f"Dangerous content detected in upload: {pattern} from user {current_user.id}")
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
    
    from lib.file_storage import storage
    await file.seek(0)
    await storage.save_file(f"attachments/{stored_filename}", file, file.content_type)

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
        project_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == mentioned_user_id
        ).first()
        
        if project_member:
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
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total = query.count()
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    return JSONResponse(
        content=[NotificationResponse.from_orm(n).dict() for n in notifications],
        headers={"X-Total-Count": str(total)}
    )


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


# ------------------------------
# Health Check Endpoints
# ------------------------------
@app.get("/health", status_code=status.HTTP_200_OK)
@limiter.limit("100/minute")
async def health_check(request: Request):
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health/detailed", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def detailed_health_check(request: Request, db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "checks": {
            "database": db_status,
            "api": "healthy"
        },
        "active_connections": sum(len(connections) for connections in manager.active_connections.values())
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)