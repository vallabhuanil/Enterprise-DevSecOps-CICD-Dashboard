package com.devsecops.dashboard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "scan_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pipeline_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Pipeline pipeline;

    @Column(name = "scan_type", nullable = false)
    private String scanType; // DEPENDENCY, STATIC_CODE, SECRET

    @Column(name = "tool_simulated", nullable = false)
    private String toolSimulated; // SONARQUBE, OWASP_DEPENDENCY_CHECK, TRIVY

    @Column(name = "critical_count", nullable = false)
    @Builder.Default
    private Integer criticalCount = 0;

    @Column(name = "high_count", nullable = false)
    @Builder.Default
    private Integer highCount = 0;

    @Column(name = "medium_count", nullable = false)
    @Builder.Default
    private Integer mediumCount = 0;

    @Column(name = "low_count", nullable = false)
    @Builder.Default
    private Integer lowCount = 0;

    @Column(name = "report_details", columnDefinition = "TEXT")
    private String reportDetails;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Added to support frontend's expected properties without changing DB schema
    @com.fasterxml.jackson.annotation.JsonProperty("criticalVulnerabilities")
    public Integer getCriticalVulnerabilities() {
        return criticalCount;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("highVulnerabilities")
    public Integer getHighVulnerabilities() {
        return highCount;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("mediumVulnerabilities")
    public Integer getMediumVulnerabilities() {
        return mediumCount;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("lowVulnerabilities")
    public Integer getLowVulnerabilities() {
        return lowCount;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("scannerType")
    public String getScannerType() {
        return scanType;
    }
}
