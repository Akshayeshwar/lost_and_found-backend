package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.UserRegisterRequest;
import com.campus.lost_and_found.dto.UserResponse;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.exception.DuplicateResourceException;
import com.campus.lost_and_found.exception.ResourceNotFoundException;
import com.campus.lost_and_found.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse registerUser(UserRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("An account with email " + request.getEmail() + " already exists.");
        }

        String role = request.getRole();
        if (role != null && ("ROLE_ADMIN".equalsIgnoreCase(role.trim()) || "ADMIN".equalsIgnoreCase(role.trim()))) {
            role = "ROLE_ADMIN";
        } else if (role != null && ("ROLE_STAFF".equalsIgnoreCase(role.trim()) || "STAFF".equalsIgnoreCase(role.trim()))) {
            role = "ROLE_STAFF";
        } else {
            role = "ROLE_STUDENT";
        }

        User user = new User(
                request.getName(),
                request.getEmail().toLowerCase().trim(),
                passwordEncoder.encode(request.getPassword()),
                role
        );

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    public User getUserEntityById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
    }

    public User getUserByEmailEntity(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    public UserResponse getUserById(Long id) {
        return mapToResponse(getUserEntityById(id));
    }

    public UserResponse getUserByEmail(String email) {
        return mapToResponse(getUserByEmailEntity(email));
    }

    public UserResponse mapToResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}