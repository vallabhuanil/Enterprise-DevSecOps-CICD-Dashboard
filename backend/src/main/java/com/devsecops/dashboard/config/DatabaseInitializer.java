package com.devsecops.dashboard.config;

import com.devsecops.dashboard.entity.EmailOtp;
import com.devsecops.dashboard.entity.Role;
import com.devsecops.dashboard.entity.User;
import com.devsecops.dashboard.entity.UserRole;
import com.devsecops.dashboard.repository.EmailOtpRepository;
import com.devsecops.dashboard.repository.RoleRepository;
import com.devsecops.dashboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailOtpRepository emailOtpRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("Initializing system roles and admin account...");

        // 1. Seed Roles
        for (UserRole roleName : UserRole.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(Role.builder().name(roleName).build());
                log.info("Role seeded: {}", roleName);
            }
        }

        // 2. Seed Default Admin
        if (!userRepository.existsByUsername("admin")) {
            Role adminRole = roleRepository.findByName(UserRole.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Error: Role Admin is not found."));

            User adminUser = User.builder()
                    .username("admin")
                    .email("admin@devsecops.com")
                    .password(passwordEncoder.encode("adminpassword"))
                    .roles(new HashSet<>(Collections.singletonList(adminRole)))
                    .build();

            userRepository.save(adminUser);
            log.info("Default Admin account created successfully! Username: admin, Password: adminpassword");
        }

        // 3. Verify EmailOtp CRUD Connectivity
        verifyEmailOtpTable();
    }

    private void verifyEmailOtpTable() {
        log.info("Starting EmailOtp database CRUD connectivity verification check...");
        try {
            String testEmail = "test_startup_verification_check@devsecops.local";
            
            // Delete any existing mock records
            emailOtpRepository.deleteByEmail(testEmail);

            // Build test record
            EmailOtp testOtp = EmailOtp.builder()
                    .email(testEmail)
                    .otpCode("999999")
                    .verified(false)
                    .purpose("STARTUP_TEST")
                    .expiresAt(LocalDateTime.now().plusMinutes(5))
                    .build();

            // Save record
            EmailOtp saved = emailOtpRepository.save(testOtp);
            log.info("EmailOtp table WRITE success. Temp record ID: {}", saved.getId());

            // Query record
            EmailOtp fetched = emailOtpRepository.findTopByEmailOrderByCreatedAtDesc(testEmail)
                    .orElseThrow(() -> new RuntimeException("EmailOtp row could not be found after saving!"));
            log.info("EmailOtp table READ success. Purpose: {}, Code: {}", fetched.getPurpose(), fetched.getOtpCode());

            // Delete record
            emailOtpRepository.delete(fetched);
            log.info("EmailOtp table DELETE success. Startup database sanity verification completed successfully!");
        } catch (Exception e) {
            log.error("CRITICAL ERROR: Failed to complete EmailOtp table database CRUD startup check!", e);
        }
    }
}
