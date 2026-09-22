package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.HistoricalRecordDTO;
import com.example.demo.smartslope.entity.HistoricalRecord;
import com.example.demo.smartslope.entity.MonitoringSite;
import com.example.demo.smartslope.repository.HistoricalRecordRepository;
import com.example.demo.smartslope.repository.MonitoringSiteRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class HistoricalRecordServiceImpl implements HistoricalRecordService {

    private final HistoricalRecordRepository repository;
    private final MonitoringSiteRepository siteRepository;

    @Override
    public List<HistoricalRecordDTO> findAll() {
        return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<HistoricalRecordDTO> findById(Long id) {
        return repository.findById(id).map(this::toDto);
    }

    @Override
    public HistoricalRecordDTO save(HistoricalRecordDTO dto) {
        MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
            .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));

        HistoricalRecord hr = HistoricalRecord.builder()
            .monitoringSite(site)
            .failureDate(dto.getFailureDate())
            .failureType(dto.getFailureType())
            .description(dto.getDescription())
            .damageLevel(dto.getDamageLevel())
            .build();

        return toDto(repository.save(hr));
    }

    @Override
    public HistoricalRecordDTO update(Long id, HistoricalRecordDTO dto) {
        HistoricalRecord existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("HistoricalRecord not found: " + id));

        if (dto.getMonitoringSiteId() != null) {
            MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
                .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));
            existing.setMonitoringSite(site);
        }

        existing.setFailureDate(dto.getFailureDate());
        existing.setFailureType(dto.getFailureType());
        existing.setDescription(dto.getDescription());
        existing.setDamageLevel(dto.getDamageLevel());

        return toDto(repository.save(existing));
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private HistoricalRecordDTO toDto(HistoricalRecord r) {
        return HistoricalRecordDTO.builder()
            .id(r.getId())
            .monitoringSiteId(r.getMonitoringSite() != null ? r.getMonitoringSite().getId() : null)
            .failureDate(r.getFailureDate())
            .failureType(r.getFailureType())
            .description(r.getDescription())
            .damageLevel(r.getDamageLevel())
            .build();
    }
}
