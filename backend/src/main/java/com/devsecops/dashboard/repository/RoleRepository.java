package com.devsecops.dashboard.repository;

import com.devsecops.dashboard.entity.Role;
import com.devsecops.dashboard.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(UserRole name);
}
