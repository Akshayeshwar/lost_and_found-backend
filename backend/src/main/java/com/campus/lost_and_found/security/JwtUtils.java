package com.campus.lost_and_found.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    private static final Logger log = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    private SecretKey getSigningKey() {
        try {
            byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
            if (keyBytes.length >= 32) {
                return Keys.hmacShaKeyFor(keyBytes);
            }
        } catch (Exception ignored) {
            // Fallback if not standard Base64
        }
        byte[] rawBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (rawBytes.length < 32) {
            // Pad to 32 bytes (256-bit) if needed
            byte[] padded = new byte[32];
            System.arraycopy(rawBytes, 0, padded, 0, rawBytes.length);
            return Keys.hmacShaKeyFor(padded);
        }
        return Keys.hmacShaKeyFor(rawBytes);
    }

    private final tools.jackson.databind.ObjectMapper objectMapper = new tools.jackson.databind.ObjectMapper();

    @SuppressWarnings("deprecation")
    private final io.jsonwebtoken.io.Serializer<java.util.Map<String, ?>> jsonSerializer = new io.jsonwebtoken.io.Serializer<>() {
        @Override
        public byte[] serialize(java.util.Map<String, ?> t) throws io.jsonwebtoken.io.SerializationException {
            try {
                return objectMapper.writeValueAsBytes(t);
            } catch (Exception e) {
                throw new io.jsonwebtoken.io.SerializationException("Failed to serialize JWT JSON: " + e.getMessage(), e);
            }
        }

        @Override
        public void serialize(java.util.Map<String, ?> t, java.io.OutputStream out) throws io.jsonwebtoken.io.SerializationException {
            try {
                out.write(serialize(t));
            } catch (Exception e) {
                throw new io.jsonwebtoken.io.SerializationException("Failed to write JWT JSON: " + e.getMessage(), e);
            }
        }
    };

    @SuppressWarnings({"unchecked", "deprecation"})
    private final io.jsonwebtoken.io.Deserializer<java.util.Map<String, ?>> jsonDeserializer = new io.jsonwebtoken.io.Deserializer<>() {
        @Override
        public java.util.Map<String, ?> deserialize(byte[] bytes) throws io.jsonwebtoken.io.DeserializationException {
            try {
                return objectMapper.readValue(bytes, java.util.Map.class);
            } catch (Exception e) {
                throw new io.jsonwebtoken.io.DeserializationException("Failed to deserialize JWT JSON: " + e.getMessage(), e);
            }
        }

        @SuppressWarnings("unchecked")
        @Override
        public java.util.Map<String, ?> deserialize(java.io.Reader reader) throws io.jsonwebtoken.io.DeserializationException {
            try {
                return objectMapper.readValue(reader, java.util.Map.class);
            } catch (Exception e) {
                throw new io.jsonwebtoken.io.DeserializationException("Failed to read JWT JSON: " + e.getMessage(), e);
            }
        }
    };

    private JwtParser getParser() {
        return Jwts.parser()
                .json(jsonDeserializer)
                .verifyWith(getSigningKey())
                .build();
    }

    public String generateToken(Authentication authentication, Long userId, String role) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        return generateTokenFromUsername(userPrincipal.getUsername(), userId, role);
    }

    public String generateTokenFromUsername(String email, Long userId, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .json(jsonSerializer)
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    public String getUsernameFromJwtToken(String token) {
        return getParser()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public Long getUserIdFromJwtToken(String token) {
        Claims claims = getParser()
                .parseSignedClaims(token)
                .getPayload();
        Number userId = claims.get("userId", Number.class);
        return userId != null ? userId.longValue() : null;
    }

    public String getRoleFromJwtToken(String token) {
        Claims claims = getParser()
                .parseSignedClaims(token)
                .getPayload();
        return claims.get("role", String.class);
    }

    public boolean validateJwtToken(String authToken) {
        try {
            getParser().parseSignedClaims(authToken);
            return true;
        } catch (SignatureException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token format: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty or invalid: {}", e.getMessage());
        }
        return false;
    }
}
