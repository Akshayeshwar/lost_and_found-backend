# ==============================================================================
# Stage 1: Build Stage (Maven + Eclipse Temurin JDK 21)
# ==============================================================================
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy backend pom.xml, wrapper, and source
COPY backend/pom.xml .
COPY backend/.mvn .mvn
COPY backend/mvnw .
COPY backend/src ./src

RUN mvn clean package -DskipTests

# ==============================================================================
# Stage 2: Minimal, Hardened Runtime Stage (Alpine JRE 21)
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Security Hardening: Run as non-privileged spring user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy production JAR from builder stage
COPY --from=build /app/target/*.jar app.jar

# Expose standard application port
EXPOSE 8080

# Environment variables with sensible container defaults
ENV SPRING_PROFILES_ACTIVE=prod
ENV PORT=8080
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Execute Spring Boot application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=${PORT}"]
