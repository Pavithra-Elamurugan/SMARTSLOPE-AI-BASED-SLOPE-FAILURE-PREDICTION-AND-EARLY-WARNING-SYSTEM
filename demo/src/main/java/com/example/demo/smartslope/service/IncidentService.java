package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.IncidentDTO;
import java.util.List;
import java.util.Optional;

public interface IncidentService {
    List<IncidentDTO> findAll();
    Optional<IncidentDTO> findById(Long id);
    List<IncidentDTO> findBySiteId(Long siteId);
    IncidentDTO save(IncidentDTO dto);
    IncidentDTO update(Long id, IncidentDTO dto);
    void delete(Long id);
}
