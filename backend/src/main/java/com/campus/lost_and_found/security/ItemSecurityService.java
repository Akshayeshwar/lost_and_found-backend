package com.campus.lost_and_found.security;

import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.repository.ItemReportRepository;
import com.campus.lost_and_found.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Spring Security method-level evaluator bean (@itemSecurity)
 * Enforces ownership and role-based authorization rules.
 */
@Component("itemSecurity")
public class ItemSecurityService {

    private final ItemReportRepository itemReportRepository;
    private final UserRepository userRepository;

    public ItemSecurityService(ItemReportRepository itemReportRepository, UserRepository userRepository) {
        this.itemReportRepository = itemReportRepository;
        this.userRepository = userRepository;
    }

    /**
     * Checks if the authenticated user is authorized to modify or delete the item report.
     * Allowed if:
     * 1. The user has ROLE_ADMIN.
     * 2. The item does not exist (returns true so service can throw ResourceNotFoundException -> 404).
     * 3. The item belongs to the authenticated user.
     */
    public boolean canModify(Long itemId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            return false;
        }

        // Administrators have full moderation permissions
        if (isAdmin(authentication)) {
            return true;
        }

        Optional<ItemReport> reportOpt = itemReportRepository.findById(itemId);
        if (reportOpt.isEmpty()) {
            // Non-existent item: allow service layer to throw ResourceNotFoundException (HTTP 404)
            return true;
        }

        ItemReport report = reportOpt.get();
        if (report.getUser() == null) {
            // Unowned items can only be managed by administrators
            return false;
        }

        String currentUserEmail = authentication.getName();
        return currentUserEmail.equalsIgnoreCase(report.getUser().getEmail());
    }

    /**
     * Checks if the authenticated user can access the target user's reports list.
     * Allowed if user is ROLE_ADMIN or is querying their own user ID.
     */
    public boolean isUserOwner(Long targetUserId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            return false;
        }

        if (isAdmin(authentication)) {
            return true;
        }

        Optional<User> targetUser = userRepository.findById(targetUserId);
        return targetUser.isPresent() && authentication.getName().equalsIgnoreCase(targetUser.get().getEmail());
    }

    /**
     * Helper to check for ADMIN authority
     */
    public boolean isAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String auth = authority.getAuthority();
            if ("ROLE_ADMIN".equalsIgnoreCase(auth) || "ADMIN".equalsIgnoreCase(auth)) {
                return true;
            }
        }
        return false;
    }
}
