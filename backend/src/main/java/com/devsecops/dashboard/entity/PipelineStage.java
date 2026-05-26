package com.devsecops.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "pipeline_stages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PipelineStage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    @JsonIgnore
    private Pipeline pipeline;

    @Column(nullable = false)
    private String name; // BUILD, TEST, SECURITY_SCAN, DEPLOY

    @Column(nullable = false)
    private String status; // SUCCESS, FAILED, RUNNING, PENDING

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;
}
