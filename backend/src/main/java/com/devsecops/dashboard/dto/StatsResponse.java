package com.devsecops.dashboard.dto;

import java.util.List;

public record StatsResponse(
    long totalProjects,
    double buildSuccessRate,
    double deploymentFrequency,
    long criticalVulnerabilities,
    long highVulnerabilities,
    long totalPipelinesCount,
    List<PipelineResponse> recentPipelines,
    List<DeploymentResponse> recentDeployments
) {}
