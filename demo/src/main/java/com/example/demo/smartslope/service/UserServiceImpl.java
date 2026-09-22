package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.UserDTO;
import com.example.demo.smartslope.entity.Role;
import com.example.demo.smartslope.entity.User;
import com.example.demo.smartslope.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<UserDTO> findAll() {
        return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<UserDTO> findById(Long id) {
        return repository.findById(id).map(this::toDto);
    }

    @Override
    public UserDTO save(UserDTO dto) {
        if (repository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email address is already registered: " + dto.getEmail());
        }

        String rawPassword = dto.getPassword() != null ? dto.getPassword() : "default123";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        User u = User.builder()
            .name(dto.getName())
            .email(dto.getEmail())
            .password(encodedPassword)
            .role(dto.getRole() != null ? dto.getRole() : Role.PENDING)
            .requestedRole(dto.getRequestedRole())
            .phoneNumber(dto.getPhoneNumber())
            .active(dto.getActive() != null ? dto.getActive() : true)
            .createdAt(LocalDateTime.now())
            .build();

        return toDto(repository.save(u));
    }

    @Override
    public UserDTO update(Long id, UserDTO dto) {
        User existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));

        // Protection: Check if attempting to demote or deactivate the last active ADMIN
        if (existing.getRole() == Role.ADMIN) {
            boolean isDemotingRole = dto.getRole() != null && dto.getRole() != Role.ADMIN;
            boolean isDeactivating = dto.getActive() != null && !dto.getActive();

            if (isDemotingRole || isDeactivating) {
                long activeAdminCount = repository.findAll().stream()
                        .filter(u -> u.getRole() == Role.ADMIN && Boolean.TRUE.equals(u.getActive()))
                        .count();
                if (activeAdminCount <= 1) {
                    throw new IllegalStateException("Cannot demote or deactivate the last active Administrator account.");
                }
            }
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            existing.setName(dto.getName());
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            existing.setEmail(dto.getEmail());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        if (dto.getRole() != null) {
            existing.setRole(dto.getRole());
        }
        if (dto.getRequestedRole() != null) {
            existing.setRequestedRole(dto.getRequestedRole());
        }
        if (dto.getPhoneNumber() != null) {
            existing.setPhoneNumber(dto.getPhoneNumber());
        }
        if (dto.getActive() != null) {
            existing.setActive(dto.getActive());
        }

        return toDto(repository.save(existing));
    }

    @Override
    public void delete(Long id) {
        User existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));

        if (existing.getRole() == Role.ADMIN && Boolean.TRUE.equals(existing.getActive())) {
            long activeAdminCount = repository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN && Boolean.TRUE.equals(u.getActive()))
                    .count();
            if (activeAdminCount <= 1) {
                throw new IllegalStateException("Cannot delete the last active Administrator account.");
            }
        }

        repository.deleteById(id);
    }

    private UserDTO toDto(User u) {
        return UserDTO.builder()
            .id(u.getId())
            .name(u.getName())
            .email(u.getEmail())
            .password(null) // Never expose password in DTO
            .role(u.getRole())
            .requestedRole(u.getRequestedRole())
            .phoneNumber(u.getPhoneNumber())
            .active(u.getActive())
            .createdAt(u.getCreatedAt())
            .build();
    }
}
