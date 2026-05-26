package com.devsecops.dashboard.dto;

import java.time.LocalDateTime;

public record PipelineStageResponse(
    Long id,
    String name,
    String status,
    Long durationMs,
    Integer orderIndex,
    LocalDateTime startedAt,
    LocalDateTime endedAt
) {}
