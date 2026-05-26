package com.devsecops.dashboard.service;

import com.devsecops.dashboard.dto.ConnectRepoRequest;
import com.devsecops.dashboard.entity.Pipeline;
import com.devsecops.dashboard.entity.PipelineStage;
import com.devsecops.dashboard.entity.Repository;
import com.devsecops.dashboard.entity.User;
import com.devsecops.dashboard.exception.BadRequestException;
import com.devsecops.dashboard.exception.ResourceNotFoundException;
import com.devsecops.dashboard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepositoryService {
    private final RepositoryRepository repositoryRepository;
    private final UserRepository userRepository;
    private final PipelineRepository pipelineRepository;
    private final PipelineStageRepository pipelineStageRepository;
    private final BuildRepository buildRepository;
    private final ScanReportRepository scanReportRepository;
    private final DeploymentRepository deploymentRepository;
    private final AuditLogService auditLogService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Repository connectRepository(ConnectRepoRequest request, String username) {
        validateRepoUrl(request.repoUrl());

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        String name = deriveNameFromUrl(request.repoUrl());

        if (repositoryRepository.findByRepoUrl(request.repoUrl()).isPresent()) {
            throw new BadRequestException("Repository already connected!");
        }

        Repository repo = Repository.builder()
                .name(name)
                .repoUrl(request.repoUrl())
                .branch(request.branch())
                .user(user)
                .build();

        Repository savedRepo = repositoryRepository.save(repo);

        Pipeline pipeline = Pipeline.builder()
                .name(name + "-pipeline")
                .repository(savedRepo)
                .status("PENDING")
                .triggerType("MANUAL")
                .build();

        Pipeline savedPipeline = pipelineRepository.save(pipeline);

        String[] stageNames = {"BUILD", "TEST", "SECURITY_SCAN", "DEPLOY"};
        for (int i = 0; i < stageNames.length; i++) {
            PipelineStage stage = PipelineStage.builder()
                    .pipeline(savedPipeline)
                    .name(stageNames[i])
                    .status("PENDING")
                    .orderIndex(i + 1)
                    .build();
            pipelineStageRepository.save(stage);
        }

        auditLogService.logAction(user.getId(), username, "Connected Repository",
                "Connected repository " + name + " with branch " + request.branch());
        return savedRepo;
    }

    public List<Repository> getAllRepositories() {
        return repositoryRepository.findAll();
    }

    public Repository getRepositoryById(Long id) {
        return repositoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found with id: " + id));
    }

    @Transactional
    public void deleteRepository(Long id, String username) {
        Repository repo = repositoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found with id: " + id));

        String repoName = repo.getName();
        log.info("Admin '{}' initiating deletion of repository '{}' (id={})", username, repoName, id);

        List<Pipeline> pipelines = pipelineRepository.findByRepositoryId(id);
        log.info("Found {} pipeline(s) linked to repository '{}'", pipelines.size(), repoName);

        // Cascade delete child records for each pipeline
        for (Pipeline pipeline : pipelines) {
            Long pipelineId = pipeline.getId();

            // Delete scan reports
            var scans = scanReportRepository.findByPipelineIdOrderByCreatedAtDesc(pipelineId);
            if (!scans.isEmpty()) {
                scanReportRepository.deleteAll(scans);
                log.debug("Deleted {} scan report(s) for pipeline id={}", scans.size(), pipelineId);
            }

            // Delete builds
            var builds = buildRepository.findByPipelineIdOrderByCreatedAtDesc(pipelineId);
            if (!builds.isEmpty()) {
                buildRepository.deleteAll(builds);
                log.debug("Deleted {} build(s) for pipeline id={}", builds.size(), pipelineId);
            }

            // Delete deployments
            var deployments = deploymentRepository.findByPipelineIdOrderByCreatedAtDesc(pipelineId);
            if (!deployments.isEmpty()) {
                deploymentRepository.deleteAll(deployments);
                log.debug("Deleted {} deployment(s) for pipeline id={}", deployments.size(), pipelineId);
            }
        }

        // Delete all pipelines (CascadeType.ALL on stages handles pipeline_stages automatically)
        pipelineRepository.deleteAll(pipelines);
        log.info("Deleted {} pipeline(s) for repository '{}'", pipelines.size(), repoName);

        // Delete the repository itself
        repositoryRepository.delete(repo);
        log.info("Repository '{}' (id={}) permanently deleted by admin '{}'", repoName, id, username);

        // Audit log
        auditLogService.logAction(null, username, "DELETE_REPOSITORY",
                "Admin permanently removed repository '" + repoName + "' and all associated pipelines, builds, deployments, and scans");

        // Broadcast WebSocket event for real-time dashboard refresh
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "REPOSITORY_DELETED");
            event.put("repositoryId", id);
            event.put("repositoryName", repoName);
            event.put("deletedBy", username);
            messagingTemplate.convertAndSend("/topic/repository-events", event);
            log.debug("WebSocket REPOSITORY_DELETED event broadcast for repo '{}'", repoName);
        } catch (Exception e) {
            log.warn("Failed to broadcast WebSocket deletion event: {}", e.getMessage());
        }
    }

    private void validateRepoUrl(String repoUrl) {
        if (repoUrl == null || !repoUrl.startsWith("http")) {
            throw new BadRequestException("Invalid repository URL! Must start with http or https");
        }
        try {
            new URL(repoUrl);
        } catch (Exception e) {
            throw new BadRequestException("Invalid repository URL structure: " + e.getMessage());
        }
    }

    private String deriveNameFromUrl(String repoUrl) {
        try {
            String path = new URL(repoUrl).getPath();
            if (path.endsWith("/")) {
                path = path.substring(0, path.length() - 1);
            }
            int lastSlash = path.lastIndexOf("/");
            String name = path.substring(lastSlash + 1);
            if (name.endsWith(".git")) {
                name = name.substring(0, name.length() - 4);
            }
            return name;
        } catch (Exception e) {
            return "unknown-repo";
        }
    }
}
