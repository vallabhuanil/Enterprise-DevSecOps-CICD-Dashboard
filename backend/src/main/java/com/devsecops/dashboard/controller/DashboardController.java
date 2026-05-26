package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.dto.StatsResponse;
import com.devsecops.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<StatsResponse> getStats() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }

    @GetMapping("/build-summary")
    public ResponseEntity<StatsResponse> getBuildSummary() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }

    @GetMapping("/deployment-summary")
    public ResponseEntity<StatsResponse> getDeploymentSummary() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }

    @GetMapping("/security-summary")
    public ResponseEntity<com.devsecops.dashboard.dto.SecuritySummaryResponse> getSecuritySummary() {
        return ResponseEntity.ok(dashboardService.getSecuritySummary());
    }
}
