package com.devsecops.dashboard.service;

import com.devsecops.dashboard.entity.Build;
import com.devsecops.dashboard.entity.Pipeline;
import com.devsecops.dashboard.repository.BuildRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BuildService {
    private final BuildRepository buildRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Build createBuild(Pipeline pipeline) {
        Build build = Build.builder()
                .pipeline(pipeline)
                .status("RUNNING")
                .duration("0s")
                .logs("Starting compilation sequence...\n")
                .createdAt(LocalDateTime.now())
                .build();
        return buildRepository.save(build);
    }

    @Transactional
    public void updateBuildStatus(Build build, String status, String duration, String logs) {
        build.setStatus(status);
        build.setDuration(duration);
        build.setLogs(logs);
        buildRepository.save(build);
    }

    public List<Build> getAllBuilds() {
        return buildRepository.findAll();
    }

    public Build getBuildById(Long id) {
        return buildRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Build not found with id: " + id));
    }

    public List<Build> getBuildsForPipeline(Long pipelineId) {
        return buildRepository.findByPipelineIdOrderByCreatedAtDesc(pipelineId);
    }

    // Streams a single log line via Websocket for a live build terminal
    public void streamLogLine(Long buildId, String logLine) {
        try {
            messagingTemplate.convertAndSend("/topic/logs/" + buildId, logLine);
        } catch (Exception e) {
            log.error("Failed to stream build log: {}", e.getMessage());
        }
    }
}
