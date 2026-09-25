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
public class SensorDataDTO {

    private Long id;

    @NotNull(message = "Monitoring site ID is required")
    private Long monitoringSiteId;

    private Double rainfall;
    private Double rainfall24h;
    private Double rainfall72h;
    private Double soilMoisture;
    private Double temperature;
    private Double humidity;
    private Double groundVibration;
    private Double waterLevel;
    private Double tilt;
    private Double crackWidth;
    private Double groundMovement;

    private Double windSpeed;
    private Double surfacePressure;
    private Double elevation;
    private Double slopeAngle;
    private String soilType;
    private Double latitude;
    private Double longitude;

    private LocalDateTime recordedAt;
}
