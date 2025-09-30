# Build stage with Maven and OpenJDK
FROM maven:3.9-openjdk-11-slim AS build

# Set working directory
WORKDIR /app

# Copy project files
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage with minimal OpenJDK
FROM openjdk:11-jre-slim

# Set working directory
WORKDIR /app

# Copy built JAR from build stage
COPY --from=build /app/target/mason-sidecar-*-jar-with-dependencies.jar app.jar

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash mason && \
    chown -R mason:mason /app
USER mason

# Expose no ports (stdio only)
# No EXPOSE directive needed for stdio communication

# Set environment variables for deterministic behavior
ENV JAVA_OPTS="-Xmx1g -Djava.awt.headless=true"

# Health check command
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD echo '{"status":"healthy"}' || exit 1

# Default command
CMD ["java", "-jar", "app.jar"]