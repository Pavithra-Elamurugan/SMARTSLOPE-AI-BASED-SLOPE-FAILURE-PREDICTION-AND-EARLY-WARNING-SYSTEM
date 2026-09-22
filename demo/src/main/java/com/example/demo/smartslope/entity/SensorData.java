package com.example.demo.smartslope.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "sensor_data")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorData {

    @Id
    @Column(name = "sensor_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "monitoring_site_id", nullable = false)
    private MonitoringSite monitoringSite;

    @Column(name = "site_id")
    private Long siteId;

    private Double rainfall;
    private Double soilMoisture;
    private Double temperature;
    private Double humidity;
    private Double groundVibration;

    @Column(name = "vibration")
    private Double vibration;

    private Double waterLevel;

    @Column(name = "groundwater_level")
    private Double groundwaterLevel;

    private Double tilt;

    @Column(name = "ground_tilt")
    private Double groundTilt;

    private Double crackWidth;
    private Double groundMovement;

    @Column(name = "slope_angle")
    private Double slopeAngle;

    private LocalDateTime recordedAt;
}
