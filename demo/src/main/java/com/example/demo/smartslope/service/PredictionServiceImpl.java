package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.FastApiPredictionRequest;
import com.example.demo.smartslope.dto.FastApiPredictionResponse;
import com.example.demo.smartslope.dto.PredictionDTO;
import com.example.demo.smartslope.dto.SensorDataDTO;
import com.example.demo.smartslope.entity.Alert;
import com.example.demo.smartslope.entity.MonitoringSite;
import com.example.demo.smartslope.entity.Prediction;
import com.example.demo.smartslope.entity.RiskLevel;
import com.example.demo.smartslope.entity.SensorData;
import com.example.demo.smartslope.repository.AlertRepository;
import com.example.demo.smartslope.repository.MonitoringSiteRepository;
import com.example.demo.smartslope.repository.PredictionRepository;
import com.example.demo.smartslope.repository.SensorDataRepository;
import com.example.demo.smartslope.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Transactional
public class PredictionServiceImpl implements PredictionService {

    private final PredictionRepository repository;
    private final MonitoringSiteRepository siteRepository;
    private final SensorDataRepository sensorDataRepository;
    private final AlertRepository alertRepository;
    private final NotificationDispatcherService notificationDispatcherService;
    private final UserRepository userRepository;

    private com.example.demo.smartslope.entity.User getCurrentAuthenticatedUser() {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                return userRepository.findByEmail(email).orElse(null);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void checkSiteOwnership(MonitoringSite site) {
        com.example.demo.smartslope.entity.User currentUser = getCurrentAuthenticatedUser();
        if (currentUser != null && currentUser.getRole() == com.example.demo.smartslope.entity.Role.PUBLIC_USER) {
            if (site == null || site.getUserId() == null || !site.getUserId().equals(currentUser.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access Denied: You do not own this monitoring site.");
            }
        }
    }

    @Override
    public List<PredictionDTO> findAll() {
        com.example.demo.smartslope.entity.User currentUser = getCurrentAuthenticatedUser();
        List<Prediction> all = repository.findAll();
        if (currentUser != null && currentUser.getRole() == com.example.demo.smartslope.entity.Role.PUBLIC_USER) {
            return all.stream()
                .filter(p -> p.getMonitoringSite() != null && currentUser.getId().equals(p.getMonitoringSite().getUserId()))
                .map(this::toDto)
                .collect(Collectors.toList());
        }
        return all.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<PredictionDTO> findById(Long id) {
        com.example.demo.smartslope.entity.User currentUser = getCurrentAuthenticatedUser();
        return repository.findById(id).map(p -> {
            if (currentUser != null && currentUser.getRole() == com.example.demo.smartslope.entity.Role.PUBLIC_USER) {
                checkSiteOwnership(p.getMonitoringSite());
            }
            return toDto(p);
        });
    }

    @Override
    public List<PredictionDTO> findBySiteId(Long siteId) {
        MonitoringSite site = siteRepository.findById(siteId).orElse(null);
        if (site != null) {
            checkSiteOwnership(site);
        }
        return repository.findByMonitoringSiteIdOrderByPredictionTimeDesc(siteId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public PredictionDTO save(PredictionDTO dto) {
        MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
            .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));

        Double conf = dto.getConfidenceScore() != null ? dto.getConfidenceScore() : 85.0;

        // Ensure valid sensor data reference
        Long sensorId = getOrCreateSensorDataId(site, null);

        Prediction p = Prediction.builder()
            .monitoringSite(site)
            .siteId(site.getId())
            .sensorId(sensorId)
            .riskLevel(dto.getRiskLevel())
            .confidenceScore(conf)
            .probability(conf)
            .riskScore(conf)
            .predictionTime(dto.getPredictionTime() != null ? dto.getPredictionTime() : LocalDateTime.now())
            .recommendation(dto.getRecommendation())
            .build();

        return toDto(repository.save(p));
    }

    @Override
    public PredictionDTO update(Long id, PredictionDTO dto) {
        Prediction existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Prediction not found: " + id));

        if (dto.getMonitoringSiteId() != null) {
            MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
                .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));
            existing.setMonitoringSite(site);
            existing.setSiteId(site.getId());
        }

        if (dto.getRiskLevel() != null) existing.setRiskLevel(dto.getRiskLevel());
        if (dto.getConfidenceScore() != null) {
            existing.setConfidenceScore(dto.getConfidenceScore());
            existing.setProbability(dto.getConfidenceScore());
            existing.setRiskScore(dto.getConfidenceScore());
        }
        if (dto.getPredictionTime() != null) existing.setPredictionTime(dto.getPredictionTime());
        if (dto.getRecommendation() != null) existing.setRecommendation(dto.getRecommendation());

        return toDto(repository.save(existing));
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    public PredictionDTO evaluateSite(Long siteId, SensorDataDTO customSensorData) {
        MonitoringSite site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + siteId));

        checkSiteOwnership(site);

        Double rainfall = 0.0;
        Double soilMoisture = 35.0;
        Double temperature = 25.0;
        Double humidity = 65.0;
        Double windSpeed = 10.0;
        Double surfacePressure = 1013.0;
        Double elevation = 500.0;
        Double slopeAngle = site.getSlopeAngle();
        String soilType = site.getSoilType();
        Double latitude = site.getLatitude();
        Double longitude = site.getLongitude();
        Double tilt = 0.1;
        Double vibration = 0.01;
        Double crackWidth = 0.2;
        Double waterLevel = 1.5;
        Double groundMovement = 0.1;
        Long validSensorId;

        if (customSensorData != null) {
            if (customSensorData.getRainfall() != null) rainfall = customSensorData.getRainfall();
            if (customSensorData.getSoilMoisture() != null) soilMoisture = customSensorData.getSoilMoisture();
            if (customSensorData.getTemperature() != null) temperature = customSensorData.getTemperature();
            if (customSensorData.getHumidity() != null) humidity = customSensorData.getHumidity();
            if (customSensorData.getGroundVibration() != null) vibration = customSensorData.getGroundVibration();
            if (customSensorData.getWaterLevel() != null) waterLevel = customSensorData.getWaterLevel();
            if (customSensorData.getTilt() != null) tilt = customSensorData.getTilt();
            if (customSensorData.getCrackWidth() != null) crackWidth = customSensorData.getCrackWidth();
            if (customSensorData.getGroundMovement() != null) groundMovement = customSensorData.getGroundMovement();

            if (customSensorData.getWindSpeed() != null) windSpeed = customSensorData.getWindSpeed();
            if (customSensorData.getSurfacePressure() != null) surfacePressure = customSensorData.getSurfacePressure();
            if (customSensorData.getElevation() != null) elevation = customSensorData.getElevation();
            if (customSensorData.getSlopeAngle() != null) slopeAngle = customSensorData.getSlopeAngle();
            if (customSensorData.getSoilType() != null) soilType = customSensorData.getSoilType();
            if (customSensorData.getLatitude() != null) latitude = customSensorData.getLatitude();
            if (customSensorData.getLongitude() != null) longitude = customSensorData.getLongitude();

            SensorData newSensorData = SensorData.builder()
                    .monitoringSite(site)
                    .siteId(site.getId())
                    .rainfall(rainfall)
                    .soilMoisture(soilMoisture)
                    .temperature(temperature)
                    .humidity(humidity)
                    .groundVibration(vibration)
                    .vibration(vibration)
                    .waterLevel(waterLevel)
                    .groundwaterLevel(waterLevel)
                    .tilt(tilt)
                    .groundTilt(tilt)
                    .crackWidth(crackWidth)
                    .groundMovement(groundMovement)
                    .slopeAngle(slopeAngle)
                    .recordedAt(LocalDateTime.now())
                    .build();
            validSensorId = sensorDataRepository.save(newSensorData).getId();
        } else {
            validSensorId = getOrCreateSensorDataId(site, null);
        }

        Double rainfall24h = (customSensorData != null && customSensorData.getRainfall24h() != null) ? customSensorData.getRainfall24h() : null;
        Double rainfall72h = (customSensorData != null && customSensorData.getRainfall72h() != null) ? customSensorData.getRainfall72h() : null;

        FastApiPredictionRequest fastApiRequest = FastApiPredictionRequest.builder()
                .monitoringSiteId(siteId)
                .latitude(latitude)
                .longitude(longitude)
                .elevation(elevation)
                .slopeAngle(slopeAngle)
                .soilType(soilType)
                .rainfall(rainfall)
                .rainfall24h(rainfall24h)
                .rainfall24hAlias(rainfall24h)
                .rainfall72h(rainfall72h)
                .rainfall72hAlias(rainfall72h)
                .soilMoisture(soilMoisture)
                .temperature(temperature)
                .humidity(humidity)
                .windSpeed(windSpeed)
                .surfacePressure(surfacePressure)
                .groundVibration(vibration)
                .waterLevel(waterLevel)
                .tilt(tilt)
                .crackWidth(crackWidth)
                .groundMovement(groundMovement)
                .build();

        RiskLevel riskLevel;
        double confidence;
        double riskProbability;
        String recommendation;
        List<String> factors = new ArrayList<>();
        List<Integer> probabilities = Arrays.asList(95, 4, 1);

        try {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(4000);
            requestFactory.setReadTimeout(4000);

            RestTemplate restTemplate = new RestTemplate(requestFactory);
            String mlUrl = "http://localhost:8000/predict";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<FastApiPredictionRequest> entity = new HttpEntity<>(fastApiRequest, headers);
            FastApiPredictionResponse response = restTemplate.postForObject(mlUrl, entity, FastApiPredictionResponse.class);

            if (response == null || response.getRiskLevel() == null) {
                throw new IllegalStateException("FastAPI prediction response is null or invalid.");
            }

            confidence = response.getConfidenceScore() != null ? response.getConfidenceScore() : 90.0;
            riskProbability = response.getRiskProbability() != null ? response.getRiskProbability() : 5.0;

            String returnedRiskStr = response.getRiskLevel().toUpperCase();
            if (returnedRiskStr.contains("HIGH")) {
                riskLevel = RiskLevel.HIGH_RISK;
            } else if (returnedRiskStr.contains("MODERATE")) {
                riskLevel = RiskLevel.MODERATE_RISK;
            } else {
                riskLevel = RiskLevel.SAFE;
            }

            recommendation = response.getRecommendation() != null ? response.getRecommendation() : "Evaluated via General-Location AI model.";

            if (response.getContributingFactors() != null && !response.getContributingFactors().isEmpty()) {
                factors = response.getContributingFactors();
            }

            if (response.getProbabilities() != null) {
                double pSafe = response.getProbabilities().getOrDefault("SAFE", 0.0);
                double pMod = response.getProbabilities().getOrDefault("MODERATE RISK", 0.0);
                double pHigh = response.getProbabilities().getOrDefault("HIGH RISK", 0.0);
                probabilities = Arrays.asList((int) Math.round(pSafe), (int) Math.round(pMod), (int) Math.round(pHigh));
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PredictionServiceImpl.class)
                    .error("[ERROR] FastAPI ML prediction service unreachable on http://localhost:8000/predict: {}", e.getMessage());
            throw new IllegalStateException("FastAPI ML prediction service is offline or unreachable at http://localhost:8000/predict. Please start the Python FastAPI server.", e);
        }

        // Diagnostic backend logging
        org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(PredictionServiceImpl.class);
        logger.info("[AI EVALUATION] Site #{} ({}) Telemetry -> Rain: {}mm, Moisture: {}%, Tilt: {}°, Vib: {}g, Crack: {}mm",
                siteId, site.getSiteName(), rainfall, soilMoisture, tilt, vibration, crackWidth);
        logger.info("[AI EVALUATION] Model Probabilities -> SAFE: {}%, MODERATE: {}%, HIGH: {}%",
                probabilities.get(0), probabilities.get(1), probabilities.get(2));
        logger.info("[AI EVALUATION] Computed Failure Risk Probability: {}% -> Classification: {}", riskProbability, riskLevel);

        // Update Site Status in MySQL (monitoring_sites table)
        if (riskLevel == RiskLevel.HIGH_RISK) {
            site.setStatus("DANGER");
        } else if (riskLevel == RiskLevel.MODERATE_RISK) {
            site.setStatus("ATTENTION");
        } else {
            site.setStatus("MONITORING");
        }
        siteRepository.save(site);

        // Save prediction record to MySQL
        Prediction p = Prediction.builder()
                .monitoringSite(site)
                .siteId(site.getId())
                .sensorId(validSensorId)
                .riskLevel(riskLevel)
                .confidenceScore(confidence)
                .probability(riskProbability)
                .riskScore(riskProbability)
                .predictionTime(LocalDateTime.now())
                .recommendation(recommendation)
                .build();

        Prediction savedPrediction = repository.save(p);

        // Auto-generate Alert if High or Moderate risk threshold crossed (Deduplicated)
        if (riskLevel == RiskLevel.HIGH_RISK || riskLevel == RiskLevel.MODERATE_RISK) {
            String severity = (riskLevel == RiskLevel.HIGH_RISK) ? "CRITICAL" : "WARNING";
            String alertMsg = String.format("%s detected at %s. %s",
                    riskLevel.name().replace("_", " "), site.getSiteName(), recommendation);

            List<Alert> existingActiveAlerts = alertRepository.findBySiteIdAndStatusIn(site.getId(), Arrays.asList("NEW", "ACKNOWLEDGED", "INVESTIGATING", "ACTIVE"));
            Optional<Alert> matchingActiveAlert = existingActiveAlerts.stream()
                    .filter(a -> severity.equalsIgnoreCase(a.getSeverity()) || severity.equalsIgnoreCase(a.getAlertType()))
                    .findFirst();

            if (matchingActiveAlert.isPresent()) {
                // Update existing alert timestamp and message instead of inserting duplicate
                Alert existing = matchingActiveAlert.get();
                existing.setSentAt(LocalDateTime.now());
                existing.setMessage(alertMsg);
                existing.setPrediction(savedPrediction);
                alertRepository.save(existing);
            } else {
                // Insert new alert entry
                Alert alert = Alert.builder()
                        .prediction(savedPrediction)
                        .siteId(site.getId())
                        .alertType(severity)
                        .severity(severity)
                        .message(alertMsg)
                        .status("NEW")
                        .sentAt(LocalDateTime.now())
                        .build();
                Alert savedAlert = alertRepository.save(alert);

                if ("CRITICAL".equalsIgnoreCase(severity)) {
                    notificationDispatcherService.dispatchCriticalAlert(savedAlert, site.getSiteName());
                } else {
                    notificationDispatcherService.dispatchModerateAlert(savedAlert, site.getSiteName());
                }
            }
        }

        boolean hasSensors = customSensorData != null || sensorDataRepository.existsByMonitoringSiteId(siteId) || sensorDataRepository.existsBySiteId(siteId);

        String dataSourceInfo = hasSensors
                ? "Live Hardware Telemetry + Meteorological Analysis"
                : "Location Coordinates, Topography & Meteorological Analysis (No Hardware Sensors Attached)";

        PredictionDTO resultDTO = toDto(savedPrediction);
        resultDTO.setFactors(factors);
        resultDTO.setProbabilities(probabilities);
        resultDTO.setRainfall(rainfall);
        resultDTO.setSoilMoisture(soilMoisture);
        resultDTO.setGroundVibration(vibration);
        resultDTO.setWaterLevel(waterLevel);
        resultDTO.setTilt(tilt);
        resultDTO.setCrackWidth(crackWidth);
        resultDTO.setGroundMovement(groundMovement);
        resultDTO.setSlopeAngle(slopeAngle);
        resultDTO.setSoilType(soilType);
        resultDTO.setRiskProbability(riskProbability);
        resultDTO.setHasSensors(hasSensors);
        resultDTO.setDataSourceInfo(dataSourceInfo);
        return resultDTO;
    }

