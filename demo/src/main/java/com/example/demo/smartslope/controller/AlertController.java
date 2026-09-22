package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.AlertDTO;
import com.example.demo.smartslope.service.AlertService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER', 'PUBLIC_USER')")
    public ResponseEntity<List<AlertDTO>> findAll() {
        return ResponseEntity.ok(alertService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER', 'PUBLIC_USER')")
    public ResponseEntity<AlertDTO> findById(@PathVariable Long id) {
        return alertService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER')")
    public ResponseEntity<AlertDTO> save(@Valid @RequestBody AlertDTO alertDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alertService.save(alertDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER')")
    public ResponseEntity<AlertDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody AlertDTO alertDTO) {
        return ResponseEntity.ok(alertService.update(id, alertDTO));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        alertService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
