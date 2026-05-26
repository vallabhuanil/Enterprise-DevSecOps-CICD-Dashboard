package com.devsecops.dashboard.service;

import com.devsecops.dashboard.entity.Pipeline;
import com.devsecops.dashboard.entity.ScanReport;
import com.devsecops.dashboard.repository.ScanReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanService {
    private final ScanReportRepository scanReportRepository;
    private final NotificationService notificationService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ScanReport runSimulatedScan(Pipeline pipeline) {
        log.info("Running simulated security scans for pipeline ID: {}", pipeline.getId());
        Random random = new Random();

        // 1. Dependency Scan (OWASP)
        int owaspCritical = random.nextInt(2); // 0 or 1
        int owaspHigh = random.nextInt(3);
        int owaspMedium = random.nextInt(5);
        int owaspLow = random.nextInt(10);
        String owaspDetails = generateOwaspDetails(owaspCritical, owaspHigh, owaspMedium, owaspLow);

        ScanReport dependencyReport = ScanReport.builder()
                .pipeline(pipeline)
                .scanType("DEPENDENCY")
                .toolSimulated("OWASP_DEPENDENCY_CHECK")
                .criticalCount(owaspCritical)
                .highCount(owaspHigh)
                .mediumCount(owaspMedium)
                .lowCount(owaspLow)
                .reportDetails(owaspDetails)
                .build();
        scanReportRepository.save(dependencyReport);

        // 2. Static Code Analysis (SonarQube)
        int sqCritical = random.nextInt(2);
        int sqHigh = random.nextInt(2);
        int sqMedium = random.nextInt(8);
        int sqLow = random.nextInt(15);
        String sqDetails = generateSonarQubeDetails(sqCritical, sqHigh, sqMedium, sqLow);

        ScanReport staticReport = ScanReport.builder()
                .pipeline(pipeline)
                .scanType("STATIC_CODE")
                .toolSimulated("SONARQUBE")
                .criticalCount(sqCritical)
                .highCount(sqHigh)
                .mediumCount(sqMedium)
                .lowCount(sqLow)
                .reportDetails(sqDetails)
                .build();
        scanReportRepository.save(staticReport);

        // 3. Secret Detection (Trivy)
        int trivyCritical = random.nextBoolean() ? 0 : 1; // 50% chance of critical secrets leaked
        int trivyHigh = random.nextInt(2);
        int trivyMedium = 0;
        int trivyLow = 0;
        String trivyDetails = generateTrivyDetails(trivyCritical, trivyHigh);

        ScanReport secretReport = ScanReport.builder()
                .pipeline(pipeline)
                .scanType("SECRET")
                .toolSimulated("TRIVY")
                .criticalCount(trivyCritical)
                .highCount(trivyHigh)
                .mediumCount(trivyMedium)
                .lowCount(trivyLow)
                .reportDetails(trivyDetails)
                .build();
        scanReportRepository.save(secretReport);

        // Trigger notifications if Critical vulnerabilities are found
        int totalCritical = owaspCritical + sqCritical + trivyCritical;
        if (totalCritical > 0) {
            notificationService.sendNotification(
                    null,
                    "VULNERABILITY_DETECTED",
                    "Security Scan found " + totalCritical + " CRITICAL vulnerabilities in pipeline " + pipeline.getName()
            );
        }

        messagingTemplate.convertAndSend("/topic/scans", dependencyReport);
        messagingTemplate.convertAndSend("/topic/scans", staticReport);
        messagingTemplate.convertAndSend("/topic/scans", secretReport);

        return staticReport; // return one of the reports as primary reference
    }

    public List<ScanReport> getReportsForPipeline(Long pipelineId) {
        return scanReportRepository.findByPipelineIdOrderByCreatedAtDesc(pipelineId);
    }

    public List<ScanReport> getAllReports() {
        return scanReportRepository.findAll();
    }

    public ScanReport getReportById(Long id) {
        return scanReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Scan report not found with id: " + id));
    }

    private String generateOwaspDetails(int crit, int high, int med, int low) {
        return String.format(
            "OWASP Dependency Check Security Scan Report\n" +
            "===========================================\n" +
            "Critical: %d, High: %d, Medium: %d, Low: %d\n\n" +
            "Identified Vulnerabilities:\n" +
            "- CVE-2023-4586: Netty HTTP/2 Encoder buffer overflow (CRITICAL)\n" +
            "- CVE-2024-1049: Spring Security Authentication Bypass context leak (HIGH)\n" +
            "- CVE-2023-3901: Jackson Databind gadget deserialization vulnerability (MEDIUM)",
            crit, high, med, low
        );
    }

    private String generateSonarQubeDetails(int crit, int high, int med, int low) {
        return String.format(
            "SonarQube Static Analysis Security Report\n" +
            "==========================================\n" +
            "Critical: %d, High: %d, Medium: %d, Low: %d\n\n" +
            "Quality Gate Status: PASSED with Warnings\n" +
            "Identified issues:\n" +
            "- Rule java:S2068: Hardcoded password credential discovered in bootstrap config (CRITICAL)\n" +
            "- Rule java:S5344: Weak cryptographic hashing algorithm (SHA-1) in password reset (HIGH)\n" +
            "- Rule java:S1141: Try-catch blocks nested too deeply (LOW)",
            crit, high, med, low
        );
    }

    private String generateTrivyDetails(int crit, int high) {
        return String.format(
            "Trivy Container and Secret Scanner Report\n" +
            "==========================================\n" +
            "Critical: %d, High: %d\n\n" +
            "Identified Secrets:\n" +
            "- Private AWS Access Key discovered in plaintext in application-dev.yml (CRITICAL)\n" +
            "- PostgreSQL plaintext credentials stored in Dockerfile ENV instructions (HIGH)",
            crit, high
        );
    }
}
