import os
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from typing import Dict, Set, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, User, Project, Organisation, ProjectVersion, UserPermission, UserRole, ProjectAttachment, ProjectComment
from auth import (
    verify_password, create_access_token, get_current_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, Token
)
from audit_logger import AuditLogger
from fastapi import UploadFile, File
from schemas import ProjectCreate, ProjectUpdate, ProjectResponse, UserCreate, UserResponse, AttachmentResponse, CommentCreate, CommentResponse
from datetime import datetime
from geoalchemy2.elements import WKTElement

app = FastAPI(title="TPT Infrastructure Engineer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost/tpt_infrastructure"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


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
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )

    # Validate organisation exists if provided
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

    # Create new user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        organisation_id=user_data.organisation_id,
        # Default role for new registered users
        role=UserRole.VIEWER
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Assign default permissions for new user
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
async def get_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(
        Project.organisation_id == current_user.organisation_id,
        Project.is_archived == False
    ).order_by(Project.updated_at.desc()).all()
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

    if project_data.latitude and project_data.longitude:
        project.location = WKTElement(f'POINT({project_data.longitude} {project_data.latitude})', srid=4326)

    db.add(project)
    db.flush()

    # Create initial version
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

    # Auto increment version
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


@app.get("/api/activity", response_model=list[dict])
async def get_activity_feed(limit: int = 50, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from models import AuditLog
    activities = db.query(AuditLog).filter(
        AuditLog.organisation_id == current_user.organisation_id
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()
    
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
            "created_at": activity.created_at,
            "ip_address": activity.ip_address
        })
    
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
    
    import os
    import hashlib
    from uuid import uuid4
    
    file_ext = os.path.splitext(file.filename)[1]
    stored_filename = f"{uuid4()}{file_ext}"
    
    file_hash = hashlib.sha256()
    file_size = 0
    
    while chunk := await file.read(8192):
        file_hash.update(chunk)
        file_size += len(chunk)
    
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
    
    audit = AuditLogger(db, current_user)
    audit.log_create("attachment", str(attachment.id), {
        "filename": file.filename,
        "size": file_size,
        "project_id": project_id
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
    db.commit()
    db.refresh(comment)
    
    audit = AuditLogger(db, current_user)
    audit.log_create("comment", str(comment.id), {
        "project_id": project_id
    })
    
    return comment


# ------------------------------
# Realtime Collaboration
# ------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = set()
        self.active_connections[project_id].add(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, message: dict, project_id: str, sender: WebSocket = None):
        if project_id in self.active_connections:
            for connection in self.active_connections[project_id]:
                if connection != sender:
                    await connection.send_json(message)


manager = ConnectionManager()


@app.websocket("/api/ws/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data, project_id, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
