package com.devsecops.dashboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DeploymentRequest(
    @NotNull Long pipelineId,
    @NotBlank String environment
) {}
