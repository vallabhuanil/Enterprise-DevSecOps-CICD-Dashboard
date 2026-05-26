package com.devsecops.dashboard.controller;

import com.devsecops.dashboard.entity.Notification;
import com.devsecops.dashboard.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<String> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok("Notification marked as read");
    }

    @PostMapping("/send")
    public ResponseEntity<Notification> sendNotification(
            @RequestParam(required = false) Long userId,
            @RequestParam String type,
            @RequestParam String message) {
        return ResponseEntity.ok(notificationService.sendNotification(userId, type, message));
    }
}
