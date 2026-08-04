package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.MonitoringSiteDTO;
import com.example.demo.smartslope.service.MonitoringSiteService;
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
@RequestMapping("/api/sites")
public class MonitoringSiteController {

    private final MonitoringSiteService monitoringSiteService;

    public MonitoringSiteController(MonitoringSiteService monitoringSiteService) {
        this.monitoringSiteService = monitoringSiteService;
    }

    @GetMapping
    public ResponseEntity<List<MonitoringSiteDTO>> findAll() {
        return ResponseEntity.ok(monitoringSiteService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MonitoringSiteDTO> findById(@PathVariable Long id) {
        return monitoringSiteService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MonitoringSiteDTO> save(
            @Valid @RequestBody MonitoringSiteDTO monitoringSiteDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(monitoringSiteService.save(monitoringSiteDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MonitoringSiteDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody MonitoringSiteDTO monitoringSiteDTO) {
        return ResponseEntity.ok(monitoringSiteService.update(id, monitoringSiteDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        monitoringSiteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
