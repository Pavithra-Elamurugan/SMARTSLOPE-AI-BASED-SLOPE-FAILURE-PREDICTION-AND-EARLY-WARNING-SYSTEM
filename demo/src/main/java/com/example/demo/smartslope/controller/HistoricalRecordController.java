package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.HistoricalRecordDTO;
import com.example.demo.smartslope.service.HistoricalRecordService;
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
@RequestMapping("/api/history")
public class HistoricalRecordController {

    private final HistoricalRecordService historicalRecordService;

    public HistoricalRecordController(HistoricalRecordService historicalRecordService) {
        this.historicalRecordService = historicalRecordService;
    }

    @GetMapping
    public ResponseEntity<List<HistoricalRecordDTO>> findAll() {
        return ResponseEntity.ok(historicalRecordService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HistoricalRecordDTO> findById(@PathVariable Long id) {
        return historicalRecordService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<HistoricalRecordDTO> save(
            @Valid @RequestBody HistoricalRecordDTO historicalRecordDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(historicalRecordService.save(historicalRecordDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HistoricalRecordDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody HistoricalRecordDTO historicalRecordDTO) {
        return ResponseEntity.ok(historicalRecordService.update(id, historicalRecordDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        historicalRecordService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
