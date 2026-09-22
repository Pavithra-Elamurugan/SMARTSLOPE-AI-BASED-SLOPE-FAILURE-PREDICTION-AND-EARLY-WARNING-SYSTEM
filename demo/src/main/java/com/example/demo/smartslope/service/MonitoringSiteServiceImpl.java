package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.MonitoringSiteDTO;
import com.example.demo.smartslope.entity.MonitoringSite;
import com.example.demo.smartslope.entity.Role;
import com.example.demo.smartslope.entity.User;
import com.example.demo.smartslope.repository.MonitoringSiteRepository;
import com.example.demo.smartslope.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MonitoringSiteServiceImpl implements MonitoringSiteService {

    private final MonitoringSiteRepository repository;
    private final UserRepository userRepository;

    private User getCurrentAuthenticatedUser() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                return userRepository.findByEmail(email).orElse(null);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void checkSiteOwnership(MonitoringSite site) {
        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser != null && currentUser.getRole() == Role.PUBLIC_USER) {
            if (site.getUserId() == null || !site.getUserId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Access Denied: You do not have permission to access or modify this site.");
            }
        }
    }

    @Override
    public List<MonitoringSiteDTO> findAll() {
        User currentUser = getCurrentAuthenticatedUser();
        List<MonitoringSite> allSites = repository.findAll();
        if (currentUser != null && currentUser.getRole() == Role.PUBLIC_USER) {
            return allSites.stream()
                    .filter(s -> s.getUserId() != null && s.getUserId().equals(currentUser.getId()))
                    .map(this::toDto)
                    .collect(Collectors.toList());
        }
        return allSites.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<MonitoringSiteDTO> findById(Long id) {
        return repository.findById(id).map(site -> {
            checkSiteOwnership(site);
            return toDto(site);
        });
    }

    @Override
    public MonitoringSiteDTO save(MonitoringSiteDTO dto) {
        User currentUser = getCurrentAuthenticatedUser();
        Long ownerId = dto.getUserId();
        if (ownerId == null && currentUser != null) {
            ownerId = currentUser.getId();
        }

        MonitoringSite site = MonitoringSite.builder()
            .siteName(dto.getSiteName())
            .location(dto.getLocation())
            .siteType(dto.getSiteType() != null ? dto.getSiteType() : "Highway Cut Slope")
            .latitude(dto.getLatitude() != null ? dto.getLatitude() : 11.353)
            .longitude(dto.getLongitude() != null ? dto.getLongitude() : 76.795)
            .slopeAngle(dto.getSlopeAngle() != null ? dto.getSlopeAngle() : 35.0)
            .soilType(dto.getSoilType() != null ? dto.getSoilType() : "Residual Soil")
            .geologicalCondition(dto.getGeologicalCondition() != null ? dto.getGeologicalCondition() : "User configured monitoring site")
            .status(dto.getStatus() != null ? dto.getStatus() : "MONITORING")
            .userId(ownerId)
            .build();

        return toDto(repository.save(site));
    }

    @Override
    public MonitoringSiteDTO update(Long id, MonitoringSiteDTO dto) {
        MonitoringSite existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + id));

        checkSiteOwnership(existing);

        if (dto.getSiteName() != null) existing.setSiteName(dto.getSiteName());
        if (dto.getLocation() != null) existing.setLocation(dto.getLocation());
        if (dto.getSiteType() != null) existing.setSiteType(dto.getSiteType());
        if (dto.getLatitude() != null) existing.setLatitude(dto.getLatitude());
        if (dto.getLongitude() != null) existing.setLongitude(dto.getLongitude());
        if (dto.getSlopeAngle() != null) existing.setSlopeAngle(dto.getSlopeAngle());
        if (dto.getSoilType() != null) existing.setSoilType(dto.getSoilType());
        if (dto.getGeologicalCondition() != null) existing.setGeologicalCondition(dto.getGeologicalCondition());
        if (dto.getStatus() != null) existing.setStatus(dto.getStatus());
        if (dto.getUserId() != null) existing.setUserId(dto.getUserId());

        return toDto(repository.save(existing));
    }

    @Override
    public void delete(Long id) {
        MonitoringSite existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + id));

        checkSiteOwnership(existing);
        repository.deleteById(id);
    }

    private MonitoringSiteDTO toDto(MonitoringSite s) {
        return MonitoringSiteDTO.builder()
            .id(s.getId())
            .siteName(s.getSiteName())
            .location(s.getLocation())
            .siteType(s.getSiteType())
            .latitude(s.getLatitude())
            .longitude(s.getLongitude())
            .slopeAngle(s.getSlopeAngle())
            .soilType(s.getSoilType())
            .geologicalCondition(s.getGeologicalCondition())
            .status(s.getStatus())
            .userId(s.getUserId())
            .createdAt(s.getCreatedAt())
            .build();
    }
}
