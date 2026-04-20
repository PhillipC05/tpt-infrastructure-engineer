from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import date, datetime
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    project_number: Optional[str] = None
    client_name: Optional[str] = None
    country_code: Optional[str] = Field(max_length=2)
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
    country_code: Optional[str] = Field(max_length=2)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_archived: Optional[bool] = None


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    organisation_id: Optional[UUID] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    organisation_id: Optional[UUID]
    created_at: datetime

    class Config:
        orm_mode = True


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
        orm_mode = True


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
        orm_mode = True


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
        orm_mode = True
