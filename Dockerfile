# TPT Infrastructure Engineer - Production Docker Image (Phase 19)
# Multi-stage build for optimized production deployment
FROM python:3.12-slim AS backend-builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Node.js frontend builder
FROM node:20-slim AS frontend-builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build


# Final production image
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Add backend to Python path so bare imports (from models import ...) resolve
ENV PYTHONPATH=/app/backend

# Copy application code
COPY backend/ ./backend/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY pytest.ini .
COPY database/ ./database/

# Copy built frontend
COPY --from=frontend-builder /app/dist ./frontend/dist/

# Expose ports
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]