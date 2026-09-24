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
            s.rainfall = 0.0;
            s.soilMoisture = 25.0;
            s.tilt = 0.1;
            s.crackWidth = 0.2;
            s.groundVibration = 0.01;
            s.waterLevel = 1.5;
            return s;
        });

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
