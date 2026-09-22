package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.PredictionDTO;
import com.example.demo.smartslope.dto.SensorDataDTO;
import com.example.demo.smartslope.repository.MonitoringSiteRepository;
import com.example.demo.smartslope.service.PredictionService;
import com.example.demo.smartslope.service.SiteTelemetrySimulatorService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    private final PredictionService predictionService;
    private final SiteTelemetrySimulatorService simulatorService;
    private final MonitoringSiteRepository siteRepository;

    public PredictionController(PredictionService predictionService,
                                SiteTelemetrySimulatorService simulatorService,
                                MonitoringSiteRepository siteRepository) {
        this.predictionService = predictionService;
        this.simulatorService = simulatorService;
        this.siteRepository = siteRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER', 'PUBLIC_USER')")
    public ResponseEntity<List<PredictionDTO>> findAll() {
        return ResponseEntity.ok(predictionService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER', 'PUBLIC_USER')")
    public ResponseEntity<PredictionDTO> findById(@PathVariable Long id) {
        return predictionService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/site/{siteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER', 'PUBLIC_USER')")
    public ResponseEntity<List<PredictionDTO>> findBySiteId(@PathVariable Long siteId) {
        return ResponseEntity.ok(predictionService.findBySiteId(siteId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<PredictionDTO> save(@Valid @RequestBody PredictionDTO predictionDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(predictionService.save(predictionDTO));
    }

    @PostMapping({"/evaluate/{siteId}", "/evaluate-site/{siteId}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<PredictionDTO> evaluateSite(
            @PathVariable Long siteId,
            @RequestBody(required = false) SensorDataDTO sensorData) {
        return ResponseEntity.ok(predictionService.evaluateSite(siteId, sensorData));
    }

    @PostMapping("/simulate-storm/{siteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<PredictionDTO> simulateStorm(
            @PathVariable Long siteId,
            @RequestParam(required = false, defaultValue = "true") boolean active) {
        simulatorService.setStormMode(siteId, active);
        var siteOpt = siteRepository.findById(siteId);
        if (siteOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        SensorDataDTO telemetry = simulatorService.generateNextTelemetry(siteOpt.get());
        return ResponseEntity.ok(predictionService.evaluateSite(siteId, telemetry));
    }

    @PostMapping("/analyze-location")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<PredictionDTO> analyzeLocation(@RequestBody PredictionDTO request) {
        return ResponseEntity.ok(predictionService.analyzeLocation(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<PredictionDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody PredictionDTO predictionDTO) {
        return ResponseEntity.ok(predictionService.update(id, predictionDTO));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        predictionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
