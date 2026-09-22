package com.example.demo.smartslope.repository;

import com.example.demo.smartslope.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByPredictionMonitoringSiteId(Long siteId);
    List<Alert> findBySiteId(Long siteId);
    List<Alert> findBySiteIdAndStatusIn(Long siteId, List<String> statuses);
}
