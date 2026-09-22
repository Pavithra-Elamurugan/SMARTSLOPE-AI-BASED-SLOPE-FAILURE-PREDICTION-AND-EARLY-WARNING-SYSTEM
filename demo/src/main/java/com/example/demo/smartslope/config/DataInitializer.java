package com.example.demo.smartslope.config;

import com.example.demo.smartslope.entity.Role;
import com.example.demo.smartslope.entity.User;
import com.example.demo.smartslope.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @org.springframework.beans.factory.annotation.Value("${smartslope.admin.name:System Administrator}")
    private String adminName;

    @org.springframework.beans.factory.annotation.Value("${smartslope.admin.email:admin@smartslope.local}")
    private String adminEmail;

    @org.springframework.beans.factory.annotation.Value("${smartslope.admin.password:admin123}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(50)");
        } catch (Exception e) {}
        try {
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN requested_role VARCHAR(50)");
        } catch (Exception e) {}

        // Guarantee core default accounts have valid BCrypt passwords, role assignments, and active=true
        createOrUpdateDefaultUser("admin@smartslope.local", "System Administrator", "admin123", Role.ADMIN);
        createOrUpdateDefaultUser("admin@smartslope.io", "System Administrator Alias", "admin123", Role.ADMIN);
        createOrUpdateDefaultUser("engineer@smartslope.local", "Field Engineer", "engineer123", Role.ENGINEER);
        createOrUpdateDefaultUser("safety@smartslope.local", "Safety Officer", "safety123", Role.SAFETY_OFFICER);
        createOrUpdateDefaultUser("Admin@gmail.com", "Administrator", "Admin@12345", Role.ADMIN);
    }

    private void createOrUpdateDefaultUser(String email, String name, String rawPassword, Role role) {
        userRepository.findByEmail(email).ifPresentOrElse(
            existing -> {
                existing.setPassword(passwordEncoder.encode(rawPassword));
                existing.setRole(role);
                existing.setActive(true);
                if (existing.getName() == null || existing.getName().isBlank()) {
                    existing.setName(name);
                }
                userRepository.save(existing);
                log.info("[DATA INITIALIZER] Verified operational account: {} ({})", email, role);
            },
            () -> {
                User newUser = User.builder()
                        .name(name)
                        .email(email)
                        .password(passwordEncoder.encode(rawPassword))
                        .role(role)
                        .requestedRole(role)
                        .phoneNumber("+91-9876543210")
                        .active(true)
                        .createdAt(LocalDateTime.now())
                        .build();
                userRepository.save(newUser);
                log.info("[DATA INITIALIZER] Created operational account: {} ({})", email, role);
            }
        );
    }
}
