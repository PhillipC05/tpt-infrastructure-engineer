from sqlalchemy.orm import Session
from fastapi import Request
from models import AuditLog, User
import json
from typing import Optional, Any


class AuditLogger:
    def __init__(self, db: Session, user: User = None):
        self.db = db
        self.user = user

    def log(self, action: str, entity_type: str = None, entity_id: str = None,
            old_values: dict = None, new_values: dict = None,
            request: Request = None):

        ip_address = None
        user_agent = None

        if request:
            if request.client:
                ip_address = request.client.host
            user_agent = request.headers.get("user-agent")

        audit_entry = AuditLog(
            user_id=self.user.id if self.user else None,
            organisation_id=self.user.organisation_id if self.user else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )

        self.db.add(audit_entry)
        self.db.commit()

    def log_create(self, entity_type: str, entity_id: str, new_values: dict, request: Request = None):
        self.log("create", entity_type, entity_id, None, new_values, request)

    def log_update(self, entity_type: str, entity_id: str, old_values: dict, new_values: dict, request: Request = None):
        self.log("update", entity_type, entity_id, old_values, new_values, request)

    def log_delete(self, entity_type: str, entity_id: str, old_values: dict, request: Request = None):
        self.log("delete", entity_type, entity_id, old_values, None, request)

    def log_login(self, request: Request = None):
        self.log("login", None, None, None, None, request)

    def log_logout(self, request: Request = None):
        self.log("logout", None, None, None, None, request)

    def log_access(self, entity_type: str, entity_id: str, request: Request = None):
        self.log("access", entity_type, entity_id, None, None, request)