package com.devsecops.dashboard.service;

import com.devsecops.dashboard.dto.StatsResponse;
import com.devsecops.dashboard.entity.Build;
import com.devsecops.dashboard.entity.Deployment;
import com.devsecops.dashboard.entity.Pipeline;
import com.devsecops.dashboard.entity.ScanReport;
import com.devsecops.dashboard.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final RepositoryRepository repositoryRepository;
    private final PipelineRepository pipelineRepository;
    private final BuildRepository buildRepository;
    private final DeploymentRepository deploymentRepository;
    private final ScanReportRepository scanReportRepository;

    public StatsResponse getDashboardStats() {
        long totalProjects = repositoryRepository.count();
        long totalPipelines = pipelineRepository.count();

        // Build success rate
        List<Build> builds = buildRepository.findAll();
        double successRate = 100.0;
        if (!builds.isEmpty()) {
            long success = builds.stream().filter(b -> "SUCCESS".equals(b.getStatus())).count();
            successRate = (double) success / builds.size() * 100.0;
        }

        // Deployment frequency (mock/derived count per day)
        long totalDeployments = deploymentRepository.count();
        double deploymentFrequency = totalDeployments == 0 ? 0.0 : (double) totalDeployments / 7.0; // average per day over a week

        // Critical and High vulnerabilities
        List<ScanReport> reports = scanReportRepository.findAll();
        long criticalVulnerabilities = reports.stream().mapToLong(ScanReport::getCriticalCount).sum();
        long highVulnerabilities = reports.stream().mapToLong(ScanReport::getHighCount).sum();

        // Recent pipeline activities
        List<Pipeline> recentPipelines = pipelineRepository.findTop10ByOrderByUpdatedAtDesc();
        List<com.devsecops.dashboard.dto.PipelineResponse> recentPipelineDTOs = recentPipelines.stream()
                .map(this::mapToPipelineResponse)
                .collect(Collectors.toList());

        // Recent Deployments
        List<Deployment> recentDeployments = deploymentRepository.findTop10ByOrderByCreatedAtDesc();
        List<com.devsecops.dashboard.dto.DeploymentResponse> recentDeploymentDTOs = recentDeployments.stream()
                .map(this::mapToDeploymentResponse)
                .collect(Collectors.toList());

        return new StatsResponse(
                totalProjects,
                Math.round(successRate * 10.0) / 10.0,
                Math.round(deploymentFrequency * 10.0) / 10.0,
                criticalVulnerabilities,
                highVulnerabilities,
                totalPipelines,
                recentPipelineDTOs,
                recentDeploymentDTOs
        );
    }

    private com.devsecops.dashboard.dto.PipelineResponse mapToPipelineResponse(Pipeline p) {
        List<com.devsecops.dashboard.dto.PipelineStageResponse> stages = p.getStages().stream()
                .map(s -> new com.devsecops.dashboard.dto.PipelineStageResponse(
                        s.getId(),
                        s.getName(),
                        s.getStatus(),
                        s.getDurationMs(),
                        s.getOrderIndex(),
                        s.getStartedAt(),
                        s.getEndedAt()
                )).collect(Collectors.toList());

        return new com.devsecops.dashboard.dto.PipelineResponse(
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

    private com.devsecops.dashboard.dto.DeploymentResponse mapToDeploymentResponse(Deployment d) {
        return new com.devsecops.dashboard.dto.DeploymentResponse(
                d.getId(),
                d.getPipeline().getId(),
                d.getPipeline().getName(),
                d.getEnvironment(),
                d.getStatus(),
                d.getLogs(),
                d.getRollbackToId(),
                d.getCreatedAt()
        );
    }

    public com.devsecops.dashboard.dto.SecuritySummaryResponse getSecuritySummary() {
        List<ScanReport> reports = scanReportRepository.findAll();
        long critical = reports.stream().mapToLong(ScanReport::getCriticalCount).sum();
        long high = reports.stream().mapToLong(ScanReport::getHighCount).sum();
        long medium = reports.stream().mapToLong(ScanReport::getMediumCount).sum();
        long low = reports.stream().mapToLong(ScanReport::getLowCount).sum();
        
        return new com.devsecops.dashboard.dto.SecuritySummaryResponse(critical, high, medium, low);
    }
}
