package com.devsecops.dashboard.dto;

public record TokenRefreshResponse(
    String token,
    String refreshToken
) {}
