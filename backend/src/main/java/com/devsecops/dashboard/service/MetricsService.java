package com.devsecops.dashboard.service;

import com.devsecops.dashboard.entity.Build;
import com.devsecops.dashboard.entity.Deployment;
import com.devsecops.dashboard.entity.Metrics;
import com.devsecops.dashboard.repository.BuildRepository;
import com.devsecops.dashboard.repository.DeploymentRepository;
import com.devsecops.dashboard.repository.MetricsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetricsService {
    private final MetricsRepository metricsRepository;
    private final BuildRepository buildRepository;
    private final DeploymentRepository deploymentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public Metrics getLatestMetrics() {
        return metricsRepository.findFirstByOrderByTimestampDesc()
                .orElseGet(this::generateInitialMetrics);
    }

    // Cron job to generate and broadcast new platform CPU/Memory metrics every 5 seconds
    @Scheduled(fixedRate = 60000)
    public void generateAndBroadcastMetrics() {
        Random rand = new Random();

        // Simulate fluctuating CPU and Memory usage
        double cpu = 20.0 + rand.nextDouble() * 45.0; // fluctuates between 20% and 65%
        double memory = 40.0 + rand.nextDouble() * 25.0; // fluctuates between 40% and 65%

        // Derived build success rate
        List<Build> builds = buildRepository.findAll();
        double successRate = 100.0;
        if (!builds.isEmpty()) {
            long success = builds.stream().filter(b -> "SUCCESS".equals(b.getStatus())).count();
            successRate = (double) success / builds.size() * 100.0;
        }

        // Derived deployments
        List<Deployment> deployments = deploymentRepository.findAll();
        long failedDeployments = deployments.stream().filter(d -> "FAILED".equals(d.getStatus())).count();
        double deployFreq = deployments.size() == 0 ? 0.0 : (double) deployments.size() / 7.0;

        Metrics metric = Metrics.builder()
                .cpuUsage(Math.round(cpu * 10.0) / 10.0)
                .memoryUsage(Math.round(memory * 10.0) / 10.0)
                .buildSuccessRate(Math.round(successRate * 10.0) / 10.0)
                .deploymentFrequency(Math.round(deployFreq * 10.0) / 10.0)
                .failedDeploymentsCount((int) failedDeployments)
                .avgBuildDuration(9L) // mock average duration in seconds
                .timestamp(LocalDateTime.now())
                .build();

        Metrics saved = metricsRepository.save(metric);

        // Broadcast to WebSocket clients
        try {
            messagingTemplate.convertAndSend("/topic/metrics", saved);
        } catch (Exception e) {
            // log occasionally
        }
    }

    private Metrics generateInitialMetrics() {
        return Metrics.builder()
                .cpuUsage(35.5)
                .memoryUsage(48.2)
                .buildSuccessRate(95.0)
                .deploymentFrequency(2.4)
                .failedDeploymentsCount(1)
                .avgBuildDuration(9L)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
