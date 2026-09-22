package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.IncidentDTO;
import com.example.demo.smartslope.entity.Incident;
import com.example.demo.smartslope.entity.MonitoringSite;
import com.example.demo.smartslope.repository.IncidentRepository;
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
public class IncidentServiceImpl implements IncidentService {

    private final IncidentRepository repository;
    private final MonitoringSiteRepository siteRepository;

    @Override
    public List<IncidentDTO> findAll() {
        return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<IncidentDTO> findById(Long id) {
        return repository.findById(id).map(this::toDto);
    }

    @Override
    public List<IncidentDTO> findBySiteId(Long siteId) {
        return repository.findByMonitoringSiteId(siteId).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public IncidentDTO save(IncidentDTO dto) {
        MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
                .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));

        Incident inc = Incident.builder()
                .monitoringSite(site)
                .type(dto.getType())
                .severity(dto.getSeverity())
                .date(dto.getDate())
                .time(dto.getTime())
                .description(dto.getDescription())
                .status(dto.getStatus() != null ? dto.getStatus() : "Reported")
                .cause(dto.getCause())
                .impact(dto.getImpact())
                .damage(dto.getDamage())
                .action(dto.getAction())
                .roadStatus(dto.getRoadStatus())
                .build();

        return toDto(repository.save(inc));
    }

    @Override
    public IncidentDTO update(Long id, IncidentDTO dto) {
        Incident existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found: " + id));

        if (dto.getMonitoringSiteId() != null) {
            MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
                    .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));
            existing.setMonitoringSite(site);
        }

        if (dto.getType() != null) existing.setType(dto.getType());
        if (dto.getSeverity() != null) existing.setSeverity(dto.getSeverity());
        if (dto.getDate() != null) existing.setDate(dto.getDate());
        if (dto.getTime() != null) existing.setTime(dto.getTime());
        if (dto.getDescription() != null) existing.setDescription(dto.getDescription());
        if (dto.getStatus() != null) existing.setStatus(dto.getStatus());
        if (dto.getCause() != null) existing.setCause(dto.getCause());
        if (dto.getImpact() != null) existing.setImpact(dto.getImpact());
        if (dto.getDamage() != null) existing.setDamage(dto.getDamage());
        if (dto.getAction() != null) existing.setAction(dto.getAction());
        if (dto.getRoadStatus() != null) existing.setRoadStatus(dto.getRoadStatus());

        return toDto(repository.save(existing));
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private IncidentDTO toDto(Incident i) {
        return IncidentDTO.builder()
                .id(i.getId())
                .monitoringSiteId(i.getMonitoringSite() != null ? i.getMonitoringSite().getId() : null)
                .siteName(i.getMonitoringSite() != null ? i.getMonitoringSite().getSiteName() : null)
                .type(i.getType())
                .severity(i.getSeverity())
                .date(i.getDate())
                .time(i.getTime())
                .description(i.getDescription())
                .status(i.getStatus())
                .cause(i.getCause())
                .impact(i.getImpact())
                .damage(i.getDamage())
                .action(i.getAction())
                .roadStatus(i.getRoadStatus())
                .createdAt(i.getCreatedAt())
                .build();
    }
}
