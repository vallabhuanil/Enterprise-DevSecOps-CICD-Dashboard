package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.entity.ScanReport;
import com.devsecops.dashboard.service.ScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scans")
@RequiredArgsConstructor
public class ScanController {
    private final ScanService scanService;

    @GetMapping
    public ResponseEntity<List<ScanReport>> getAllScans() {
        return ResponseEntity.ok(scanService.getAllReports());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScanReport> getScanById(@PathVariable Long id) {
        return ResponseEntity.ok(scanService.getReportById(id));
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<String> getScanReport(@PathVariable Long id) {
        ScanReport report = scanService.getReportById(id);
        return ResponseEntity.ok(report.getReportDetails());
    }
}
