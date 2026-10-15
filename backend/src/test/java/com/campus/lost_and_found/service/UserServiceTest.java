package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.UserRegisterRequest;
import com.campus.lost_and_found.dto.UserResponse;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.exception.DuplicateResourceException;
import com.campus.lost_and_found.exception.ResourceNotFoundException;
import com.campus.lost_and_found.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("Should register new user and hash password with BCrypt")
    void registerUser_Success() {
        UserRegisterRequest request = new UserRegisterRequest(
                "Alice Student",
                "alice@campus.edu",
                "RawPassword@123",
                "ROLE_STUDENT"
        );

        when(userRepository.existsByEmail("alice@campus.edu")).thenReturn(false);
        when(passwordEncoder.encode("RawPassword@123")).thenReturn("$2a$10$hashedPasswordBcrypted");

        User savedUser = new User("Alice Student", "alice@campus.edu", "$2a$10$hashedPasswordBcrypted", "ROLE_STUDENT");
        savedUser.setId(101L);
        savedUser.setCreatedAt(LocalDateTime.now());

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        UserResponse response = userService.registerUser(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(101L);
        assertThat(response.getName()).isEqualTo("Alice Student");
        assertThat(response.getEmail()).isEqualTo("alice@campus.edu");
        assertThat(response.getRole()).isEqualTo("ROLE_STUDENT");

        // Verify password was securely hashed before save
        verify(passwordEncoder, times(1)).encode("RawPassword@123");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should prevent registration with duplicate email")
    void registerUser_DuplicateEmail_ThrowsException() {
        UserRegisterRequest request = new UserRegisterRequest(
                "Duplicate Bob",
                "existing@campus.edu",
                "Password@123",
                "ROLE_STUDENT"
        );

        when(userRepository.existsByEmail("existing@campus.edu")).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () -> {
            userService.registerUser(request);
        });

        assertThat(ex.getMessage()).contains("already exists");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should retrieve existing user by ID")
    void getUserById_Success() {
        User user = new User("Charlie Staff", "charlie@campus.edu", "hashed", "ROLE_STAFF");
        user.setId(202L);

        when(userRepository.findById(202L)).thenReturn(Optional.of(user));

        UserResponse response = userService.getUserById(202L);

        assertThat(response.getId()).isEqualTo(202L);
        assertThat(response.getName()).isEqualTo("Charlie Staff");
        assertThat(response.getRole()).isEqualTo("ROLE_STAFF");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when user does not exist")
    void getUserById_NotFound_ThrowsException() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            userService.getUserById(999L);
        });
    }
}
