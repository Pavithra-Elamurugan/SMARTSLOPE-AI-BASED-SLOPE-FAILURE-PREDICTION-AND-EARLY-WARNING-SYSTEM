package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.AlertDTO;
import com.example.demo.smartslope.entity.Alert;
import com.example.demo.smartslope.entity.Prediction;
import com.example.demo.smartslope.entity.Role;
import com.example.demo.smartslope.entity.User;
import com.example.demo.smartslope.repository.AlertRepository;
import com.example.demo.smartslope.repository.PredictionRepository;
import com.example.demo.smartslope.repository.UserRepository;
import java.time.LocalDateTime;
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
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;
    private final PredictionRepository predictionRepository;
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

    @Override
    public List<AlertDTO> findAll() {
        User currentUser = getCurrentAuthenticatedUser();
        List<Alert> allAlerts = alertRepository.findAll();

        if (currentUser != null && currentUser.getRole() == Role.PUBLIC_USER) {
            return allAlerts.stream()
                .filter(a -> a.getPrediction() != null 
                    && a.getPrediction().getMonitoringSite() != null 
                    && currentUser.getId().equals(a.getPrediction().getMonitoringSite().getUserId()))
                .map(this::toDto)
                .collect(Collectors.toList());
        }
        return allAlerts.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<AlertDTO> findById(Long id) {
        User currentUser = getCurrentAuthenticatedUser();
        return alertRepository.findById(id).map(alert -> {
            if (currentUser != null && currentUser.getRole() == Role.PUBLIC_USER) {
                if (alert.getPrediction() == null || alert.getPrediction().getMonitoringSite() == null 
                    || !currentUser.getId().equals(alert.getPrediction().getMonitoringSite().getUserId())) {
                    throw new AccessDeniedException("Access Denied: You do not own this alert record.");
                }
            }
            return toDto(alert);
        });
    }

    @Override
    public AlertDTO save(AlertDTO alertDTO) {
        Prediction prediction = predictionRepository.findById(alertDTO.getPredictionId())
            .orElseThrow(() -> new IllegalArgumentException("Prediction not found: " + alertDTO.getPredictionId()));

        Alert alert = Alert.builder()
            .prediction(prediction)
            .alertType(alertDTO.getAlertType())
            .message(alertDTO.getMessage())
            .status(alertDTO.getStatus() != null ? alertDTO.getStatus() : "NEW")
            .sentAt(alertDTO.getSentAt() != null ? alertDTO.getSentAt() : LocalDateTime.now())
            .build();

        return toDto(alertRepository.save(alert));
    }

    @Override
    public AlertDTO update(Long id, AlertDTO alertDTO) {
        Alert existing = alertRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + id));

        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser != null && currentUser.getRole() == Role.PUBLIC_USER) {
            if (existing.getPrediction() == null || existing.getPrediction().getMonitoringSite() == null 
                || !currentUser.getId().equals(existing.getPrediction().getMonitoringSite().getUserId())) {
                throw new AccessDeniedException("Access Denied: You cannot modify alerts for other users' sites.");
            }
        }

        if (alertDTO.getPredictionId() != null) {
            Prediction prediction = predictionRepository.findById(alertDTO.getPredictionId())
                .orElseThrow(() -> new IllegalArgumentException("Prediction not found: " + alertDTO.getPredictionId()));
            existing.setPrediction(prediction);
        }

        if (alertDTO.getAlertType() != null) existing.setAlertType(alertDTO.getAlertType());
        if (alertDTO.getMessage() != null) existing.setMessage(alertDTO.getMessage());
        if (alertDTO.getStatus() != null) existing.setStatus(alertDTO.getStatus());
        if (alertDTO.getSentAt() != null) existing.setSentAt(alertDTO.getSentAt());

        return toDto(alertRepository.save(existing));
    }

    @Override
    public void delete(Long id) {
        Alert existing = alertRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + id));

        User currentUser = getCurrentAuthenticatedUser();
        if (currentUser != null && currentUser.getRole() == Role.PUBLIC_USER) {
            if (existing.getPrediction() == null || existing.getPrediction().getMonitoringSite() == null 
                || !currentUser.getId().equals(existing.getPrediction().getMonitoringSite().getUserId())) {
                throw new AccessDeniedException("Access Denied: You cannot delete alerts for other users' sites.");
            }
        }
        alertRepository.deleteById(id);
    }

    private AlertDTO toDto(Alert alert) {
        Prediction p = alert.getPrediction();
        Long siteId = null;
        String siteName = null;
        Double lat = null;
        Double lng = null;
        Double riskProb = null;
        Double confScore = null;
        String recommendation = null;
        java.util.List<String> factorsList = new java.util.ArrayList<>();

        String severity = alert.getAlertType();
        if (alert.getSeverity() != null && !alert.getSeverity().isBlank()) {
            severity = alert.getSeverity();
        }

        if (p != null) {
            riskProb = p.getProbability() != null ? p.getProbability() : p.getRiskScore();
            confScore = p.getConfidenceScore();
            recommendation = p.getRecommendation();

            if (p.getMonitoringSite() != null) {
                siteId = p.getMonitoringSite().getId();
                siteName = p.getMonitoringSite().getSiteName();
                lat = p.getMonitoringSite().getLatitude();
                lng = p.getMonitoringSite().getLongitude();
            } else if (p.getSiteId() != null) {
                siteId = p.getSiteId();
            }
        }

        if (siteId == null) {
            siteId = alert.getSiteId();
        }

        if ("HIGH".equalsIgnoreCase(severity) || "CRITICAL".equalsIgnoreCase(severity) || "HIGH_RISK".equalsIgnoreCase(severity)) {
            severity = "CRITICAL";
        } else if ("MODERATE".equalsIgnoreCase(severity) || "WARNING".equalsIgnoreCase(severity) || "MODERATE_RISK".equalsIgnoreCase(severity)) {
            severity = "WARNING";
        } else {
            severity = "INFORMATION";
        }

        // Parse risk factors from message if available
        if (alert.getMessage() != null && !alert.getMessage().isBlank()) {
            String msg = alert.getMessage();
            if (msg.contains(".")) {
                String[] parts = msg.split("\\.");
                for (String part : parts) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty() && !trimmed.toLowerCase().contains("detected at")) {
                        factorsList.add(trimmed);
                    }
                }
            }
        }

        return AlertDTO.builder()
            .id(alert.getId())
            .predictionId(p != null ? p.getId() : null)
            .siteId(siteId)
            .siteName(siteName)
            .severity(severity)
            .alertType(alert.getAlertType())
            .message(alert.getMessage())
            .status(alert.getStatus())
            .sentAt(alert.getSentAt())
            .riskProbability(riskProb)
            .confidenceScore(confScore)
            .recommendation(recommendation)
            .latitude(lat)
            .longitude(lng)
            .factors(factorsList)
            .build();
    }
}
