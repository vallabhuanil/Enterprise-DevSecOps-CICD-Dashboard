package com.devsecops.dashboard.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PipelineResponse(
    Long id,
    String name,
    Long repositoryId,
    String repositoryName,
    String repoUrl,
    String branch,
    String status,
    String triggerType,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    List<PipelineStageResponse> stages
) {}
