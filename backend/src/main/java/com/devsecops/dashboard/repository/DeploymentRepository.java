package com.devsecops.dashboard.repository;

import com.devsecops.dashboard.entity.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeploymentRepository extends JpaRepository<Deployment, Long> {
    List<Deployment> findByPipelineIdOrderByCreatedAtDesc(Long pipelineId);
    List<Deployment> findByEnvironmentOrderByCreatedAtDesc(String environment);
    List<Deployment> findTop10ByOrderByCreatedAtDesc();
}
