package com.devsecops.dashboard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "builds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Build {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pipeline_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"repository", "stages"})
    private Pipeline pipeline;

    @Column(nullable = false)
    private String status; // SUCCESS, FAILED, RUNNING

    @Column(nullable = false)
    private String duration; // "4m 22s"

    @Column(columnDefinition = "TEXT")
    private String logs;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
