package com.example.demo.smartslope.service;

import com.example.demo.smartslope.entity.Alert;
import com.example.demo.smartslope.entity.Prediction;
import com.example.demo.smartslope.entity.Role;
import com.example.demo.smartslope.entity.User;
import com.example.demo.smartslope.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import java.util.ArrayList;
import java.util.List;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class NotificationDispatcherService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private UserRepository userRepository;

    @Value("${smartslope.mail.from:smartslope.alerts@gmail.com}")
    private String fromEmail;

    @Value("${smartslope.admin.email:Admin@gmail.com}")
    private String adminEmail;

    /**
     * Sends an email via SMTP JavaMailSender.
     */
    public void sendEmailAlert(List<String> recipients, String subject, String bodyHtml) {
        if (recipients == null || recipients.isEmpty()) {
            recipients = List.of(adminEmail);
        }

        log.info("[EMAIL DISPATCH] Dispatching alert email to recipients: {}", recipients);

        if (mailSender == null) {
            log.warn("[EMAIL DISPATCH] JavaMailSender is not configured. Email logged to console.");
            log.info("  ├─ From: {}", fromEmail);
            log.info("  ├─ To: {}", recipients);
            log.info("  ├─ Subject: {}", subject);
            log.info("  └─ Body:\n{}", bodyHtml);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(recipients.toArray(new String[0]));
            helper.setSubject(subject);
            helper.setText(bodyHtml, true);

            mailSender.send(message);
            log.info("[EMAIL DISPATCH] SUCCESS: Email successfully sent via SMTP to {}", recipients);
        } catch (Exception e) {
            log.error("[EMAIL DISPATCH] ERROR: Failed to send email via SMTP ({}): {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }

    public void dispatchCriticalAlert(Alert alert, String siteName) {
        log.info("[EMERGENCY DISPATCHER] 🚨 CRITICAL HIGH-RISK HAZARD TRIGGERED!");
        log.info("  ├─ Site: '{}' (ID: {})", siteName, alert.getSiteId());
        log.info("  ├─ Severity: {}", alert.getSeverity());
        log.info("  ├─ Message: {}", alert.getMessage());

        List<String> recipients = getRecipientsForRoles(List.of(Role.ADMIN, Role.SAFETY_OFFICER, Role.ENGINEER));
        String subject = String.format("🚨 EMERGENCY HAZARD ALERT: High Landslide Failure Risk at %s", siteName);
        String body = buildEmailTemplate(alert, siteName, "CRITICAL HIGH RISK", "#ef4444");

        sendEmailAlert(recipients, subject, body);
    }

    public void dispatchModerateAlert(Alert alert, String siteName) {
        log.info("[NOTIFICATION DISPATCHER] 🟠 MODERATE RISK ALERT RAISED.");
        log.info("  ├─ Site: '{}' (ID: {})", siteName, alert.getSiteId());
        log.info("  ├─ Severity: {}", alert.getSeverity());
        log.info("  ├─ Message: {}", alert.getMessage());

        List<String> recipients = getRecipientsForRoles(List.of(Role.SAFETY_OFFICER, Role.ENGINEER, Role.ADMIN));
        String subject = String.format("⚠️ SLOPE WARNING ALERT: Moderate Landslide Risk at %s", siteName);
        String body = buildEmailTemplate(alert, siteName, "MODERATE RISK", "#f59e0b");

        sendEmailAlert(recipients, subject, body);
    }

    private List<String> getRecipientsForRoles(List<Role> roles) {
        List<String> emails = new ArrayList<>();
        try {
            List<User> users = userRepository.findAll();
            for (User u : users) {
                if (u.getEmail() != null && !u.getEmail().isBlank() && roles.contains(u.getRole())) {
                    if (!emails.contains(u.getEmail())) {
                        emails.add(u.getEmail());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not query user emails for notification: {}", e.getMessage());
        }

        if (emails.isEmpty()) {
            emails.add(adminEmail);
        }
        return emails;
    }

    private String buildEmailTemplate(Alert alert, String siteName, String riskTitle, String badgeColor) {
        Prediction p = alert.getPrediction();
        String probStr = (p != null && p.getProbability() != null) ? String.format("%.1f%%", p.getProbability()) : "N/A";
        String confStr = (p != null && p.getConfidenceScore() != null) ? String.format("%.1f%%", p.getConfidenceScore()) : "N/A";
        String recStr = (p != null && p.getRecommendation() != null) ? p.getRecommendation() : alert.getMessage();

        return String.format("""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid %s;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 16px;">
                  <h2 style="margin: 0; color: #f8fafc;">SmartSlope Early Warning Dispatch</h2>
                  <span style="background: %s; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 12px;">%s</span>
                </div>
                <div style="padding: 20px 0;">
                  <p style="font-size: 16px; margin-top: 0;"><strong>Monitoring Site:</strong> %s (ID: %d)</p>
                  <p style="font-size: 15px; color: #cbd5e1;"><strong>Failure Probability:</strong> <span style="color: %s; font-size: 18px; font-weight: bold;">%s</span></p>
                  <p style="font-size: 14px; color: #94a3b8;"><strong>Model Confidence:</strong> %s</p>
                  <div style="background: #0f172a; padding: 14px; border-radius: 8px; border-left: 4px solid %s; margin: 16px 0;">
                    <strong style="color: #f8fafc;">Recommended Emergency Action:</strong>
                    <p style="margin: 6px 0 0 0; color: #e2e8f0; font-size: 13.5px;">%s</p>
                  </div>
                  <p style="font-size: 13px; color: #94a3b8; margin: 0;">Alert Message: %s</p>
                  <p style="font-size: 12px; color: #64748b; margin-top: 12px;">Triggered at: %s</p>
                </div>
                <div style="border-top: 1px solid #334155; padding-top: 16px; text-align: center; font-size: 12px; color: #64748b;">
                  SmartSlope Telemetry & AI Risk Prediction Microservice Platform
                </div>
              </div>
            </body>
            </html>
            """,
            badgeColor, badgeColor, riskTitle, siteName, alert.getSiteId(), badgeColor, probStr, confStr, badgeColor, recStr, alert.getMessage(), alert.getSentAt()
        );
    }
}

