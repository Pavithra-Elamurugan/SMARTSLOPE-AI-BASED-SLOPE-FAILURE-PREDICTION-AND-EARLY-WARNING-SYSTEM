package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.InspectionDTO;
import com.example.demo.smartslope.entity.Inspection;
import com.example.demo.smartslope.entity.MonitoringSite;
import com.example.demo.smartslope.repository.InspectionRepository;
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
public class InspectionServiceImpl implements InspectionService {

    private final InspectionRepository repository;
    private final MonitoringSiteRepository siteRepository;

    @Override
    public List<InspectionDTO> findAll() {
        return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<InspectionDTO> findById(Long id) {
        return repository.findById(id).map(this::toDto);
    }

    @Override
    public List<InspectionDTO> findBySiteId(Long siteId) {
        return repository.findByMonitoringSiteId(siteId).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public InspectionDTO save(InspectionDTO dto) {
        MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
                .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));

        Inspection i = Inspection.builder()
                .monitoringSite(site)
                .inspector(dto.getInspector())
                .type(dto.getType())
                .date(dto.getDate())
                .nextDate(dto.getNextDate())
                .status(dto.getStatus() != null ? dto.getStatus() : "Scheduled")
                .risk(dto.getRisk() != null ? dto.getRisk() : "SAFE")
                .findings(dto.getFindings())
                .weather(dto.getWeather())
                .crack(dto.getCrack())
                .notes(dto.getNotes())
                .build();

        return toDto(repository.save(i));
    }

    @Override
    public InspectionDTO update(Long id, InspectionDTO dto) {
        Inspection existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Inspection not found: " + id));

        if (dto.getMonitoringSiteId() != null) {
            MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
                    .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));
            existing.setMonitoringSite(site);
        }

        if (dto.getInspector() != null) existing.setInspector(dto.getInspector());
        if (dto.getType() != null) existing.setType(dto.getType());
        if (dto.getDate() != null) existing.setDate(dto.getDate());
        if (dto.getNextDate() != null) existing.setNextDate(dto.getNextDate());
        if (dto.getStatus() != null) existing.setStatus(dto.getStatus());
        if (dto.getRisk() != null) existing.setRisk(dto.getRisk());
        if (dto.getFindings() != null) existing.setFindings(dto.getFindings());
        if (dto.getWeather() != null) existing.setWeather(dto.getWeather());
        if (dto.getCrack() != null) existing.setCrack(dto.getCrack());
        if (dto.getNotes() != null) existing.setNotes(dto.getNotes());

        return toDto(repository.save(existing));
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private InspectionDTO toDto(Inspection i) {
        return InspectionDTO.builder()
                .id(i.getId())
                .monitoringSiteId(i.getMonitoringSite() != null ? i.getMonitoringSite().getId() : null)
                .siteName(i.getMonitoringSite() != null ? i.getMonitoringSite().getSiteName() : null)
                .inspector(i.getInspector())
                .type(i.getType())
                .date(i.getDate())
                .nextDate(i.getNextDate())
                .status(i.getStatus())
                .risk(i.getRisk())
                .findings(i.getFindings())
                .weather(i.getWeather())
                .crack(i.getCrack())
                .notes(i.getNotes())
                .createdAt(i.getCreatedAt())
                .build();
    }
}
