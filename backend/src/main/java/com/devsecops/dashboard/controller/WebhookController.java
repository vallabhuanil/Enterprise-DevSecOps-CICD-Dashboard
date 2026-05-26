package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.entity.Pipeline;
import com.devsecops.dashboard.entity.Repository;
import com.devsecops.dashboard.repository.PipelineRepository;
import com.devsecops.dashboard.repository.RepositoryRepository;
import com.devsecops.dashboard.service.PipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {
    private final RepositoryRepository repositoryRepository;
    private final PipelineRepository pipelineRepository;
    private final PipelineService pipelineService;

    @PostMapping("/github")
    public ResponseEntity<String> handleGitHubWebhook(@RequestBody Map<String, Object> payload) {
        log.info("Received GitHub Webhook push event trigger...");

        // Parse mock payload
        if (payload.containsKey("repository")) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> repoData = (Map<String, Object>) payload.get("repository");
                String repoUrl = (String) repoData.get("clone_url");
                
                if (repoUrl != null) {
                    log.info("Parsed repository clone URL: {}", repoUrl);
                    
                    Repository matchedRepo = repositoryRepository.findByRepoUrl(repoUrl)
                            .orElseGet(() -> repositoryRepository.findAll().stream()
                                    .filter(r -> r.getRepoUrl().contains(repoUrl) || repoUrl.contains(r.getRepoUrl()))
                                    .findFirst()
                                    .orElse(null));

                    if (matchedRepo != null) {
                        log.info("Matched integrated repository: {}", matchedRepo.getName());
                        
                        List<Pipeline> pipelines = pipelineRepository.findByRepositoryId(matchedRepo.getId());
                        if (!pipelines.isEmpty()) {
                            Pipeline pipelineToTrigger = pipelines.get(0);
                            log.info("Automatically triggering pipeline: {}", pipelineToTrigger.getName());
                            pipelineService.triggerPipeline(pipelineToTrigger.getId(), "WEBHOOK");
                            return ResponseEntity.ok("Webhook processed! Automatically triggered pipeline run ID: " + pipelineToTrigger.getId());
                        } else {
                            return ResponseEntity.ok("Webhook received! No active pipelines registered for repo: " + matchedRepo.getName());
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Failed to parse GitHub webhook repository payload: {}", e.getMessage());
            }
        }

        // Fallback: trigger first available pipeline if payload is mock or empty
        log.warn("Github webhook payload mismatch or no repositories found. Auto-triggering first active pipeline fallback...");
        List<Pipeline> all = pipelineRepository.findAll();
        if (!all.isEmpty()) {
            Pipeline target = all.get(0);
            pipelineService.triggerPipeline(target.getId(), "WEBHOOK");
            return ResponseEntity.ok("Webhook processed! Fallback triggered pipeline run ID: " + target.getId());
        }

        return ResponseEntity.ok("Webhook received! No pipelines connected to trigger.");
    }
}
