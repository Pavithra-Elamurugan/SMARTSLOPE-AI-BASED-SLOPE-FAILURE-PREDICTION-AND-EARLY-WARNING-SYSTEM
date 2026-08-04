package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.AlertDTO;
import java.util.List;
import java.util.Optional;

public interface AlertService {

    List<AlertDTO> findAll();

    Optional<AlertDTO> findById(Long id);

    AlertDTO save(AlertDTO alertDTO);

    AlertDTO update(Long id, AlertDTO alertDTO);

    void delete(Long id);
}
