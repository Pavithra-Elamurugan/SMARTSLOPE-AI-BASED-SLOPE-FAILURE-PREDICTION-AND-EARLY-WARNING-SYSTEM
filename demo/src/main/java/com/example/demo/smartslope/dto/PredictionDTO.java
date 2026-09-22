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
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionDTO {

    private Long id;

    @NotNull(message = "Monitoring site ID is required")
    private Long monitoringSiteId;

    private String siteName;

    @NotNull(message = "Risk level is required")
    private RiskLevel riskLevel;

    @NotNull(message = "Confidence score is required")
    @DecimalMin(value = "0.0", message = "Confidence score cannot be less than 0")
    @DecimalMax(value = "100.0", message = "Confidence score cannot be greater than 100")
    private Double confidenceScore;

    private Double riskProbability;

    private LocalDateTime predictionTime;

    private String recommendation;

    private List<String> factors;

    private List<Integer> probabilities; // [safe %, moderate %, high %]

    // Input features used for prediction
    private Double rainfall;
    private Double soilMoisture;
    private Double groundVibration;
    private Double waterLevel;
    private Double tilt;
    private Double crackWidth;
    private Double groundMovement;
    private Double slopeAngle;
    private String soilType;
    private Double latitude;
    private Double longitude;
    private String locationName;
    private String dataSourceInfo;
    private Boolean hasSensors;
}
