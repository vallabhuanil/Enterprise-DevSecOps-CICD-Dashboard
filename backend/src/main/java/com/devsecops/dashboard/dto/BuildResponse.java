package com.devsecops.dashboard.dto;

import java.time.LocalDateTime;

public record BuildResponse(
    Long id,
    Long pipelineId,
    String pipelineName,
    String status,
    String duration,
    String logs,
    LocalDateTime createdAt
) {}
