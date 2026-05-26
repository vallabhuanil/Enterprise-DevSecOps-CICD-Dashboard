package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.entity.Deployment;
import com.devsecops.dashboard.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/deployments")
@RequiredArgsConstructor
public class DeploymentController {
    private final DeploymentService deploymentService;

    @GetMapping
    public ResponseEntity<List<Deployment>> getAllDeployments() {
        return ResponseEntity.ok(deploymentService.getAllDeployments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Deployment> getDeploymentById(@PathVariable Long id) {
        return ResponseEntity.ok(deploymentService.getDeploymentById(id));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<String> getDeploymentStatus(@PathVariable Long id) {
        Deployment d = deploymentService.getDeploymentById(id);
        return ResponseEntity.ok(d.getStatus());
    }

    @PostMapping("/{id}/rollback")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVOPS')")
    public ResponseEntity<Deployment> triggerRollback(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(deploymentService.triggerRollback(id, principal.getName()));
    }
}
