# Build stage with Julia runtime
FROM julia:1.9-bullseye

# Set working directory
WORKDIR /app

# Copy project files first for better layer caching
COPY Project.toml Manifest.toml* ./

# Install Julia dependencies
RUN julia --project=. -e "using Pkg; Pkg.instantiate(); Pkg.precompile()"

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash agents && \
    chown -R agents:agents /app
USER agents

# Expose no ports (stdio only)
# No EXPOSE directive needed for stdio communication

# Set environment variables for deterministic behavior
ENV JULIA_NUM_THREADS=1
ENV JULIA_DEPOT_PATH="/app/.julia"

# Health check command
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD julia -e "using JSON3; println(JSON3.write(Dict(\"status\" => \"healthy\")))"

# Default command
CMD ["julia", "--project=.", "main.jl"]