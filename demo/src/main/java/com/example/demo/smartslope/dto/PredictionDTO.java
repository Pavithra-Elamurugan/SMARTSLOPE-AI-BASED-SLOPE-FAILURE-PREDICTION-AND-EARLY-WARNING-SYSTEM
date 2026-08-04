package com.example.demo.smartslope.dto;

import com.example.demo.smartslope.entity.RiskLevel;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class PredictionDTO {

    private Long id;

    @NotNull(message = "Monitoring site ID is required")
    private Long monitoringSiteId;

    @NotNull(message = "Risk level is required")
    private RiskLevel riskLevel;

    @NotNull(message = "Confidence score is required")
    @DecimalMin(value = "0.0", message = "Confidence score cannot be less than 0")
    @DecimalMax(value = "1.0", message = "Confidence score cannot be greater than 1")
    private Double confidenceScore;

    @NotNull(message = "Prediction time is required")
    private LocalDateTime predictionTime;

    private String recommendation;
}
