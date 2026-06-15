from pydantic import BaseModel, Field
from typing import Optional, List, Any
from decimal import Decimal
from datetime import date, datetime
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    project_number: Optional[str] = None
    client_name: Optional[str] = None
    country_code: Optional[str] = Field(None, max_length=2)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    project_number: Optional[str] = None
    status: Optional[str] = None
    client_name: Optional[str] = None
    country_code: Optional[str] = Field(None, max_length=2)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_archived: Optional[bool] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=8)


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    organisation_id: Optional[UUID] = None
    organisation_name: Optional[str] = Field(None, min_length=2, max_length=255)


class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    organisation_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    mime_type: Optional[str]
    description: Optional[str]
    uploaded_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    project_id: UUID
    user_id: Optional[UUID]
    parent_id: Optional[int]
    content: str
    created_at: datetime
    updated_at: datetime
    is_edited: bool

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    project_number: Optional[str]
    status: str
    client_name: Optional[str]
    country_code: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    budget: Optional[Decimal]
    created_at: datetime
    updated_at: datetime
    is_archived: bool

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: Optional[UUID]
    notification_type: str
    title: str
    content: Optional[str]
    entity_type: Optional[str]
    entity_id: Optional[UUID]
    sender_id: Optional[UUID]
    notification_metadata: Optional[dict]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Material schemas
# ---------------------------------------------------------------------------

class MaterialCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=20)
    unit_cost: Decimal = Field(ge=0)
    supplier: Optional[str] = Field(None, max_length=255)
    grade: Optional[str] = Field(None, max_length=100)
    carbon_footprint: Optional[Decimal] = Field(None, ge=0)
    availability: Optional[str] = Field("in_stock", max_length=50)


class MaterialUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    supplier: Optional[str] = Field(None, max_length=255)
    grade: Optional[str] = Field(None, max_length=100)
    carbon_footprint: Optional[Decimal] = Field(None, ge=0)
    availability: Optional[str] = Field(None, max_length=50)


# ---------------------------------------------------------------------------
# Schedule task schemas
# ---------------------------------------------------------------------------

class TaskCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    start_date: date
    end_date: date
    duration: Optional[int] = Field(None, ge=0)
    progress: Optional[int] = Field(0, ge=0, le=100)
    status: Optional[str] = Field("not_started", max_length=50)
    dependencies: Optional[List[str]] = Field(default_factory=list)
    assignee: Optional[str] = Field(None, max_length=255)


class TaskUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration: Optional[int] = Field(None, ge=0)
    progress: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[str] = Field(None, max_length=50)
    dependencies: Optional[List[str]] = None
    assignee: Optional[str] = Field(None, max_length=255)


# ---------------------------------------------------------------------------
# Estimate item schemas
# ---------------------------------------------------------------------------

class EstimateItemCreate(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    quantity: Decimal = Field(gt=0)
    unit: str = Field(min_length=1, max_length=20)
    rate: Decimal = Field(ge=0)
    category: Optional[str] = Field(None, max_length=100)


class EstimateItemUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    rate: Optional[Decimal] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)


# ---------------------------------------------------------------------------
# Purchase order schemas
# ---------------------------------------------------------------------------

class PurchaseOrderCreate(BaseModel):
    project_id: UUID
    po_number: str = Field(min_length=1, max_length=100)
    supplier_name: str = Field(min_length=1, max_length=255)
    status: Optional[str] = Field("draft", max_length=50)
    total_value: Optional[Decimal] = Field(Decimal("0"), ge=0)
    line_items: Optional[List[Any]] = Field(default_factory=list)


class PurchaseOrderUpdate(BaseModel):
    po_number: Optional[str] = Field(None, min_length=1, max_length=100)
    supplier_name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = Field(None, max_length=50)
    total_value: Optional[Decimal] = Field(None, ge=0)
    line_items: Optional[List[Any]] = None


# ---------------------------------------------------------------------------
# Design schemas
# ---------------------------------------------------------------------------

class DesignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=100)
    parameters: dict
    status: Optional[str] = Field("draft", max_length=50)
    cost_estimate: Optional[Decimal] = Field(None, ge=0)
    structural_rating: Optional[int] = Field(None, ge=1, le=10)
    drawing_data: Optional[dict] = None


class DesignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[str] = Field(None, min_length=1, max_length=100)
    parameters: Optional[dict] = None
    status: Optional[str] = Field(None, max_length=50)
    cost_estimate: Optional[Decimal] = Field(None, ge=0)
    structural_rating: Optional[int] = Field(None, ge=1, le=10)
    drawing_data: Optional[dict] = None


class DesignAlternativeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    variant: Optional[str] = Field(None, max_length=10)
    parameters: dict
    cost_estimate: Optional[Decimal] = Field(None, ge=0)
    structural_rating: Optional[int] = Field(None, ge=1, le=10)
