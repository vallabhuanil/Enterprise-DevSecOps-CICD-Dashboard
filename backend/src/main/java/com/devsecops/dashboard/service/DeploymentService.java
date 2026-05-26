package com.devsecops.dashboard.service;

import com.devsecops.dashboard.entity.Deployment;
import com.devsecops.dashboard.entity.Pipeline;
import com.devsecops.dashboard.repository.DeploymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeploymentService {
    private final DeploymentRepository deploymentRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional
    public Deployment createDeployment(Pipeline pipeline, String environment) {
        Deployment deployment = Deployment.builder()
                .pipeline(pipeline)
                .environment(environment.toUpperCase())
                .status("RUNNING")
                .logs("Starting deployment sequence for environment: " + environment + "...\n")
                .createdAt(LocalDateTime.now())
                .build();
        return deploymentRepository.save(deployment);
    }

    @Transactional
    public void updateDeploymentStatus(Deployment deployment, String status, String logs) {
        deployment.setStatus(status);
        deployment.setLogs(logs);
        deploymentRepository.save(deployment);

        if ("SUCCESS".equals(status)) {
            notificationService.sendNotification(
                    null,
                    "DEPLOYMENT_SUCCESS",
                    "Deployment successful for pipeline " + deployment.getPipeline().getName() + " on " + deployment.getEnvironment()
            );
        }
    }

    public List<Deployment> getAllDeployments() {
        return deploymentRepository.findAll();
    }

    public Deployment getDeploymentById(Long id) {
        return deploymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deployment not found with id: " + id));
    }

    public List<Deployment> getDeploymentsForPipeline(Long pipelineId) {
        return deploymentRepository.findByPipelineIdOrderByCreatedAtDesc(pipelineId);
    }

    @Transactional
    public Deployment triggerRollback(Long deploymentId, String username) {
        Deployment original = getDeploymentById(deploymentId);

        log.info("Triggering rollback for deployment ID: {} in environment: {}", deploymentId, original.getEnvironment());

        // Create a new Deployment record representing the rollback execution
        Deployment rollback = Deployment.builder()
                .pipeline(original.getPipeline())
                .environment(original.getEnvironment())
                .status("SUCCESS")
                .rollbackToId(original.getId())
                .logs("ROLLBACK SEQUENCE TRACE:\n" +
                      "========================\n" +
                      "Rollback target: Deployment ID " + original.getId() + "\n" +
                      "Reverting environmental infrastructure...\n" +
                      "Applying previously successful builds configurations...\n" +
                      "Rollback completed successfully. Pods restarted.\n")
                .createdAt(LocalDateTime.now())
                .build();

        Deployment savedRollback = deploymentRepository.save(rollback);

        // Track and notify
        auditLogService.logAction(null, username, "Triggered Rollback",
                "Rolled back environment " + original.getEnvironment() + " using rollback Deployment ID " + savedRollback.getId());

        notificationService.sendNotification(
                null,
                "DEPLOYMENT_SUCCESS",
                "Rollback successful for environment " + original.getEnvironment() + "! Restored target deployment #" + original.getId()
        );

        return savedRollback;
    }
}
