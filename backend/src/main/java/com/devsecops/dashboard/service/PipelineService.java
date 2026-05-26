package com.devsecops.dashboard.service;

import com.devsecops.dashboard.dto.*;
import com.devsecops.dashboard.entity.*;
import com.devsecops.dashboard.exception.ResourceNotFoundException;
import com.devsecops.dashboard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineService {
    private final PipelineRepository pipelineRepository;
    private final PipelineStageRepository pipelineStageRepository;
    private final RepositoryRepository repositoryRepository;
    private final BuildService buildService;
    private final ScanService scanService;
    private final DeploymentService deploymentService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public PipelineResponse createPipeline(PipelineRequest request) {
        Repository repo = repositoryRepository.findById(request.repositoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found with ID: " + request.repositoryId()));

        Pipeline pipeline = Pipeline.builder()
                .name(request.name())
                .repository(repo)
                .status("PENDING")
                .triggerType("MANUAL")
                .build();

        Pipeline saved = pipelineRepository.save(pipeline);

        // Seed 4 sequential stages
        String[] stageNames = {"BUILD", "TEST", "SECURITY_SCAN", "DEPLOY"};
        List<PipelineStage> stages = new ArrayList<>();
        for (int i = 0; i < stageNames.length; i++) {
            PipelineStage stage = PipelineStage.builder()
                    .pipeline(saved)
                    .name(stageNames[i])
                    .status("PENDING")
                    .orderIndex(i + 1)
                    .build();
            stages.add(pipelineStageRepository.save(stage));
        }

        saved.setStages(stages);
        return mapToResponse(saved);
    }

    public List<PipelineResponse> getAllPipelines() {
        return pipelineRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public PipelineResponse getPipelineById(Long id) {
        Pipeline p = pipelineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline not found with ID: " + id));
        return mapToResponse(p);
    }

    @Transactional
    public void deletePipeline(Long id) {
        Pipeline p = pipelineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline not found with ID: " + id));
        pipelineRepository.delete(p);
    }

    // Trigger pipeline run
    @Transactional
    public PipelineResponse triggerPipeline(Long id, String triggerType) {
        Pipeline p = pipelineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline not found with ID: " + id));

        p.setStatus("RUNNING");
        p.setTriggerType(triggerType);
        
        // Reset all stages to PENDING
        p.getStages().forEach(stage -> {
            stage.setStatus("PENDING");
            stage.setDurationMs(null);
            stage.setStartedAt(null);
            stage.setEndedAt(null);
            pipelineStageRepository.save(stage);
        });

        // Instantly create and save the build record so it commits inside this transaction
        Build build = buildService.createBuild(p);

        Pipeline saved = pipelineRepository.save(p);
        
        // Broadcast run start via WebSocket
        broadcastPipelineUpdate(saved);

        // Run execution sequence asynchronously in background thread simulator after transaction commits
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        java.util.concurrent.CompletableFuture.runAsync(() -> {
                            try {
                                runAsynchronousSimulation(saved.getId(), build.getId());
                            } catch (Exception e) {
                                log.error("Failed to run pipeline simulation", e);
                            }
                        });
                    }
                }
            );
        } else {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    runAsynchronousSimulation(saved.getId(), build.getId());
                } catch (Exception e) {
                    log.error("Failed to run pipeline simulation", e);
                }
            });
        }

        return mapToResponse(saved);
    }

    // Retries a failed pipeline run
    public PipelineResponse retryPipeline(Long id) {
        return triggerPipeline(id, "RETRY");
    }

    // Automatically trigger pipelines periodically (mock scheduled cron task)
    @Scheduled(cron = "0 0/15 * * * ?") // runs every 15 minutes
    public void runScheduledPipelines() {
        List<Pipeline> pipelines = pipelineRepository.findAll();
        if (!pipelines.isEmpty()) {
            log.info("[CRON SCHEDULER] Auto-triggering scheduled pipeline run...");
            // Trigger the first pipeline as sample scheduled task
            triggerPipeline(pipelines.get(0).getId(), "SCHEDULED");
        }
    }

    // Asynchronous background execution simulator
    protected void runAsynchronousSimulation(Long pipelineId, Long buildId) {
        log.info("Starting background thread pipeline execution simulator for pipeline ID: {} and build ID: {}", pipelineId, buildId);
        
        try {
            // Retrieve pipeline
            Pipeline pipeline = pipelineRepository.findById(pipelineId).orElse(null);
            if (pipeline == null) return;

            Build buildRecord = buildService.getBuildById(buildId);
            Random rand = new Random();
            boolean pipelineFailed = false;

            for (PipelineStage stage : pipeline.getStages()) {
                if (pipelineFailed) {
                    stage.setStatus("PENDING");
                    pipelineStageRepository.save(stage);
                    continue;
                }

                // 1. Start Stage
                stage.setStatus("RUNNING");
                stage.setStartedAt(LocalDateTime.now());
                pipelineStageRepository.save(stage);
                broadcastPipelineUpdate(pipeline);

                // 2. Simulate Work & Logs streaming based on the Stage
                String stageName = stage.getName();
                long startMs = System.currentTimeMillis();

                if ("BUILD".equals(stageName)) {
                    // Give frontend time to establish WebSocket subscription
                    Thread.sleep(1500);

                    StringBuilder logBuilder = new StringBuilder();
                    logBuilder.append(buildRecord.getLogs() != null ? buildRecord.getLogs() : "");
                    String[] logs = {
                        "Initializing build container...",
                        "Resolving Maven project dependencies...",
                        "Downloading: https://repo.maven.apache.org/maven2/org/springframework/spring-core/6.1.1.jar",
                        "Downloaded org.springframework:spring-core:6.1.1 (1.2 MB)",
                        "Compiling source files (32 classes)...",
                        "Executing javac compiling tools...",
                        "Packing target binaries into JAR: /target/devsecops-dashboard-0.0.1-SNAPSHOT.jar",
                        "Build jar completed successfully. Size: 48.2 MB",
                        "Uploading artifacts to secure repository storage..."
                    };

                    for (String line : logs) {
                        Thread.sleep(1200); // 1.2s delay per compiler line
                        String formattedLine = "[" + LocalDateTime.now() + "] [INFO] " + line + "\n";
                        logBuilder.append(formattedLine);
                        buildService.streamLogLine(buildRecord.getId(), formattedLine);
                    }

                    // 10% chance of build failure
                    if (rand.nextInt(10) == 0) {
                        String errorLine = "[" + LocalDateTime.now() + "] [ERROR] Compilation failed: Syntax error in WebSecurityConfig.java (line 42)\n";
                        logBuilder.append(errorLine);
                        buildService.streamLogLine(buildRecord.getId(), errorLine);
                        
                        pipelineFailed = true;
                        stage.setStatus("FAILED");
                        buildService.updateBuildStatus(buildRecord, "FAILED", "4s", logBuilder.toString());
                        notificationService.sendNotification(null, "BUILD_FAILED", "Build failed for pipeline: " + pipeline.getName());
                    } else {
                        stage.setStatus("SUCCESS");
                        buildService.updateBuildStatus(buildRecord, "SUCCESS", "9s", logBuilder.toString());
                    }

                } else if ("TEST".equals(stageName)) {
                    // Test Simulation
                    for (int t = 1; t <= 5; t++) {
                        Thread.sleep(1000);
                        String testLog = String.format("[%s] [INFO] Running JUnit TestSuite: TestCase%d - PASSED\n", LocalDateTime.now(), t);
                        if (buildRecord != null) {
                            buildService.streamLogLine(buildRecord.getId(), testLog);
                        }
                    }
                    stage.setStatus("SUCCESS");

                } else if ("SECURITY_SCAN".equals(stageName)) {
                    // Security Scan Simulation
                    if (buildRecord != null) {
                        buildService.streamLogLine(buildRecord.getId(), "[" + LocalDateTime.now() + "] [INFO] Triggering SonarQube quality gate verification...\n");
                        buildService.streamLogLine(buildRecord.getId(), "[" + LocalDateTime.now() + "] [INFO] Running OWASP Dependency vulnerability scan...\n");
                        buildService.streamLogLine(buildRecord.getId(), "[" + LocalDateTime.now() + "] [INFO] Running Trivy secrets audit...\n");
                    }
                    
                    Thread.sleep(2000);
                    scanService.runSimulatedScan(pipeline);
                    
                    if (buildRecord != null) {
                        buildService.streamLogLine(buildRecord.getId(), "[" + LocalDateTime.now() + "] [INFO] Quality Gate PASSED. No blocking vulnerabilities detected.\n");
                    }
                    stage.setStatus("SUCCESS");

                } else if ("DEPLOY".equals(stageName)) {
                    // Deployment Simulation
                    Deployment deployRecord = deploymentService.createDeployment(pipeline, "DEV");
                    
                    StringBuilder deployLogs = new StringBuilder();
                    String[] deployLines = {
                        "Pulling docker configuration target environments...",
                        "Authenticating credentials to secure Kubernetes cluster...",
                        "Applying deployment configs: kubectl apply -f deployment.yml...",
                        "Starting rolling restart of devsecops pods...",
                        "Verifying container status: Running (2/2)...",
                        "Health checks successfully completed!",
                        "Routing active networks traffic to version 0.0.1-SNAPSHOT."
                    };

                    for (String line : deployLines) {
                        Thread.sleep(1000);
                        String formatLog = "[" + LocalDateTime.now() + "] [DEPLOY] " + line + "\n";
                        deployLogs.append(formatLog);
                        if (buildRecord != null) {
                            buildService.streamLogLine(buildRecord.getId(), formatLog);
                        }
                    }

                    stage.setStatus("SUCCESS");
                    deploymentService.updateDeploymentStatus(deployRecord, "SUCCESS", deployLogs.toString());
                }

                // Finish Stage
                stage.setEndedAt(LocalDateTime.now());
                stage.setDurationMs(System.currentTimeMillis() - startMs);
                pipelineStageRepository.save(stage);
                broadcastPipelineUpdate(pipeline);
            }

            // Update Pipeline Overall Status
            pipeline.setStatus(pipelineFailed ? "FAILED" : "SUCCESS");
            pipelineRepository.save(pipeline);
            broadcastPipelineUpdate(pipeline);

        } catch (Exception e) {
            log.error("Error occurred in pipeline simulation thread run: ", e);
        }
    }

    private void broadcastPipelineUpdate(Pipeline pipeline) {
        try {
            messagingTemplate.convertAndSend("/topic/pipelines", mapToResponse(pipeline));
        } catch (Exception e) {
            log.error("Failed to broadcast pipeline status updates: {}", e.getMessage());
        }
    }

    private PipelineResponse mapToResponse(Pipeline p) {
        List<PipelineStageResponse> stages = p.getStages().stream()
                .map(s -> new PipelineStageResponse(
                        s.getId(),
                        s.getName(),
                        s.getStatus(),
                        s.getDurationMs(),
                        s.getOrderIndex(),
                        s.getStartedAt(),
                        s.getEndedAt()
                )).collect(Collectors.toList());

        return new PipelineResponse(
                p.getId(),
                p.getName(),
                p.getRepository().getId(),
                p.getRepository().getName(),
                p.getRepository().getRepoUrl(),
                p.getRepository().getBranch(),
                p.getStatus(),
                p.getTriggerType(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                stages
        );
    }
}
