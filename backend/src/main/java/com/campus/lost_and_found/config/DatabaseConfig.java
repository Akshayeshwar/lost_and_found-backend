package com.campus.lost_and_found.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Universal Database Configuration supporting:
 * 1. Local MySQL development (application-dev.properties)
 * 2. Render PostgreSQL deployment (Render DATABASE_URL uri format: postgres:// or postgresql://)
 * 3. Standard JDBC URL properties (DB_URL, DB_USERNAME, DB_PASSWORD)
 */
@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    @Primary
    public DataSource dataSource(Environment env) {
        // Resolve raw URL from Render DATABASE_URL, custom DB_URL, or standard Spring property
        String rawUrl = env.getProperty("DATABASE_URL");
        if (!StringUtils.hasText(rawUrl)) {
            rawUrl = env.getProperty("DB_URL");
        }
        if (!StringUtils.hasText(rawUrl)) {
            rawUrl = env.getProperty("spring.datasource.url");
        }

        HikariConfig config = new HikariConfig();

        // Detect if URL is in Render/Heroku URI format: postgres://user:pass@host:port/dbname
        if (StringUtils.hasText(rawUrl) && (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://"))) {
            log.info("Detected PostgreSQL URI format from Render environment. Parsing connection details...");
            try {
                String uriString = rawUrl.startsWith("postgres://")
                        ? "postgresql://" + rawUrl.substring("postgres://".length())
                        : rawUrl;

                URI uri = URI.create(uriString);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] userParts = userInfo.split(":", 2);
                    config.setUsername(userParts[0]);
                    config.setPassword(userParts[1]);
                }

                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String host = uri.getHost();
                String path = uri.getPath(); // e.g. /campus_lost_and_found
                String query = uri.getQuery();

                StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                        .append(host)
                        .append(":")
                        .append(port)
                        .append(path);

                if (StringUtils.hasText(query)) {
                    jdbcUrl.append("?").append(query);
                }

                config.setJdbcUrl(jdbcUrl.toString());
                config.setDriverClassName("org.postgresql.Driver");
                log.info("Configured Render PostgreSQL JDBC target: {}:{}", host, port);
            } catch (Exception e) {
                log.error("Failed to parse PostgreSQL URI: {}. Falling back to raw URL.", e.getMessage());
                config.setJdbcUrl(rawUrl);
                config.setDriverClassName("org.postgresql.Driver");
            }
        } else {
            // Standard JDBC URL (MySQL dev or explicit JDBC connection string)
            if (StringUtils.hasText(rawUrl)) {
                config.setJdbcUrl(rawUrl);
            }

            String username = env.getProperty("DB_USERNAME");
            if (!StringUtils.hasText(username)) {
                username = env.getProperty("spring.datasource.username");
            }
            if (StringUtils.hasText(username)) {
                config.setUsername(username);
            }

            String password = env.getProperty("DB_PASSWORD");
            if (!StringUtils.hasText(password)) {
                password = env.getProperty("spring.datasource.password");
            }
            if (StringUtils.hasText(password)) {
                config.setPassword(password);
            }

            String driver = env.getProperty("DB_DRIVER_CLASS_NAME");
            if (!StringUtils.hasText(driver)) {
                driver = env.getProperty("spring.datasource.driver-class-name");
            }
            if (StringUtils.hasText(driver)) {
                config.setDriverClassName(driver);
            }
        }

        // Connection pool optimization parameters
        int maxPoolSize = Integer.parseInt(env.getProperty("spring.datasource.hikari.maximum-pool-size", "10"));
        int minIdle = Integer.parseInt(env.getProperty("spring.datasource.hikari.minimum-idle", "3"));
        config.setMaximumPoolSize(maxPoolSize);
        config.setMinimumIdle(minIdle);
        config.setIdleTimeout(30000);
        config.setMaxLifetime(1800000);
        config.setConnectionTimeout(20000);

        return new HikariDataSource(config);
    }
}
