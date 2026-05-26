package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.dto.ConnectRepoRequest;
import com.devsecops.dashboard.entity.Repository;
import com.devsecops.dashboard.service.RepositoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/repos")
@RequiredArgsConstructor
@Tag(name = "Repository Management", description = "APIs for managing Git repository integrations")
public class RepositoryController {
    private final RepositoryService repositoryService;

    @PostMapping("/connect")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVOPS', 'DEVELOPER')")
    @Operation(summary = "Connect a new repository", description = "Connect a Git repository integration. Requires ADMIN, DEVOPS, or DEVELOPER role.")
    public ResponseEntity<Repository> connectRepository(@Valid @RequestBody ConnectRepoRequest request, Principal principal) {
        return ResponseEntity.ok(repositoryService.connectRepository(request, principal.getName()));
    }

    @GetMapping
    @Operation(summary = "List all repositories", description = "Retrieve all connected repository integrations.")
    public ResponseEntity<List<Repository>> getAllRepositories() {
        return ResponseEntity.ok(repositoryService.getAllRepositories());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get repository by ID")
    public ResponseEntity<Repository> getRepositoryById(@PathVariable Long id) {
        return ResponseEntity.ok(repositoryService.getRepositoryById(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Delete a repository (Admin only)",
        description = "Permanently deletes a repository and all associated pipelines, builds, deployments, and scan reports. Restricted to ROLE_ADMIN."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Repository deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Repository not found"),
        @ApiResponse(responseCode = "403", description = "Access denied — ADMIN role required")
    })
    public ResponseEntity<Map<String, Object>> deleteRepository(@PathVariable Long id, Principal principal) {
        repositoryService.deleteRepository(id, principal.getName());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", "Repository removed successfully");
        return ResponseEntity.ok(response);
    }
}
