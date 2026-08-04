package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.SensorDataDTO;
import java.util.List;
import java.util.Optional;

public interface SensorDataService {

    List<SensorDataDTO> findAll();

    Optional<SensorDataDTO> findById(Long id);

    SensorDataDTO save(SensorDataDTO sensorDataDTO);

    SensorDataDTO update(Long id, SensorDataDTO sensorDataDTO);

    void delete(Long id);
}
