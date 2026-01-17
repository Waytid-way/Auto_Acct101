# PaddleOCR Worker Docker Image
# Phase 3B: OCR Integration for Auto-Acct-001
#
# Critical Modification #3: Includes health check and restart policy

FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and PaddlePaddle
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ocr_service.py .

# Create non-root user for security
RUN useradd -m -u 1000 ocruser && chown -R ocruser:ocruser /app
USER ocruser

# Expose port
EXPOSE 5000

# Health check (Critical #3)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Run the service
CMD ["uvicorn", "ocr_service:app", "--host", "0.0.0.0", "--port", "5000"]
