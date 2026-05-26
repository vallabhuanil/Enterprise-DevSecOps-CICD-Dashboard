package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.entity.Metrics;
import com.devsecops.dashboard.service.MetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
public class MetricsController {
    private final MetricsService metricsService;

    @GetMapping
    public ResponseEntity<Metrics> getLatestMetrics() {
        return ResponseEntity.ok(metricsService.getLatestMetrics());
    }
}
