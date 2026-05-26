package com.devsecops.dashboard.service;

import com.devsecops.dashboard.dto.*;
import com.devsecops.dashboard.entity.Role;
import com.devsecops.dashboard.entity.User;
import com.devsecops.dashboard.entity.UserRole;
import com.devsecops.dashboard.exception.BadRequestException;
import com.devsecops.dashboard.exception.ResourceNotFoundException;
import com.devsecops.dashboard.repository.RoleRepository;
import com.devsecops.dashboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditLogService auditLogService;

    public Page<UserResponse> getUsers(String search, Pageable pageable) {
        Page<User> usersPage;
        if (search != null && !search.trim().isEmpty()) {
            usersPage = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(search, search, pageable);
        } else {
            usersPage = userRepository.findAll(pageable);
        }
        return usersPage.map(this::mapToUserResponse);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateUser(Long id, RegisterRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setEmail(request.email());
        if (request.username() != null && !request.username().trim().isEmpty()) {
            user.setUsername(request.username());
        }

        User updatedUser = userRepository.save(user);
        auditLogService.logAction(null, "ADMIN", "Updated user profile", "Updated user ID: " + id);
        return mapToUserResponse(updatedUser);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        userRepository.delete(user);
        auditLogService.logAction(null, "ADMIN", "Deleted user", "Deleted user with email: " + user.getEmail());
    }

    @Transactional
    public UserResponse assignRole(Long userId, AssignRoleRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        UserRole targetRole;
        try {
            targetRole = UserRole.valueOf("ROLE_" + request.roleName().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid Role: " + request.roleName());
        }

        Role role = roleRepository.findByName(targetRole)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + targetRole));

        user.setRoles(new HashSet<>(Collections.singletonList(role)));
        User updatedUser = userRepository.save(user);

        auditLogService.logAction(null, "ADMIN", "Assigned role", "Assigned role " + targetRole + " to user " + user.getUsername());
        return mapToUserResponse(updatedUser);
    }

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    private UserResponse mapToUserResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toList());
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), roles, user.getCreatedAt());
    }
}
