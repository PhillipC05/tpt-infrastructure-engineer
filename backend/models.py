from datetime import datetime
from enum import Enum as PyEnum
from uuid import uuid4
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Integer,
    BigInteger, Date, Numeric, Float, ARRAY, JSON, func
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB, ENUM
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
Base = declarative_base()


class UserRole(PyEnum):
    OWNER = "owner"
    ENGINEER = "engineer"
    SURVEYOR = "surveyor"
    PROJECT_MANAGER = "project_manager"
    DRAFTSMAN = "draftsman"
    CONTRACTOR = "contractor"
    SUPPLIER = "supplier"
    VIEWER = "viewer"


user_role_enum = ENUM(UserRole, name="user_role", create_type=True, values_callable=lambda obj: [e.value for e in obj])


class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    business_number = Column(String(100))
    address = Column(String)
    country_code = Column(String(2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    users = relationship("User", back_populates="organisation")
    projects = relationship("Project", back_populates="organisation")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="SET NULL"))
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(user_role_enum, default=UserRole.VIEWER)
    phone = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    email_notifications_enabled = Column(Boolean, default=True)

    organisation = relationship("Organisation", back_populates="users")
    permissions = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")


class UserPermission(Base):
    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(100), nullable=False)
    can_read = Column(Boolean, default=False)
    can_write = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_approve = Column(Boolean, default=False)

    user = relationship("User", back_populates="permissions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="SET NULL"))
    project_id = Column(UUID(as_uuid=True))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(UUID(as_uuid=True))
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    ip_address = Column(INET)
    user_agent = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String)
    project_number = Column(String(100))
    status = Column(String(50), default='draft')
    latitude = Column(Float)
    longitude = Column(Float)
    country_code = Column(String(2))
    client_name = Column(String(255))
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Numeric(15, 2))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_archived = Column(Boolean, default=False)

    organisation = relationship("Organisation", back_populates="projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    versions = relationship("ProjectVersion", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("ProjectActivity", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(user_role_enum, nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))

    project = relationship("Project", back_populates="members")


class ProjectVersion(Base):
    __tablename__ = "project_versions"

    id = Column(BigInteger, primary_key=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    name = Column(String(255))
    description = Column(String)
    snapshot = Column(JSONB, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="versions")


class ProjectActivity(Base):
    __tablename__ = "project_activities"

    id = Column(BigInteger, primary_key=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    activity_type = Column(String(100), nullable=False)
    content = Column(String)
    activity_metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="activities")


class ProjectAttachment(Base):
    __tablename__ = "project_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100))
    file_hash = Column(String(64))
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_archived = Column(Boolean, default=False)


class ProjectComment(Base):
    __tablename__ = "project_comments"

    id = Column(BigInteger, primary_key=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    parent_id = Column(BigInteger, ForeignKey("project_comments.id", ondelete="CASCADE"))
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_edited = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)


class Design(Base):
    __tablename__ = "designs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)
    status = Column(String(50), default='draft')
    parameters = Column(JSONB, nullable=False)
    score = Column(Numeric(5, 2))
    cost_estimate = Column(Numeric(15, 2))
    structural_rating = Column(Integer)
    compliance_status = Column(String(20))
    drawing_data = Column(JSONB)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DesignAlternative(Base):
    __tablename__ = "design_alternatives"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    design_id = Column(UUID(as_uuid=True), ForeignKey("designs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    variant = Column(String(10))
    parameters = Column(JSONB, nullable=False)
    score = Column(Numeric(5, 2))
    cost_estimate = Column(Numeric(15, 2))
    structural_rating = Column(Integer)
    compliance_status = Column(String(20))
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ValidationRule(Base):
    __tablename__ = "validation_rules"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    standard = Column(String(100))
    condition = Column(JSONB, nullable=False)
    severity = Column(String(20), default='warning')
    is_active = Column(Boolean, default=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    
    notification_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(String)
    
    entity_type = Column(String(100))
    entity_id = Column(UUID(as_uuid=True))
    
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    notification_metadata = Column(JSONB)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    
    sent_email = Column(Boolean, default=False)
    sent_push = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserMention(Base):
    __tablename__ = "user_mentions"

    id = Column(BigInteger, primary_key=True)
    comment_id = Column(BigInteger, ForeignKey("project_comments.id", ondelete="CASCADE"), nullable=False)
    mentioned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentioned_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    notification_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Materials catalogue (org-level)
# ---------------------------------------------------------------------------
class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    unit_cost = Column(Numeric(15, 4), nullable=False)
    supplier = Column(String(255))
    grade = Column(String(100))
    carbon_footprint = Column(Numeric(10, 4))
    availability = Column(String(50), default='in_stock')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_archived = Column(Boolean, default=False)


# ---------------------------------------------------------------------------
# Schedule tasks (project-scoped)
# ---------------------------------------------------------------------------
class ScheduleTask(Base):
    __tablename__ = "schedule_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    duration = Column(Integer)
    progress = Column(Integer, default=0)
    status = Column(String(50), default='not_started')
    dependencies = Column(ARRAY(String), default=[])
    assignee = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Estimate items (project-scoped)
# ---------------------------------------------------------------------------
class EstimateItem(Base):
    __tablename__ = "estimate_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(15, 4), nullable=False)
    unit = Column(String(20), nullable=False)
    rate = Column(Numeric(15, 4), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    category = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Purchase orders (project-scoped)
# ---------------------------------------------------------------------------
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    po_number = Column(String(100), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    status = Column(String(50), default='draft')
    total_value = Column(Numeric(15, 2), default=0)
    line_items = Column(JSONB, default=list)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Bills of materials (project-scoped)
# ---------------------------------------------------------------------------
class BillOfMaterials(Base):
    __tablename__ = "bills_of_materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    line_items = Column(JSONB, default=list)
    total_value = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Generated reports (project-scoped)
# ---------------------------------------------------------------------------
class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    organisation_id = Column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    report_type = Column(String(100), nullable=False)
    status = Column(String(50), default='draft')
    format = Column(String(20), default='json')
    content = Column(JSONB, default=dict)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
