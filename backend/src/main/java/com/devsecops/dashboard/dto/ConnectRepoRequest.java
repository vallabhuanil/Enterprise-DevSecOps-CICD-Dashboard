package com.devsecops.dashboard.dto;

import jakarta.validation.constraints.NotBlank;

public record ConnectRepoRequest(
    @NotBlank String repoUrl,
    @NotBlank String branch
) {}
