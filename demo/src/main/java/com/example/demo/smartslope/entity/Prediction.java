package com.example.demo.smartslope.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "predictions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Prediction {

    @Id
    @Column(name = "prediction_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "monitoring_site_id", nullable = false)
    private MonitoringSite monitoringSite;

    @Column(name = "site_id")
    private Long siteId;

    @Column(name = "sensor_id")
    private Long sensorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RiskLevel riskLevel;

    @Column(nullable = false)
    private Double confidenceScore;

    @Column
    private Double probability;

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(nullable = false)
    private LocalDateTime predictionTime;

    @Column(length = 1000)
    private String recommendation;
}
