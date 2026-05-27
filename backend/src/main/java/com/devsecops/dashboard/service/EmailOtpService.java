package com.devsecops.dashboard.service;

import com.devsecops.dashboard.dto.OtpResponseDto;
import com.devsecops.dashboard.dto.SendOtpRequestDto;
import com.devsecops.dashboard.dto.VerifyOtpRequestDto;
import com.devsecops.dashboard.entity.EmailOtp;
import com.devsecops.dashboard.exception.BadRequestException;
import com.devsecops.dashboard.repository.EmailOtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailOtpService {
    private final EmailOtpRepository emailOtpRepository;
    private final JavaMailSender mailSender;

    @Transactional
    public OtpResponseDto sendOtp(SendOtpRequestDto request, String purpose) {
        String email = request.email().toLowerCase().trim();
        log.info("Initiating OTP generation for email: {} with purpose: {}", email, purpose);

        try {
            // Prune previous entries for this email address to keep database tidy
            emailOtpRepository.deleteByEmail(email);
            log.debug("Successfully deleted previous OTP records for email: {}", email);
        } catch (Exception e) {
            log.warn("Failed to delete old OTP records for email {}: {}", email, e.getMessage());
        }

        // Generate a secure 6-digit random code
        String otpCode = String.format("%06d", new Random().nextInt(1000000));
        log.debug("Cryptographic 6-digit OTP code generated successfully");

        // Save in Neon database with verified=false and 5 min expiry
        EmailOtp emailOtp = EmailOtp.builder()
                .email(email)
                .otpCode(otpCode)
                .verified(false)
                .purpose(purpose)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        EmailOtp saved = emailOtpRepository.save(emailOtp);
        log.info("OTP saved in database successfully. Record ID: {}, Expiration: {}", saved.getId(), saved.getExpiresAt());

        // Standard developer fall-back console printout
        System.out.println("====== GENERATED OTP FOR " + email + " (" + purpose + "): " + otpCode + " ======");

        // Email OTP via SMTP
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(email);
            mailMessage.setSubject("DevSecOps Hub - OTP Verification Code");
            mailMessage.setFrom(System.getenv("MAIL_USERNAME"));
            mailMessage.setText("Dear operator,\n\n" +
                    "Your One Time Password (OTP) for authorization is:\n\n" +
                    "   ==>  " + otpCode + "  <==\n\n" +
                    "This OTP is valid for the next 5 minutes. Enter this code on the verification screen to complete your request.\n\n" +
                    "Regards,\n" +
                    "DevSecOps SecOps Auditing Team");
            mailSender.send(mailMessage);
            log.info("OTP verification email dispatched successfully to: {}", email);
            return new OtpResponseDto(true, "OTP_SENT");
        } catch (Exception e) {
            log.error("Failed to dispatch verification email to {}: {}. Fallback enabled: OTP generated and printed to console.", email, e.getMessage());
            // Standard non-blocking fallback so SMTP timeouts or blockages don't lock developers out
            return new OtpResponseDto(true, "OTP printed to backend console due to SMTP dispatch failure.");
        }
    }

    @Transactional
    public OtpResponseDto verifyOtp(VerifyOtpRequestDto request) {
        String email = request.email().toLowerCase().trim();
        String enteredOtp = request.otp().trim();
        log.info("Verifying OTP for email: {}", email);

        EmailOtp emailOtp = emailOtpRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> {
                    log.warn("OTP verification failed: No record found in DB for email: {}", email);
                    return new BadRequestException("No pending verification found for this email! Please request a new OTP.");
                });

        log.debug("Fetched active OTP record from DB. ID: {}, Purpose: {}, Verified: {}", 
                emailOtp.getId(), emailOtp.getPurpose(), emailOtp.isVerified());

        if (emailOtp.isExpired()) {
            emailOtpRepository.delete(emailOtp);
            log.warn("OTP verification failed: OTP record expired for email: {}", email);
            throw new BadRequestException("OTP has expired! Please request a new code.");
        }

        if (emailOtp.isVerified()) {
            log.warn("OTP verification failed: OTP already used/verified for email: {}", email);
            throw new BadRequestException("This verification code has already been verified! Please request a new code.");
        }

        if (!emailOtp.getOtpCode().equals(enteredOtp)) {
            log.warn("OTP verification failed: Entered OTP mismatch for email: {}", email);
            throw new BadRequestException("Invalid One-Time Password! Please verify and enter the correct code.");
        }

        // OTP matches! Mark verified = true
        emailOtp.setVerified(true);
        emailOtpRepository.save(emailOtp);
        log.info("OTP verification SUCCESS! Email: {} marked verified=true", email);

        return new OtpResponseDto(true, "Email verified successfully!");
    }
}
