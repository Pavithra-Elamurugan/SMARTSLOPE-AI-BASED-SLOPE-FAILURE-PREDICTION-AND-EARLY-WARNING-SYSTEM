package com.example.demo.smartslope.repository;

import com.example.demo.smartslope.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByMonitoringSiteId(Long siteId);
}
