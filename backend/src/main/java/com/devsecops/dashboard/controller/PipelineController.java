package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.dto.PipelineRequest;
import com.devsecops.dashboard.dto.PipelineResponse;
import com.devsecops.dashboard.service.PipelineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pipelines")
@RequiredArgsConstructor
public class PipelineController {
    private final PipelineService pipelineService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVOPS', 'DEVELOPER')")
    public ResponseEntity<PipelineResponse> createPipeline(@Valid @RequestBody PipelineRequest request) {
        return ResponseEntity.ok(pipelineService.createPipeline(request));
    }

    @GetMapping
    public ResponseEntity<List<PipelineResponse>> getAllPipelines() {
        return ResponseEntity.ok(pipelineService.getAllPipelines());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PipelineResponse> getPipelineById(@PathVariable Long id) {
        return ResponseEntity.ok(pipelineService.getPipelineById(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVOPS')")
    public ResponseEntity<String> deletePipeline(@PathVariable Long id) {
        pipelineService.deletePipeline(id);
        return ResponseEntity.ok("Pipeline deleted successfully!");
    }

    @PostMapping("/{id}/trigger")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVOPS', 'DEVELOPER')")
    public ResponseEntity<PipelineResponse> triggerPipeline(@PathVariable Long id, @RequestParam(defaultValue = "MANUAL") String triggerType) {
        return ResponseEntity.ok(pipelineService.triggerPipeline(id, triggerType));
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVOPS', 'DEVELOPER')")
    public ResponseEntity<PipelineResponse> retryPipeline(@PathVariable Long id) {
        return ResponseEntity.ok(pipelineService.retryPipeline(id));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<String> getPipelineStatus(@PathVariable Long id) {
        PipelineResponse p = pipelineService.getPipelineById(id);
        return ResponseEntity.ok(p.status());
    }
}
