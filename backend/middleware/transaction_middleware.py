from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from sqlalchemy.orm import Session
import logging
from database import SessionLocal

class TransactionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        db: Session = SessionLocal()
        request.state.db = db
        
        try:
            response = await call_next(request)
            
            if response.status_code < 400:
                db.commit()
            else:
                db.rollback()
                
            return response
            
        except Exception as e:
            db.rollback()
            logging.error(f"Transaction rolled back due to exception: {str(e)}")
            raise e
            
        finally:
            db.close()