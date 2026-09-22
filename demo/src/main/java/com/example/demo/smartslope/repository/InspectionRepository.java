package com.example.demo.smartslope.repository;

import com.example.demo.smartslope.entity.Inspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InspectionRepository extends JpaRepository<Inspection, Long> {
    List<Inspection> findByMonitoringSiteId(Long siteId);
}
