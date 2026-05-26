package com.devsecops.dashboard.service;

import com.devsecops.dashboard.dto.*;
import com.devsecops.dashboard.entity.EmailOtp;
import com.devsecops.dashboard.entity.Role;
import com.devsecops.dashboard.entity.User;
import com.devsecops.dashboard.entity.UserRole;
import com.devsecops.dashboard.exception.BadRequestException;
import com.devsecops.dashboard.exception.ResourceNotFoundException;
import com.devsecops.dashboard.exception.UnauthorizedException;
import com.devsecops.dashboard.repository.EmailOtpRepository;
import com.devsecops.dashboard.repository.RoleRepository;
import com.devsecops.dashboard.repository.UserRepository;
import com.devsecops.dashboard.security.JwtTokenProvider;
import com.devsecops.dashboard.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogService auditLogService;
    private final JavaMailSender mailSender;
    private final EmailOtpRepository emailOtpRepository;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().toLowerCase().trim();
        String username = request.username().trim();

        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("Username is already taken!");
        }
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already in use!");
        }

        // Check if a pre-verified OTP record exists in PostgreSQL for this email destination
        EmailOtp verifiedOtp = emailOtpRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BadRequestException("Please verify your email via OTP code before registering!"));

        if (verifiedOtp.isExpired()) {
            emailOtpRepository.delete(verifiedOtp);
            throw new BadRequestException("Verification session expired! Please request and verify a new registration OTP.");
        }

        if (!verifiedOtp.isVerified()) {
            throw new BadRequestException("Please complete email verification by submitting the correct OTP code first.");
        }

        if (!"REGISTER".equals(verifiedOtp.getPurpose())) {
            throw new BadRequestException("Invalid validation purpose token. Please generate a registration-specific OTP.");
        }

        // Verification token cleared successfully! Prune record from database
        emailOtpRepository.delete(verifiedOtp);

        Set<Role> roles = new HashSet<>();
        if (request.roles() == null || request.roles().isEmpty()) {
            Role viewerRole = roleRepository.findByName(UserRole.ROLE_VIEWER)
                    .orElseThrow(() -> new ResourceNotFoundException("Error: Role Viewer is not found."));
            roles.add(viewerRole);
        } else {
            request.roles().forEach(role -> {
                switch (role.toLowerCase()) {
                    case "admin":
                        Role adminRole = roleRepository.findByName(UserRole.ROLE_ADMIN)
                                .orElseThrow(() -> new ResourceNotFoundException("Error: Role Admin is not found."));
                        roles.add(adminRole);
                        break;
                    case "devops":
                        Role devopsRole = roleRepository.findByName(UserRole.ROLE_DEVOPS)
                                .orElseThrow(() -> new ResourceNotFoundException("Error: Role DevOps is not found."));
                        roles.add(devopsRole);
                        break;
                    case "developer":
                        Role devRole = roleRepository.findByName(UserRole.ROLE_DEVELOPER)
                                .orElseThrow(() -> new ResourceNotFoundException("Error: Role Developer is not found."));
                        roles.add(devRole);
                        break;
                    default:
                        Role viewerRole = roleRepository.findByName(UserRole.ROLE_VIEWER)
                                .orElseThrow(() -> new ResourceNotFoundException("Error: Role Viewer is not found."));
                        roles.add(viewerRole);
                }
            });
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .roles(roles)
                .build();

        User savedUser = userRepository.save(user);
        auditLogService.logAction(savedUser.getId(), savedUser.getUsername(), "Registered account", "New user signup successfully after verifying Email OTP");

        // Send a welcome email confirming successful registration
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(savedUser.getEmail());
            mailMessage.setSubject("DevSecOps Hub - Operator Account Registered");
            mailMessage.setFrom("vallabhuanilsai2005@gmail.com");
            mailMessage.setText("Dear " + savedUser.getUsername() + ",\n\n" +
                    "Your operator account on the Enterprise DevSecOps CICD Dashboard has been successfully verified and registered!\n\n" +
                    "Details:\n" +
                    "- Username: " + savedUser.getUsername() + "\n" +
                    "- Access Tier Roles: " + roles.stream().map(r -> r.getName().name().replace("ROLE_", "")).collect(Collectors.joining(", ")) + "\n\n" +
                    "Please proceed to authorize your sessions at http://localhost:5173/\n\n" +
                    "Regards,\n" +
                    "DevSecOps SecOps Auditing Team");
            mailSender.send(mailMessage);
        } catch (Exception e) {
            System.err.println("Failed to send welcome email: " + e.getMessage());
        }

        return mapToUserResponse(savedUser);
    }

    public JwtResponse login(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        auditLogService.logAction(userDetails.getId(), userDetails.getUsername(), "Logged in", "Authenticated successfully with JWT");

        return new JwtResponse(jwt, refreshToken, userDetails.getId(), userDetails.getUsername(), userDetails.getEmail(), roles);
    }

    public TokenRefreshResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.refreshToken();
        if (tokenProvider.validateToken(refreshToken)) {
            String username = tokenProvider.getUsernameFromJWT(refreshToken);
            
            // Re-authenticate and generate tokens
            String newAccessToken = tokenProvider.generateTokenFromUsername(username, 86400000);
            return new TokenRefreshResponse(newAccessToken, refreshToken);
        } else {
            throw new UnauthorizedException("Invalid or expired Refresh Token!");
        }
    }

    public UserResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return mapToUserResponse(user);
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new BadRequestException("Current password does not match!");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditLogService.logAction(user.getId(), user.getUsername(), "Changed password", "User successfully modified their password");
    }

    public UserResponse mapToUserResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toList());
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), roles, user.getCreatedAt());
    }
}
