package com.devsecops.dashboard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "metrics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Metrics {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cpu_usage", nullable = false)
    private Double cpuUsage;

    @Column(name = "memory_usage", nullable = false)
    private Double memoryUsage;

    @Column(name = "build_success_rate", nullable = false)
    private Double buildSuccessRate;

    @Column(name = "deployment_frequency", nullable = false)
    private Double deploymentFrequency;

    @Column(name = "failed_deployments_count", nullable = false)
    private Integer failedDeploymentsCount;

    @Column(name = "avg_build_duration", nullable = false)
    private Long avgBuildDuration; // in seconds

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;
}
