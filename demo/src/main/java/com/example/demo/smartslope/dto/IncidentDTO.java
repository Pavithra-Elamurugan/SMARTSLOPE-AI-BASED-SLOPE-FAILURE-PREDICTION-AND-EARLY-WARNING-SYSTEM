package com.example.demo.smartslope.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentDTO {

    private Long id;

    @NotNull(message = "Monitoring site ID is required")
    private Long monitoringSiteId;

    private String siteName;

    @NotBlank(message = "Type is required")
    private String type;

    @NotBlank(message = "Severity is required")
    private String severity;

    private String date;
    private String time;
    private String description;
    private String status;
    private String cause;
    private String impact;
    private String damage;
    private String action;
    private String roadStatus;
    private LocalDateTime createdAt;
}
