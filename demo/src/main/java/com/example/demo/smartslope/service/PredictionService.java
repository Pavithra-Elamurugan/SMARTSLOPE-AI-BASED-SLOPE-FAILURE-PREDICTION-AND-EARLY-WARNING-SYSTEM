package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.PredictionDTO;
import java.util.List;
import java.util.Optional;

public interface PredictionService {

    List<PredictionDTO> findAll();

    Optional<PredictionDTO> findById(Long id);

    PredictionDTO save(PredictionDTO predictionDTO);

    PredictionDTO update(Long id, PredictionDTO predictionDTO);

    void delete(Long id);
}