    @Override
    public PredictionDTO analyzeLocation(PredictionDTO request) {
        if (request.getMonitoringSiteId() != null) {
            return evaluateSite(request.getMonitoringSiteId(), null);
        }

        // If coordinates match a saved site, evaluate that site
        if (request.getLatitude() != null && request.getLongitude() != null) {
            Optional<MonitoringSite> matched = siteRepository.findAll().stream()
                    .filter(s -> s.getLatitude() != null && s.getLongitude() != null &&
                            Math.abs(s.getLatitude() - request.getLatitude()) < 0.001 &&
                            Math.abs(s.getLongitude() - request.getLongitude()) < 0.001)
                    .findFirst();
            if (matched.isPresent()) {
                return evaluateSite(matched.get().getId(), null);
            }
        }

        Double rainfall = request.getRainfall() != null ? request.getRainfall() : 0.0;
        Double soilMoisture = request.getSoilMoisture() != null ? request.getSoilMoisture() : 0.0;
        Double temperature = 25.0;
        Double humidity = 65.0;
        Double vibration = request.getGroundVibration() != null ? request.getGroundVibration() : 0.0;
        Double waterLevel = request.getWaterLevel() != null ? request.getWaterLevel() : 1.5;
        Double tilt = request.getTilt() != null ? request.getTilt() : 0.0;
        Double crackWidth = request.getCrackWidth() != null ? request.getCrackWidth() : 0.0;
        Double groundMovement = request.getGroundMovement() != null ? request.getGroundMovement() : 0.0;
        Double slopeAngle = request.getSlopeAngle() != null ? request.getSlopeAngle() : 35.0;
        String soilType = request.getSoilType() != null ? request.getSoilType() : "Residual Soil";

        FastApiPredictionRequest fastApiRequest = FastApiPredictionRequest.builder()
                .monitoringSiteId(1L)
                .rainfall(rainfall)
                .soilMoisture(soilMoisture)
                .temperature(temperature)
                .humidity(humidity)
                .groundVibration(vibration)
                .waterLevel(waterLevel)
                .tilt(tilt)
                .crackWidth(crackWidth)
                .groundMovement(groundMovement)
                .slopeAngle(slopeAngle)
                .soilType(soilType)
                .build();

        RiskLevel riskLevel = RiskLevel.SAFE;
        double confidence = 90.0;
        String recommendation = "Baseline slope monitoring.";
        List<String> factors = new ArrayList<>();
        List<Integer> probabilities = Arrays.asList(90, 8, 2);

        boolean fastApiSuccess = false;
        try {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(3000);
            requestFactory.setReadTimeout(3000);

            RestTemplate restTemplate = new RestTemplate(requestFactory);
            String mlUrl = "http://localhost:8000/predict";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<FastApiPredictionRequest> entity = new HttpEntity<>(fastApiRequest, headers);
            FastApiPredictionResponse response = restTemplate.postForObject(mlUrl, entity, FastApiPredictionResponse.class);

            if (response != null && response.getRiskLevel() != null) {
                fastApiSuccess = true;
                String returnedRiskStr = response.getRiskLevel().toUpperCase();
                if (returnedRiskStr.contains("HIGH")) {
                    riskLevel = RiskLevel.HIGH_RISK;
                } else if (returnedRiskStr.contains("MODERATE")) {
                    riskLevel = RiskLevel.MODERATE_RISK;
                } else {
                    riskLevel = RiskLevel.SAFE;
                }

                confidence = response.getConfidenceScore() != null ? response.getConfidenceScore() : 90.0;
                recommendation = response.getRecommendation() != null ? response.getRecommendation() : "Evaluated via FastAPI ML model.";

                if (response.getContributingFactors() != null && !response.getContributingFactors().isEmpty()) {
                    factors = response.getContributingFactors();
                }

                if (response.getProbabilities() != null) {
                    double pSafe = response.getProbabilities().getOrDefault("SAFE", 0.0);
                    double pMod = response.getProbabilities().getOrDefault("MODERATE RISK", 0.0);
                    double pHigh = response.getProbabilities().getOrDefault("HIGH RISK", 0.0);
                    probabilities = Arrays.asList((int) Math.round(pSafe), (int) Math.round(pMod), (int) Math.round(pHigh));
                }
            }
        } catch (Exception e) {
            System.err.println("[WARN] FastAPI ML service unreachable: " + e.getMessage());
        }

        if (!fastApiSuccess) {
            if (rainfall > 70 || soilMoisture > 75 || vibration > 0.7 || crackWidth > 10.0) {
                riskLevel = RiskLevel.HIGH_RISK;
                confidence = 86.0;
                recommendation = "High landslide probability based on rainfall and moisture accumulation.";
                if (rainfall > 70) factors.add("Heavy rainfall accumulation (>70mm)");
                if (soilMoisture > 75) factors.add("Critical soil saturation (>75%)");
                probabilities = Arrays.asList(8, 22, 70);
            } else if (rainfall > 40 || soilMoisture > 50) {
                riskLevel = RiskLevel.MODERATE_RISK;
                confidence = 74.0;
                recommendation = "Moderate slope risk. Monitor precipitation trend and drainage.";
                if (rainfall > 40) factors.add("Moderate rainfall accumulation");
                if (soilMoisture > 50) factors.add("Elevated soil moisture content");
                probabilities = Arrays.asList(21, 58, 21);
            } else {
                riskLevel = RiskLevel.SAFE;
                confidence = 92.0;
                recommendation = "Location environmental conditions operating within normal safe limits.";
                factors.add("Stable environmental baseline");
                probabilities = Arrays.asList(90, 8, 2);
            }
        }

        String locationTitle = request.getLocationName() != null ? request.getLocationName() :
                (request.getLatitude() != null && request.getLongitude() != null ?
                        String.format("Location (%.4f, %.4f)", request.getLatitude(), request.getLongitude()) : "Selected Location");

        return PredictionDTO.builder()
                .siteName(locationTitle)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .locationName(locationTitle)
                .riskLevel(riskLevel)
                .confidenceScore(confidence)
                .predictionTime(LocalDateTime.now())
                .recommendation(recommendation)
                .factors(factors)
                .probabilities(probabilities)
                .rainfall(rainfall)
                .soilMoisture(soilMoisture)
                .groundVibration(vibration)
                .waterLevel(waterLevel)
                .tilt(tilt)
                .crackWidth(crackWidth)
                .groundMovement(groundMovement)
                .slopeAngle(slopeAngle)
                .soilType(soilType)
                .hasSensors(false)
                .dataSourceInfo("Location Coordinates, Topography & Open-Meteo Meteorological Service (No Hardware Sensors Installed)")
                .build();
    }

