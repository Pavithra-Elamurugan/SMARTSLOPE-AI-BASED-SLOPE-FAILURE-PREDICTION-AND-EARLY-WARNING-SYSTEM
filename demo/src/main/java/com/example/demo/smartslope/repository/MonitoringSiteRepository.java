package com.example.demo.smartslope.repository;

import com.example.demo.smartslope.entity.MonitoringSite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MonitoringSiteRepository extends JpaRepository<MonitoringSite, Long> {
}
