package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.InspectionDTO;
import com.example.demo.smartslope.service.InspectionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inspections")
public class InspectionController {

    private final InspectionService inspectionService;

    public InspectionController(InspectionService inspectionService) {
        this.inspectionService = inspectionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER')")
    public ResponseEntity<List<InspectionDTO>> findAll() {
        return ResponseEntity.ok(inspectionService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER', 'SAFETY_OFFICER')")
    public ResponseEntity<InspectionDTO> findById(@PathVariable Long id) {
        return inspectionService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<InspectionDTO> save(@Valid @RequestBody InspectionDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inspectionService.save(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<InspectionDTO> update(@PathVariable Long id, @Valid @RequestBody InspectionDTO dto) {
        return ResponseEntity.ok(inspectionService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inspectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
