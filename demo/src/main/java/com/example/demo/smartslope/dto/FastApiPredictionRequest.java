package com.example.demo.smartslope.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FastApiPredictionRequest {

    @JsonProperty("monitoring_site_id")
    private Long monitoringSiteId;

    private Double rainfall;

    @JsonProperty("soil_moisture")
    private Double soilMoisture;

    private Double temperature;
    private Double humidity;

    @JsonProperty("ground_vibration")
    private Double groundVibration;

    @JsonProperty("water_level")
    private Double waterLevel;

    private Double tilt;

    @JsonProperty("crack_width")
    private Double crackWidth;

    @JsonProperty("ground_movement")
    private Double groundMovement;

    @JsonProperty("slope_angle")
    private Double slopeAngle;

    @JsonProperty("soil_type")
    private String soilType;
}
