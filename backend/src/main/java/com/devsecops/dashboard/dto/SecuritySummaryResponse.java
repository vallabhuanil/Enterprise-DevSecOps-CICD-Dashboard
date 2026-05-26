package com.devsecops.dashboard.dto;

public record SecuritySummaryResponse(
    long critical,
    long high,
    long medium,
    long low
) {}
