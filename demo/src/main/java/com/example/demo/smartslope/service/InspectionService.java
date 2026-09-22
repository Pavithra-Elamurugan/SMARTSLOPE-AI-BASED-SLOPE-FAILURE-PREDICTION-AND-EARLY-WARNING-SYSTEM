package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.InspectionDTO;
import java.util.List;
import java.util.Optional;

public interface InspectionService {
    List<InspectionDTO> findAll();
    Optional<InspectionDTO> findById(Long id);
    List<InspectionDTO> findBySiteId(Long siteId);
    InspectionDTO save(InspectionDTO dto);
    InspectionDTO update(Long id, InspectionDTO dto);
    void delete(Long id);
}
