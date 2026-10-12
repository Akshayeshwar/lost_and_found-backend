package com.campus.lost_and_found.controller;

import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.service.UserService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;

    public UserController(UserService userService,
                          AuthenticationManager authenticationManager) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/register")
    public Map<String, Object> registerUser(@RequestBody User user) {

        User savedUser = userService.registerUser(user);

        Map<String, Object> response = new HashMap<>();

        response.put("id", savedUser.getId());
        response.put("name", savedUser.getName());
        response.put("email", savedUser.getEmail());
        response.put("role", savedUser.getRole());

        return response;
    }

    @PostMapping("/login")
    public Map<String, Object> loginUser(@RequestBody User user) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getEmail(),
                        user.getPassword()
                )
        );

        Map<String, Object> response = new HashMap<>();

        response.put("message", "Login successful");
        response.put("email", user.getEmail());

        return response;
    }
}