package com.example.demo.smartslope.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "incidents")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Incident {

    @Id
    @Column(name = "incident_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "monitoring_site_id", nullable = false)
    private MonitoringSite monitoringSite;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String severity;

    private String date;
    private String time;
    
    @Column(length = 1000)
    private String description;
    
    private String status;
    private String cause;
    private String impact;
    private String damage;
    private String action;
    private String roadStatus;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
