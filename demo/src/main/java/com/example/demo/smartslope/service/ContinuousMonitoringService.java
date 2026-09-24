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
     * Automated periodic simulation has been disabled to prevent artificial telemetry mutations.
     * Monitoring evaluations now rely strictly on real live weather data and verified site parameters.
     */
    // @Scheduled(fixedRate = 15000)
    public void runContinuousMonitoringCycle() {
        log.info("[CONTINUOUS MONITORING] Automated artificial simulation cycle is disabled.");
    }
}
