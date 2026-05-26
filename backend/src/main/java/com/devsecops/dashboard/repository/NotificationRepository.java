package com.devsecops.dashboard.repository;

import com.devsecops.dashboard.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByTimestampDesc(Long userId);
    List<Notification> findByUserIdAndIsReadOrderByTimestampDesc(Long userId, boolean isRead);
    List<Notification> findByIsReadOrderByTimestampDesc(boolean isRead);
    List<Notification> findAllByOrderByTimestampDesc();
}
