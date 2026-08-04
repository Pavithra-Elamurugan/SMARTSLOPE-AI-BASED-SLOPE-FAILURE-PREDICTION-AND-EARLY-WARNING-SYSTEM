package com.example.demo.smartslope.dto;

import jakarta.validation.constraints.NotNull;
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
public class HistoricalRecordDTO {

    private Long id;

    @NotNull(message = "Monitoring site ID is required")
    private Long monitoringSiteId;

    private LocalDateTime failureDate;
    private String failureType;
    private String description;
    private String damageLevel;
}
