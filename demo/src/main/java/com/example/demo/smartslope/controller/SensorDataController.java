package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.SensorDataDTO;
import com.example.demo.smartslope.service.SensorDataService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sensor-data")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @GetMapping
    public ResponseEntity<List<SensorDataDTO>> findAll() {
        return ResponseEntity.ok(sensorDataService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorDataDTO> findById(@PathVariable Long id) {
        return sensorDataService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SensorDataDTO> save(@Valid @RequestBody SensorDataDTO sensorDataDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sensorDataService.save(sensorDataDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SensorDataDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody SensorDataDTO sensorDataDTO) {
        return ResponseEntity.ok(sensorDataService.update(id, sensorDataDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        sensorDataService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
