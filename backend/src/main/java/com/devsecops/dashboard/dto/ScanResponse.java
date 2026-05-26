package com.devsecops.dashboard.dto;

import java.time.LocalDateTime;

public record ScanResponse(
    Long id,
    Long pipelineId,
    String pipelineName,
    String scanType,
    String toolSimulated,
    Integer criticalCount,
    Integer highCount,
    Integer mediumCount,
    Integer lowCount,
    String reportDetails,
    LocalDateTime createdAt
) {}
