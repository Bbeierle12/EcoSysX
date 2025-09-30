# Build stage with minimal Python runtime
FROM python:3.11-slim-bullseye

# Install system dependencies for numerical libraries
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash mesa && \
    chown -R mesa:mesa /app
USER mesa

# Expose no ports (stdio only)
# No EXPOSE directive needed for stdio communication

# Set environment variables for deterministic behavior
ENV PYTHONHASHSEED=0
ENV PYTHONUNBUFFERED=1

# Health check command
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sys, json; print(json.dumps({'status': 'healthy'})); sys.exit(0)"

# Default command
CMD ["python", "main.py"]