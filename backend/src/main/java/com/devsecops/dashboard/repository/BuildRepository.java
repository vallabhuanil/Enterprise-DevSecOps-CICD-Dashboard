package com.devsecops.dashboard.repository;

import com.devsecops.dashboard.entity.Build;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BuildRepository extends JpaRepository<Build, Long> {
    List<Build> findByPipelineIdOrderByCreatedAtDesc(Long pipelineId);
    List<Build> findTop10ByOrderByCreatedAtDesc();
}
