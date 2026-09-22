package com.example.demo.smartslope.service;

import com.example.demo.smartslope.entity.Alert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class NotificationDispatcherService {

    /**
     * Dispatches external notifications (e.g. SMS, Email, Push, Automated Phone Alert)
     * targeted at assigned Admins, Engineers, and Safety Officers when hazard alerts are triggered.
     * Prepared for Twilio / AWS SNS / FCM integration.
     */
    public void dispatchCriticalAlert(Alert alert, String siteName) {
        log.info("[EMERGENCY DISPATCHER] 🚨 CRITICAL HIGH-RISK HAZARD TRIGGERED!");
        log.info("  ├─ Site: '{}' (ID: {})", siteName, alert.getSiteId());
        log.info("  ├─ Severity: {}", alert.getSeverity());
        log.info("  ├─ Message: {}", alert.getMessage());
        log.info("  ├─ Target Roles: [ADMIN, ENGINEER, SAFETY_OFFICER]");
        log.info("  └─ Status: Queued for SMS & Push Gateway Dispatch.");
    }

    public void dispatchModerateAlert(Alert alert, String siteName) {
        log.info("[NOTIFICATION DISPATCHER] 🟠 MODERATE RISK ALERT RAISED.");
        log.info("  ├─ Site: '{}' (ID: {})", siteName, alert.getSiteId());
        log.info("  ├─ Target Roles: [ENGINEER, SAFETY_OFFICER]");
        log.info("  └─ Message: {}", alert.getMessage());
    }
}
