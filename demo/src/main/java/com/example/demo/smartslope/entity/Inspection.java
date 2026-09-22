package com.example.demo.smartslope.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "inspections")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Inspection {

    @Id
    @Column(name = "inspection_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "monitoring_site_id", nullable = false)
    private MonitoringSite monitoringSite;

    @Column(nullable = false)
    private String inspector;

    @Column(nullable = false)
    private String type;

    private String date;
    private String nextDate;
    private String status;
    private String risk;
    
    @Column(length = 1000)
    private String findings;
    
    private String weather;
    private String crack;
    
    @Column(length = 1000)
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
