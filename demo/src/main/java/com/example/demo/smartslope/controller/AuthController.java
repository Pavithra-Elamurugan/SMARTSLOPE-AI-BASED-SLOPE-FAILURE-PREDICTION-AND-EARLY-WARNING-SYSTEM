package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.config.JwtTokenProvider;
import com.example.demo.smartslope.dto.AuthResponse;
import com.example.demo.smartslope.dto.LoginRequest;
import com.example.demo.smartslope.dto.RegisterRequest;
import com.example.demo.smartslope.entity.Role;
import com.example.demo.smartslope.entity.User;
import com.example.demo.smartslope.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        log.info("[AUTH-LOGIN] Request received for email: {}", request.getEmail());
        try {
            User user = userRepository.findByEmail(request.getEmail())
                    .or(() -> userRepository.findByEmail(request.getEmail() != null ? request.getEmail().toLowerCase() : ""))
                    .orElseThrow(() -> {
                        log.warn("[AUTH-LOGIN] User lookup failed for email: {}", request.getEmail());
                        return new IllegalArgumentException("Invalid email or password");
                    });

            log.info("[AUTH-LOGIN] User lookup successful for id: {}, email: {}, active status: {}, role: {}",
                    user.getId(), user.getEmail(), user.getActive(), user.getRole());

            if (!Boolean.TRUE.equals(user.getActive())) {
                log.warn("[AUTH-LOGIN] Login rejected: user active status is false for email: {}", user.getEmail());
                Map<String, Object> err = new HashMap<>();
                err.put("status", HttpStatus.FORBIDDEN.value());
                err.put("error", "Forbidden");
                err.put("message", "Account deactivated. Please contact system administrator.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
            }

            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword())
            );
            log.info("[AUTH-LOGIN] Authentication manager result: SUCCESS for email: {}", user.getEmail());

            SecurityContextHolder.getContext().setAuthentication(authentication);

            String jwt = tokenProvider.generateToken(
                    user.getEmail(),
                    user.getRole().name(),
                    user.getName(),
                    user.getId()
            );
            log.info("[AUTH-LOGIN] JWT generation successful for email: {}", user.getEmail());

            AuthResponse response = AuthResponse.builder()
                    .token(jwt)
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .requestedRole(user.getRequestedRole())
                    .tokenType("Bearer")
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            log.error("[AUTH-LOGIN] Login failed for email: {}. Exception: {}", request.getEmail(), ex.getMessage());
            Map<String, Object> err = new HashMap<>();
            err.put("status", HttpStatus.UNAUTHORIZED.value());
            err.put("error", "Unauthorized");
            err.put("message", ex.getMessage() != null ? ex.getMessage() : "Invalid email or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            Map<String, Object> err = new HashMap<>();
            err.put("status", HttpStatus.BAD_REQUEST.value());
            err.put("error", "Bad Request");
            err.put("message", "Email address is already registered.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        Role requested = request.getRequestedRole() != null ? request.getRequestedRole() : request.getRole();
        if (requested == Role.ADMIN) {
            Map<String, Object> err = new HashMap<>();
            err.put("status", HttpStatus.BAD_REQUEST.value());
            err.put("error", "Bad Request");
            err.put("message", "Public registration as ADMIN is strictly prohibited.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        if (requested == null || requested == Role.PENDING) {
            requested = Role.PUBLIC_USER;
        }

        // Standard public registrations MUST start with PENDING role
        Role assignedRole = Role.PENDING;

        User newUser = User.builder()
                .name(request.getName() != null ? request.getName().trim() : "")
                .email(request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "")
                .password(passwordEncoder.encode(request.getPassword()))
                .role(assignedRole)
                .requestedRole(requested)
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber() : "")
                .active(true)
                .createdAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(newUser);

        String jwt = tokenProvider.generateToken(
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getName(),
                savedUser.getId()
        );

        AuthResponse response = AuthResponse.builder()
                .token(jwt)
                .id(savedUser.getId())
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .requestedRole(savedUser.getRequestedRole())
                .tokenType("Bearer")
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, Object> err = new HashMap<>();
            err.put("status", HttpStatus.UNAUTHORIZED.value());
            err.put("error", "Unauthorized");
            err.put("message", "Not authenticated");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Map<String, Object> safeUser = new HashMap<>();
        safeUser.put("id", user.getId());
        safeUser.put("name", user.getName());
        safeUser.put("email", user.getEmail());
        safeUser.put("role", user.getRole());
        safeUser.put("requestedRole", user.getRequestedRole());
        safeUser.put("phoneNumber", user.getPhoneNumber());
        safeUser.put("active", user.getActive());
        safeUser.put("createdAt", user.getCreatedAt());

        return ResponseEntity.ok(safeUser);
    }
}
