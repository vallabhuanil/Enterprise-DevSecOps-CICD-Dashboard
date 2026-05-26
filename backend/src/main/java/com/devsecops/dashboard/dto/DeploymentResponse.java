package com.devsecops.dashboard.dto;

import java.time.LocalDateTime;

public record DeploymentResponse(
    Long id,
    Long pipelineId,
    String pipelineName,
    String environment,
    String status,
    String logs,
    Long rollbackToId,
    LocalDateTime createdAt
) {}
