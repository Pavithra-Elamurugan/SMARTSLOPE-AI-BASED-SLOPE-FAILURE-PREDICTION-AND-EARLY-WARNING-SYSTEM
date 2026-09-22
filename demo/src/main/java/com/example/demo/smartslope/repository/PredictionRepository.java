package com.example.demo.smartslope.repository;

import com.example.demo.smartslope.entity.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    List<Prediction> findByMonitoringSiteId(Long siteId);
    List<Prediction> findByMonitoringSiteIdOrderByPredictionTimeDesc(Long siteId);
}
