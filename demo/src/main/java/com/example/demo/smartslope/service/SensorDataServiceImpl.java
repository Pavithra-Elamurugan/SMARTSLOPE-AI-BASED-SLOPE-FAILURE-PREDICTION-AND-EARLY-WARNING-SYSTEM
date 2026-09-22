package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.SensorDataDTO;
import com.example.demo.smartslope.entity.MonitoringSite;
import com.example.demo.smartslope.entity.SensorData;
import com.example.demo.smartslope.repository.MonitoringSiteRepository;
import com.example.demo.smartslope.repository.SensorDataRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SensorDataServiceImpl implements SensorDataService {

    private final SensorDataRepository repository;
    private final MonitoringSiteRepository siteRepository;
    private final PredictionService predictionService;

    @Override
    public List<SensorDataDTO> findAll() {
        return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Optional<SensorDataDTO> findById(Long id) {
        return repository.findById(id).map(this::toDto);
    }

    @Override
    public SensorDataDTO save(SensorDataDTO dto) {
        MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
            .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));

        double rain = dto.getRainfall() != null ? dto.getRainfall() : 0.0;
        double moist = dto.getSoilMoisture() != null ? dto.getSoilMoisture() : 0.0;
        double temp = dto.getTemperature() != null ? dto.getTemperature() : 25.0;
        double hum = dto.getHumidity() != null ? dto.getHumidity() : 65.0;
        double vib = dto.getGroundVibration() != null ? dto.getGroundVibration() : 0.0;
        double water = dto.getWaterLevel() != null ? dto.getWaterLevel() : 1.0;
        double tilt = dto.getTilt() != null ? dto.getTilt() : 0.5;
        double crack = dto.getCrackWidth() != null ? dto.getCrackWidth() : 1.0;
        double move = dto.getGroundMovement() != null ? dto.getGroundMovement() : 0.5;
        double sa = site.getSlopeAngle() != null ? site.getSlopeAngle() : 35.0;

        SensorData s = SensorData.builder()
            .monitoringSite(site)
            .siteId(site.getId())
            .rainfall(rain)
            .soilMoisture(moist)
            .temperature(temp)
            .humidity(hum)
            .groundVibration(vib)
            .vibration(vib)
            .waterLevel(water)
            .groundwaterLevel(water)
            .tilt(tilt)
            .groundTilt(tilt)
            .crackWidth(crack)
            .groundMovement(move)
            .slopeAngle(sa)
            .recordedAt(dto.getRecordedAt() != null ? dto.getRecordedAt() : LocalDateTime.now())
            .build();

        SensorData savedSensorData = repository.save(s);

        // Automatically trigger real-time ML risk evaluation for this site
        try {
            predictionService.evaluateSite(site.getId(), dto);
        } catch (Exception e) {
            System.err.println("[WARN] Automatic ML evaluation failed during sensor data ingest: " + e.getMessage());
        }

        return toDto(savedSensorData);
    }

    @Override
    public SensorDataDTO update(Long id, SensorDataDTO dto) {
        SensorData existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("SensorData not found: " + id));

        if (dto.getMonitoringSiteId() != null) {
            MonitoringSite site = siteRepository.findById(dto.getMonitoringSiteId())
                .orElseThrow(() -> new IllegalArgumentException("MonitoringSite not found: " + dto.getMonitoringSiteId()));
            existing.setMonitoringSite(site);
            existing.setSiteId(site.getId());
        }

        if (dto.getRainfall() != null) existing.setRainfall(dto.getRainfall());
        if (dto.getSoilMoisture() != null) existing.setSoilMoisture(dto.getSoilMoisture());
        if (dto.getTemperature() != null) existing.setTemperature(dto.getTemperature());
        if (dto.getHumidity() != null) existing.setHumidity(dto.getHumidity());
        if (dto.getGroundVibration() != null) {
            existing.setGroundVibration(dto.getGroundVibration());
            existing.setVibration(dto.getGroundVibration());
        }
        if (dto.getWaterLevel() != null) {
            existing.setWaterLevel(dto.getWaterLevel());
            existing.setGroundwaterLevel(dto.getWaterLevel());
        }
        if (dto.getTilt() != null) {
            existing.setTilt(dto.getTilt());
            existing.setGroundTilt(dto.getTilt());
        }
        if (dto.getCrackWidth() != null) existing.setCrackWidth(dto.getCrackWidth());
        if (dto.getGroundMovement() != null) existing.setGroundMovement(dto.getGroundMovement());
        if (dto.getRecordedAt() != null) existing.setRecordedAt(dto.getRecordedAt());

        return toDto(repository.save(existing));
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private SensorDataDTO toDto(SensorData s) {
        return SensorDataDTO.builder()
            .id(s.getId())
            .monitoringSiteId(s.getMonitoringSite() != null ? s.getMonitoringSite().getId() : null)
            .rainfall(s.getRainfall())
            .soilMoisture(s.getSoilMoisture())
            .temperature(s.getTemperature())
            .humidity(s.getHumidity())
            .groundVibration(s.getGroundVibration())
            .waterLevel(s.getWaterLevel())
            .tilt(s.getTilt())
            .crackWidth(s.getCrackWidth())
            .groundMovement(s.getGroundMovement())
            .recordedAt(s.getRecordedAt())
            .build();
    }
}
