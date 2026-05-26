package com.devsecops.dashboard.service;

import com.devsecops.dashboard.entity.Notification;
import com.devsecops.dashboard.repository.NotificationRepository;
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
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Notification sendNotification(Long userId, String type, String message) {
        log.info("Sending notification: {} - {}", type, message);

        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .isRead(false)
                .timestamp(LocalDateTime.now())
                .build();

        Notification savedNotification = notificationRepository.save(notification);

        // Broadcast notification through WebSocket STOMP Simple Broker
        try {
            messagingTemplate.convertAndSend("/topic/notifications", savedNotification);
        } catch (Exception e) {
            log.error("Failed to broadcast notification via WebSocket: {}", e.getMessage());
        }

        // Simulate Email and Slack integrations
        simulateSlackNotification(type, message);
        simulateEmailNotification(type, message);

        return savedNotification;
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByTimestampDesc();
    }

    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    private void simulateSlackNotification(String type, String message) {
        log.info("[SLACK INTEGRATION SIMULATOR] Dispatching message: [{}] - {}", type, message);
    }

    private void simulateEmailNotification(String type, String message) {
        log.info("[EMAIL INTEGRATION SIMULATOR] Dispatching alert to subscription list: [{}] - {}", type, message);
    }
}
