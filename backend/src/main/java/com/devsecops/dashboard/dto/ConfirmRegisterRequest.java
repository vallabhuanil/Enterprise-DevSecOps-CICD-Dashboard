package com.devsecops.dashboard.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmRegisterRequest(
    @NotBlank String email,
    @NotBlank String otp
) {}
