package com.example.demo.smartslope.repository;

import com.example.demo.smartslope.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SensorDataRepository extends JpaRepository<SensorData, Long> {
    boolean existsByMonitoringSiteId(Long siteId);
    boolean existsBySiteId(Long siteId);
}
