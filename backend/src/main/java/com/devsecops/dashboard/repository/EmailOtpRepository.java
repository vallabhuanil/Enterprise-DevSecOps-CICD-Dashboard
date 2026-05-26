package com.devsecops.dashboard.repository;

import com.devsecops.dashboard.entity.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {
    Optional<EmailOtp> findTopByEmailOrderByCreatedAtDesc(String email);
    Optional<EmailOtp> findByEmailAndOtpCode(String email, String otpCode);
    void deleteByEmail(String email);
}
