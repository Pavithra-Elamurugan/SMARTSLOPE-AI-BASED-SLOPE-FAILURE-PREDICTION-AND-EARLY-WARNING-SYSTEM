package com.example.demo.smartslope.controller;

import com.example.demo.smartslope.dto.PredictionDTO;
import com.example.demo.smartslope.service.PredictionService;
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
@RequestMapping("/api/predictions")
public class PredictionController {

    private final PredictionService predictionService;

    public PredictionController(PredictionService predictionService) {
        this.predictionService = predictionService;
    }

    @GetMapping
    public ResponseEntity<List<PredictionDTO>> findAll() {
        return ResponseEntity.ok(predictionService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PredictionDTO> findById(@PathVariable Long id) {
        return predictionService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PredictionDTO> save(
            @Valid @RequestBody PredictionDTO predictionDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(predictionService.save(predictionDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PredictionDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody PredictionDTO predictionDTO) {
        return ResponseEntity.ok(predictionService.update(id, predictionDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        predictionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
