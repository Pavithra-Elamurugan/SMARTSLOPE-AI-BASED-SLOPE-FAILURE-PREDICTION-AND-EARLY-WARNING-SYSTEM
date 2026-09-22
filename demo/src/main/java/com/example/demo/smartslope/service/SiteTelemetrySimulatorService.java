package com.example.demo.smartslope.service;

import com.example.demo.smartslope.dto.SensorDataDTO;
import com.example.demo.smartslope.entity.MonitoringSite;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class SiteTelemetrySimulatorService {

    private final Map<Long, SiteState> siteStateMap = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public static class SiteState {
        public double rainfall = 10.0;
        public double soilMoisture = 32.0;
        public double tilt = 0.4;
        public double crackWidth = 0.6;
        public double groundVibration = 0.05;
        public double temperature = 24.0;
        public double humidity = 65.0;
        public double waterLevel = 1.8;
        public double groundMovement = 0.5;
        public boolean stormMode = false;
    }

    public SensorDataDTO generateNextTelemetry(MonitoringSite site) {
        Long siteId = site.getId();
        SiteState state = siteStateMap.computeIfAbsent(siteId, id -> {
            SiteState s = new SiteState();
            s.rainfall = Math.max(2.0, (id * 4.0) % 25.0);
            s.soilMoisture = Math.max(15.0, (id * 8.0) % 45.0 + 20.0);
            s.tilt = Math.max(0.1, (id * 0.15) % 1.2);
            s.crackWidth = Math.max(0.3, (id * 0.2) % 1.5);
            s.groundVibration = Math.max(0.01, (id * 0.02) % 0.1);
            s.waterLevel = 1.5 + (id * 0.3) % 2.0;
            return s;
        });

        // Apply smooth realistic physical transitions
        if (state.stormMode) {
            state.rainfall = Math.min(130.0, state.rainfall + 4.0 + random.nextDouble() * 3.0);
            state.soilMoisture = Math.min(95.0, state.soilMoisture + 2.5 + random.nextDouble() * 2.0);
            state.waterLevel = Math.min(6.0, state.waterLevel + 0.2);
            state.tilt = Math.min(12.0, state.tilt + 0.15 + random.nextDouble() * 0.1);
            state.crackWidth = Math.min(30.0, state.crackWidth + 0.25 + random.nextDouble() * 0.2);
            state.groundVibration = Math.min(1.2, state.groundVibration + 0.04 + random.nextDouble() * 0.03);
            state.groundMovement = Math.min(20.0, state.groundMovement + 0.3);
        } else {
            double deltaRain = (random.nextDouble() - 0.5) * 1.5;
            double deltaMoisture = (random.nextDouble() - 0.5) * 1.0;
            double deltaTilt = (random.nextDouble() - 0.5) * 0.04;
            double deltaCrack = (random.nextDouble() - 0.48) * 0.04;
            double deltaVib = (random.nextDouble() - 0.5) * 0.01;

            state.rainfall = Math.max(0.0, Math.min(120.0, state.rainfall + deltaRain));
            state.soilMoisture = Math.max(10.0, Math.min(95.0, state.soilMoisture + deltaMoisture));
            state.tilt = Math.max(0.0, Math.min(25.0, state.tilt + deltaTilt));
            state.crackWidth = Math.max(0.0, Math.min(45.0, state.crackWidth + deltaCrack));
            state.groundVibration = Math.max(0.01, Math.min(2.0, state.groundVibration + deltaVib));
            state.waterLevel = Math.max(0.5, Math.min(8.0, 1.2 + (state.soilMoisture * 0.04)));
            state.groundMovement = Math.max(0.1, Math.min(30.0, 0.2 + (state.crackWidth * 0.6)));
        }

        return SensorDataDTO.builder()
                .monitoringSiteId(siteId)
                .rainfall(round(state.rainfall, 1))
                .soilMoisture(round(state.soilMoisture, 1))
                .temperature(round(state.temperature, 1))
                .humidity(round(state.humidity, 1))
                .groundVibration(round(state.groundVibration, 2))
                .waterLevel(round(state.waterLevel, 2))
                .tilt(round(state.tilt, 2))
                .crackWidth(round(state.crackWidth, 2))
                .groundMovement(round(state.groundMovement, 2))
                .build();
    }

    public void setStormMode(Long siteId, boolean stormActive) {
        SiteState state = siteStateMap.computeIfAbsent(siteId, id -> new SiteState());
        state.stormMode = stormActive;
        if (stormActive) {
            state.rainfall = Math.max(state.rainfall, 55.0);
            state.soilMoisture = Math.max(state.soilMoisture, 65.0);
            state.tilt = Math.max(state.tilt, 3.2);
            state.crackWidth = Math.max(state.crackWidth, 6.0);
            state.groundVibration = Math.max(state.groundVibration, 0.45);
        } else {
            state.rainfall = 10.0;
            state.soilMoisture = 32.0;
            state.tilt = 0.5;
            state.crackWidth = 0.8;
            state.groundVibration = 0.05;
        }
    }

    private double round(double val, int decimals) {
        double p = Math.pow(10, decimals);
        return Math.round(val * p) / p;
    }
}
