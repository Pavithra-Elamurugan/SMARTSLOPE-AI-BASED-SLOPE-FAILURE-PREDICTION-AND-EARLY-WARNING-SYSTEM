package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.SensorDataDTO;
import com.example.demo.smartslope.entity.MonitoringSite;
import com.example.demo.smartslope.repository.MonitoringSiteRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContinuousMonitoringService {

    private final MonitoringSiteRepository siteRepository;
    private final PredictionService predictionService;
    private final SiteTelemetrySimulatorService simulatorService;

    /**
     * Periodically monitors incoming/latest slope monitoring data across all saved sites.
     * Evaluates AI/ML risk predictions every 15 seconds continuously using dynamic telemetry.
     */
    @Scheduled(fixedRate = 15000)
    public void runContinuousMonitoringCycle() {
        try {
            List<MonitoringSite> sites = siteRepository.findAll();
            if (sites.isEmpty()) {
                return;
            }

            log.info("[CONTINUOUS MONITORING] Running automated AI risk evaluation for {} site(s)...", sites.size());
            for (MonitoringSite site : sites) {
                try {
                    SensorDataDTO telemetry = simulatorService.generateNextTelemetry(site);
                    predictionService.evaluateSite(site.getId(), telemetry);
                } catch (Exception e) {
                    log.warn("[CONTINUOUS MONITORING] Warning evaluating site #{} ({}): {}",
                            site.getId(), site.getSiteName(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("[CONTINUOUS MONITORING] Unexpected error during monitoring cycle: {}", e.getMessage());
        }
    }
}
