package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.MonitoringSiteDTO;
import java.util.List;
import java.util.Optional;

public interface MonitoringSiteService {

    List<MonitoringSiteDTO> findAll();

    Optional<MonitoringSiteDTO> findById(Long id);

    MonitoringSiteDTO save(MonitoringSiteDTO monitoringSiteDTO);

    MonitoringSiteDTO update(Long id, MonitoringSiteDTO monitoringSiteDTO);

    void delete(Long id);
}
