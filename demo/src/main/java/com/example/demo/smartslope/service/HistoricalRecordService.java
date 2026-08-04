package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.HistoricalRecordDTO;
import java.util.List;
import java.util.Optional;

public interface HistoricalRecordService {

    List<HistoricalRecordDTO> findAll();

    Optional<HistoricalRecordDTO> findById(Long id);

    HistoricalRecordDTO save(HistoricalRecordDTO historicalRecordDTO);

    HistoricalRecordDTO update(Long id, HistoricalRecordDTO historicalRecordDTO);

    void delete(Long id);
}
