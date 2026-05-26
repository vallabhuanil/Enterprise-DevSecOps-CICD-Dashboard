package com.devsecops.dashboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PipelineRequest(
    @NotBlank String name,
    @NotNull Long repositoryId
) {}
