package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.entity.Build;
import com.devsecops.dashboard.service.BuildService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/builds")
@RequiredArgsConstructor
public class BuildController {
    private final BuildService buildService;

    @GetMapping
    public ResponseEntity<List<Build>> getAllBuilds() {
        return ResponseEntity.ok(buildService.getAllBuilds());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Build> getBuildById(@PathVariable Long id) {
        return ResponseEntity.ok(buildService.getBuildById(id));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<String> getBuildLogs(@PathVariable Long id) {
        Build build = buildService.getBuildById(id);
        return ResponseEntity.ok(build.getLogs());
    }
}
