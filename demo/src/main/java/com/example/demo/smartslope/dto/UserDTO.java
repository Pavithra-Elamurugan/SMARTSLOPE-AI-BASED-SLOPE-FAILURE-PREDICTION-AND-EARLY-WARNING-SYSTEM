package com.example.demo.smartslope.dto;

import com.example.demo.smartslope.entity.Role;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private Long id;
    private String name;

    @Email(message = "Email must be valid")
    private String email;

    private String password;
    private Role role;
    private Role requestedRole;
    private String phoneNumber;
    private Boolean active;
    private LocalDateTime createdAt;
}
