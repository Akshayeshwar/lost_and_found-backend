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
 * 1. Render PostgreSQL deployment (supports Render INTERNAL_DATABASE_URL, DATABASE_URL, DB_URL)
 * 2. Individual environment variables (DB_HOST, DB_USER, DB_PASSWORD, etc.)
 * 3. Local MySQL development (application-dev.properties)
 */
@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    @Primary
    public DataSource dataSource(Environment env) {
        HikariConfig config = new HikariConfig();

        // 1. Check for valid database URL in priority order
        String rawUrl = resolveDatabaseUrl(env);

        if (StringUtils.hasText(rawUrl)) {
            // Check if it's a Render / Heroku Postgres URI (e.g. postgres:// or postgresql://)
            if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
                log.info("Configuring DataSource from Render PostgreSQL URI...");
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
                    log.info("Successfully parsed Render PostgreSQL JDBC target: {}:{}", host, port);
                } catch (Exception e) {
                    log.error("Failed to parse PostgreSQL URI: {}. Falling back to raw URL.", e.getMessage());
                    config.setJdbcUrl(rawUrl);
                    config.setDriverClassName("org.postgresql.Driver");
                }
            } else if (rawUrl.startsWith("jdbc:")) {
                // Standard JDBC URL (MySQL dev or explicit JDBC connection string)
                log.info("Configuring DataSource from standard JDBC URL: {}", maskUrl(rawUrl));
                config.setJdbcUrl(rawUrl);

                if (rawUrl.startsWith("jdbc:postgresql:")) {
                    config.setDriverClassName("org.postgresql.Driver");
                } else if (rawUrl.startsWith("jdbc:mysql:")) {
                    config.setDriverClassName("com.mysql.cj.jdbc.Driver");
                }

                applyCredentials(config, env);
            } else {
                // The user passed a string that is NOT a URL (e.g. they pasted their DB password into DATABASE_URL)
                handleInvalidUrlString(rawUrl, config, env);
            }
        } else {
            // 2. No URL found; check if individual host properties are provided (DB_HOST / POSTGRES_HOST)
            buildFromHostProperties(config, env);
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

    /**
     * Resolves database URL, prioritizing full URLs starting with postgres://, postgresql://, or jdbc:
     */
    private String resolveDatabaseUrl(Environment env) {
        String[] candidateKeys = {
            "INTERNAL_DATABASE_URL",
            "DATABASE_URL",
            "EXTERNAL_DATABASE_URL",
            "DB_URL",
            "spring.datasource.url"
        };

        // First pass: find one that is actually a valid URL format
        for (String key : candidateKeys) {
            String val = env.getProperty(key);
            if (StringUtils.hasText(val)) {
                val = val.trim();
                if (val.startsWith("postgres://") || val.startsWith("postgresql://") || val.startsWith("jdbc:")) {
                    return val;
                }
            }
        }

        // Second pass: if none start with a protocol, return whatever is in DATABASE_URL or DB_URL for diagnostic handling
        for (String key : candidateKeys) {
            String val = env.getProperty(key);
            if (StringUtils.hasText(val)) {
                return val.trim();
            }
        }

        return null;
    }

    private void handleInvalidUrlString(String rawUrl, HikariConfig config, Environment env) {
        // If DB_HOST is set, we can recover and construct the URL
        String host = getFirstProperty(env, "DB_HOST", "POSTGRES_HOST", "PGHOST");
        if (StringUtils.hasText(host)) {
            String port = getFirstProperty(env, "DB_PORT", "POSTGRES_PORT", "5432");
            String db = getFirstProperty(env, "DB_NAME", "POSTGRES_DB", "campus_lost_and_found");
            String user = getFirstProperty(env, "DB_USERNAME", "POSTGRES_USER", "campus_user");
            config.setJdbcUrl("jdbc:postgresql://" + host + ":" + port + "/" + db);
            config.setUsername(user);
            config.setPassword(rawUrl); // Assume rawUrl was the password
            config.setDriverClassName("org.postgresql.Driver");
            log.info("Constructed PostgreSQL JDBC URL from host properties: {}:{}", host, port);
            return;
        }

        // Otherwise throw a helpful, diagnostic exception
        throw new IllegalStateException(
                "\n====================================================================================\n" +
                "CRITICAL CONFIGURATION ERROR ON RENDER:\n" +
                "The value provided for DATABASE_URL / DB_URL ('" + rawUrl + "') is NOT a valid URL.\n" +
                "It looks like you pasted the database PASSWORD instead of the 'Internal Database URL'!\n\n" +
                "HOW TO FIX ON RENDER:\n" +
                "1. Go to your Render Dashboard -> click your PostgreSQL database ('lost-and-found-db').\n" +
                "2. In the 'Connections' tab, find 'Internal Database URL' and click 'Copy'.\n" +
                "   (It must look like: postgresql://campus_user:YOUR_PASSWORD@dpg-xxx-a/campus_lost_and_found)\n" +
                "3. Go to your Web Service -> Environment Variables.\n" +
                "4. Update DATABASE_URL to that copied Internal Database URL.\n" +
                "====================================================================================\n"
        );
    }

    private void buildFromHostProperties(HikariConfig config, Environment env) {
        String host = getFirstProperty(env, "DB_HOST", "POSTGRES_HOST", "PGHOST");
        if (StringUtils.hasText(host)) {
            String port = getFirstProperty(env, "DB_PORT", "POSTGRES_PORT", "5432");
            String db = getFirstProperty(env, "DB_NAME", "POSTGRES_DB", "campus_lost_and_found");
            config.setJdbcUrl("jdbc:postgresql://" + host + ":" + port + "/" + db);
            config.setDriverClassName("org.postgresql.Driver");
            applyCredentials(config, env);
            log.info("Configured PostgreSQL JDBC target from host properties: {}:{}", host, port);
        } else {
            // Fallback for local development if spring.datasource properties exist
            applyCredentials(config, env);
        }
    }

    private void applyCredentials(HikariConfig config, Environment env) {
        String username = getFirstProperty(env, "DB_USERNAME", "POSTGRES_USER", "spring.datasource.username");
        if (StringUtils.hasText(username)) {
            config.setUsername(username);
        }
        String password = getFirstProperty(env, "DB_PASSWORD", "POSTGRES_PASSWORD", "spring.datasource.password");
        if (StringUtils.hasText(password)) {
            config.setPassword(password);
        }
    }

    private String getFirstProperty(Environment env, String... keys) {
        for (String key : keys) {
            String val = env.getProperty(key);
            if (StringUtils.hasText(val)) {
                return val.trim();
            }
        }
        return null;
    }

    private String maskUrl(String url) {
        return url.replaceAll(":[^:@]+@", ":****@");
    }
}
