package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.IncidentDTO;
import com.example.demo.smartslope.service.IncidentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping
    public ResponseEntity<List<IncidentDTO>> findAll() {
        return ResponseEntity.ok(incidentService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncidentDTO> findById(@PathVariable Long id) {
        return incidentService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<IncidentDTO> save(@Valid @RequestBody IncidentDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidentService.save(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IncidentDTO> update(@PathVariable Long id, @Valid @RequestBody IncidentDTO dto) {
        return ResponseEntity.ok(incidentService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        incidentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
