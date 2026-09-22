package com.example.demo.smartslope.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertDTO {

    private Long id;

    @NotNull(message = "Prediction ID is required")
    private Long predictionId;

    private Long siteId;
    private String siteName;
    private String severity; // CRITICAL, WARNING, INFORMATION

    @NotBlank(message = "Alert type is required")
    private String alertType;

    @NotBlank(message = "Alert message is required")
    private String message;

    @NotBlank(message = "Alert status is required")
    private String status;

    private LocalDateTime sentAt;
}
