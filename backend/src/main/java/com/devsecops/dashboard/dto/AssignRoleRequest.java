package com.devsecops.dashboard.dto;

import jakarta.validation.constraints.NotBlank;

public record AssignRoleRequest(
    @NotBlank String roleName
) {}
