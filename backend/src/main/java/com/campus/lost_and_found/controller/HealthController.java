package com.campus.lost_and_found.controller;

import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final DataSource dataSource;
    private final Environment environment;

    public HealthController(DataSource dataSource, Environment environment) {
        this.dataSource = dataSource;
        this.environment = environment;
    }

    /**
     * Health check endpoint supporting both /api/health and /actuator/health
     * Returns 200 OK when database is connected, 503 SERVICE_UNAVAILABLE if DB is down.
     */
    @GetMapping({"/api/health", "/health", "/actuator/health"})
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "Campus Lost & Found Backend");
        health.put("timestamp", LocalDateTime.now());

        String[] activeProfiles = environment.getActiveProfiles();
        health.put("activeProfiles", activeProfiles.length > 0 ? activeProfiles : new String[]{"default"});

        try (Connection connection = dataSource.getConnection()) {
            health.put("database", "CONNECTED");
            health.put("databaseProductName", connection.getMetaData().getDatabaseProductName());
        } catch (Exception e) {
            health.put("status", "DOWN");
            health.put("database", "DOWN");
            health.put("databaseError", e.getMessage());
            return ResponseEntity.status(503).body(health);
        }

        return ResponseEntity.ok(health);
    }

    /**
     * System metadata & metrics endpoint (/api/health/info and /actuator/info)
     * Provides runtime uptime, JVM memory stats, and Java version without leaking sensitive info.
     */
    @GetMapping({"/api/health/info", "/actuator/info"})
    public ResponseEntity<Map<String, Object>> getInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "Campus Lost & Found Backend");
        info.put("version", "1.0.0");
        info.put("javaVersion", System.getProperty("java.version"));
        info.put("uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime());
        info.put("activeProfiles", Arrays.asList(environment.getActiveProfiles()));

        Runtime runtime = Runtime.getRuntime();
        Map<String, Object> memory = new HashMap<>();
        memory.put("maxMemoryMB", runtime.maxMemory() / (1024 * 1024));
        memory.put("totalMemoryMB", runtime.totalMemory() / (1024 * 1024));
        memory.put("freeMemoryMB", runtime.freeMemory() / (1024 * 1024));
        info.put("memory", memory);

        return ResponseEntity.ok(info);
    }
}
