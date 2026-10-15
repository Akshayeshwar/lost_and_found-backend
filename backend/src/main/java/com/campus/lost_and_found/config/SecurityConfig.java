package com.campus.lost_and_found.config;

import com.campus.lost_and_found.security.AuthEntryPointJwt;
import com.campus.lost_and_found.security.JwtAuthenticationFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthEntryPointJwt authEntryPointJwt;

    @Value("${app.security.dev-mode:false}")
    private boolean devMode;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, AuthEntryPointJwt authEntryPointJwt) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authEntryPointJwt = authEntryPointJwt;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authEntryPointJwt)
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json");
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(
                        "{\"timestamp\":\"" + java.time.LocalDateTime.now() + "\",\"status\":403,\"error\":\"Forbidden\",\"message\":\"Access Denied: You do not have permission to perform this action\"}"
                    );
                })
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        if (devMode) {
            log.warn("⚠️ DEV MODE ACTIVE: Authentication relaxed. Set DEV_MODE=false in production!");
            http.authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/favicon.ico",
                    "/css/**",
                    "/js/**",
                    "/api/health",
                    "/api/users/**",
                    "/api/items/**",
                    "/error"
                ).permitAll()
                .anyRequest().permitAll()
            );
        } else {
            log.info("🛡️ JWT STATELESS SECURITY ACTIVE: Enforcing signed bearer authentication.");
            http.authorizeHttpRequests(auth -> auth
                // Public Static & Auth Endpoints
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/favicon.ico",
                    "/css/**",
                    "/js/**",
                    "/api/health",
                    "/api/health/**",
                    "/health",
                    "/health/**",
                    "/actuator/**",
                    "/api/users/login",
                    "/api/users/register",
                    "/users/login",
                    "/users/register",
                    "/error"
                ).permitAll()
                // Explicitly Protected Endpoints (evaluated before generic permitAll)
                .requestMatchers("/api/users/me", "/users/me").authenticated()
                .requestMatchers("/api/items/my", "/api/items/me", "/items/my", "/items/me").authenticated()
                .requestMatchers("/api/items/user/**", "/items/user/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/items/*/claims", "/items/*/claims").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/items/*/claims", "/items/*/claims").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/items/*/claims/**", "/items/*/claims/**").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/items/*/status", "/items/*/status").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/items/*/status", "/items/*/status").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/items/**", "/items/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/items/**", "/items/**").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/items/**", "/items/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/items/**", "/items/**").authenticated()
                // Public Read Access for Browse & Search
                .requestMatchers(HttpMethod.GET, "/api/items/**", "/items/**").permitAll()
                .anyRequest().authenticated()
            );
        }

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .toList();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
