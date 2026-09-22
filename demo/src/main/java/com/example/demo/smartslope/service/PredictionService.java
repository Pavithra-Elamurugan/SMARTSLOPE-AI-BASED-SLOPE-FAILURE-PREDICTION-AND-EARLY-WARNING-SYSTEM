package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.PredictionDTO;
import com.example.demo.smartslope.dto.SensorDataDTO;
import java.util.List;
import java.util.Optional;

public interface PredictionService {

    List<PredictionDTO> findAll();

    Optional<PredictionDTO> findById(Long id);

    List<PredictionDTO> findBySiteId(Long siteId);

    PredictionDTO save(PredictionDTO predictionDTO);

    PredictionDTO update(Long id, PredictionDTO predictionDTO);

    void delete(Long id);

    PredictionDTO evaluateSite(Long siteId, SensorDataDTO customSensorData);

    PredictionDTO analyzeLocation(PredictionDTO request);
}