    private Long getOrCreateSensorDataId(MonitoringSite site, SensorDataDTO dto) {
        double t = 0.5;
        double w = 1.5;
        double v = 0.05;
        double sa = site.getSlopeAngle() != null ? site.getSlopeAngle() : 35.0;
        SensorData sd = SensorData.builder()
                .monitoringSite(site)
                .siteId(site.getId())
                .rainfall(dto != null && dto.getRainfall() != null ? dto.getRainfall() : 10.0)
                .soilMoisture(dto != null && dto.getSoilMoisture() != null ? dto.getSoilMoisture() : 30.0)
                .temperature(25.0)
                .humidity(60.0)
                .groundVibration(v)
                .vibration(v)
                .waterLevel(w)
                .groundwaterLevel(w)
                .tilt(t)
                .groundTilt(t)
                .crackWidth(0.5)
                .groundMovement(0.2)
                .slopeAngle(sa)
                .recordedAt(LocalDateTime.now())
                .build();
        return sensorDataRepository.save(sd).getId();
    }

    private PredictionDTO toDto(Prediction p) {
        Long siteId = p.getMonitoringSite() != null ? p.getMonitoringSite().getId() : p.getSiteId();
        boolean hasSensors = siteId != null && (sensorDataRepository.existsByMonitoringSiteId(siteId) || sensorDataRepository.existsBySiteId(siteId));

        String dataSourceInfo = hasSensors
                ? "Live Hardware Telemetry + Meteorological Analysis"
                : "Location Coordinates, Topography & Meteorological Analysis (No Hardware Sensors Attached)";

        return PredictionDTO.builder()
            .id(p.getId())
            .monitoringSiteId(p.getMonitoringSite() != null ? p.getMonitoringSite().getId() : null)
            .siteName(p.getMonitoringSite() != null ? p.getMonitoringSite().getSiteName() : null)
            .riskLevel(p.getRiskLevel())
            .confidenceScore(p.getConfidenceScore())
            .riskProbability(p.getProbability())
            .predictionTime(p.getPredictionTime())
            .recommendation(p.getRecommendation())
            .hasSensors(hasSensors)
            .dataSourceInfo(dataSourceInfo)
            .build();
    }
}
