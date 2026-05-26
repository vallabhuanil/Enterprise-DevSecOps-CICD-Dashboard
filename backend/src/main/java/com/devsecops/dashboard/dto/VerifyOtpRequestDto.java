package com.devsecops.dashboard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequestDto(
    @NotBlank(message = "Email is required!")
    @Email(message = "Please enter a valid email address!")
    String email,

    @NotBlank(message = "OTP is required!")
    @Size(min = 6, max = 6, message = "OTP must be exactly 6 digits!")
    String otp
) {}
