package com.example.demo.smartslope.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
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
public class MonitoringSiteDTO {

    private Long id;

    @NotBlank(message = "Site name is required")
    @JsonAlias({"name", "locationName", "site_name"})
    private String siteName;

    @NotBlank(message = "Location is required")
    @JsonAlias({"address", "locationAddress", "description"})
    private String location;

    private String siteType;
    private Double latitude;
    private Double longitude;
    private Double slopeAngle;
    private String soilType;
    private String geologicalCondition;
    private String status;
    private Long userId;
    private LocalDateTime createdAt;
}
