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
public class InspectionDTO {

    private Long id;

    @NotNull(message = "Monitoring site ID is required")
    private Long monitoringSiteId;

    private String siteName;

    @NotBlank(message = "Inspector is required")
    private String inspector;

    @NotBlank(message = "Type is required")
    private String type;

    private String date;
    private String nextDate;
    private String status;
    private String risk;
    private String findings;
    private String weather;
    private String crack;
    private String notes;
    private LocalDateTime createdAt;
}
