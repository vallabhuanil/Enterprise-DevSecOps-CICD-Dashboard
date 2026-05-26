package com.devsecops.dashboard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendOtpRequestDto(
    @NotBlank(message = "Email is required!")
    @Email(message = "Please enter a valid email address!")
    String email
) {}
