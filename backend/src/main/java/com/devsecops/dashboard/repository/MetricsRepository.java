package com.devsecops.dashboard.repository;

import com.devsecops.dashboard.entity.Metrics;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MetricsRepository extends JpaRepository<Metrics, Long> {
    Optional<Metrics> findFirstByOrderByTimestampDesc();
}
