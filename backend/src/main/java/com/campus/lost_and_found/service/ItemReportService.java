package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.ItemReportRequest;
import com.campus.lost_and_found.dto.ItemReportResponse;
import com.campus.lost_and_found.dto.PagedResponse;
import com.campus.lost_and_found.dto.UserSummaryResponse;
import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.exception.ResourceNotFoundException;
import com.campus.lost_and_found.repository.ItemReportRepository;
import com.campus.lost_and_found.repository.ItemReportSpecifications;
import com.campus.lost_and_found.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ItemReportService {

    private final ItemReportRepository itemReportRepository;
    private final UserRepository userRepository;
    private final com.campus.lost_and_found.repository.ClaimRequestRepository claimRequestRepository;

    public ItemReportService(ItemReportRepository itemReportRepository,
                             UserRepository userRepository,
                             com.campus.lost_and_found.repository.ClaimRequestRepository claimRequestRepository) {
        this.itemReportRepository = itemReportRepository;
        this.userRepository = userRepository;
        this.claimRequestRepository = claimRequestRepository;
    }

    /**
     * Create report linked securely to the authenticated user from the JWT security context.
     * Any userId provided in the request body is intentionally ignored.
     */
    @Transactional
    public ItemReportResponse createReport(ItemReportRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AccessDeniedException("Authentication required to create a report.");
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        ItemReport report = new ItemReport(
                request.getTitle(),
                request.getDescription(),
                request.getCategory(),
                request.getType(),
                request.getLocation(),
                request.getReportDate(),
                request.getImageUrl(),
                (request.getStatus() != null) ? request.getStatus() : ItemReport.ItemStatus.OPEN,
                user
        );

        ItemReport saved = itemReportRepository.save(report);
        return mapToResponse(saved);
    }

    @Transactional
    public ItemReportResponse createReport(ItemReportRequest request, Long userIdOverride) {
        Long targetUserId = (userIdOverride != null) ? userIdOverride : request.getUserId();

        User user = null;
        if (targetUserId != null) {
            user = userRepository.findById(targetUserId).orElse(null);
        }

        ItemReport report = new ItemReport(
                request.getTitle(),
                request.getDescription(),
                request.getCategory(),
                request.getType(),
                request.getLocation(),
                request.getReportDate(),
                request.getImageUrl(),
                (request.getStatus() != null) ? request.getStatus() : ItemReport.ItemStatus.OPEN,
                user
        );

        ItemReport saved = itemReportRepository.save(report);
        return mapToResponse(saved);
    }

    public PagedResponse<ItemReportResponse> getReports(
            ItemReport.ItemType type,
            ItemReport.ItemStatus status,
            String category,
            String keyword,
            Long userId,
            int page,
            int size,
            String sortBy,
            String sortDir) {

        // Default sort validation
        String safeSortBy = (sortBy == null || sortBy.isBlank()) ? "createdAt" : sortBy;
        // Map common frontend aliases for sort
        if ("date".equalsIgnoreCase(safeSortBy)) {
            safeSortBy = "reportDate";
        } else if ("name".equalsIgnoreCase(safeSortBy)) {
            safeSortBy = "title";
        }

        Sort sort = (sortDir != null && sortDir.equalsIgnoreCase("asc"))
                ? Sort.by(safeSortBy).ascending()
                : Sort.by(safeSortBy).descending();

        // Enforce safe page boundaries
        int safePage = Math.max(0, page);
        int safeSize = (size <= 0) ? 10 : Math.min(size, 100);

        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        Specification<ItemReport> spec = ItemReportSpecifications.withFilters(type, status, category, keyword, userId);
        Page<ItemReport> pageResult = itemReportRepository.findAll(spec, pageable);

        List<ItemReportResponse> content = pageResult.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PagedResponse<>(
                content,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.isLast()
        );
    }

    public List<ItemReportResponse> getAllReportsList() {
        return itemReportRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ItemReportResponse getReportById(Long id) {
        ItemReport report = itemReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + id));
        return mapToResponse(report);
    }

    public List<ItemReportResponse> getUserReportsList(Long userId) {
        return itemReportRepository.findAll(ItemReportSpecifications.withFilters(null, null, null, null, userId), Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ItemReportResponse updateReport(Long id, ItemReportRequest request, Authentication authentication) {
        ItemReport existing = itemReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + id));

        validateOwnershipOrAdmin(existing, authentication);

        if (request.getTitle() != null) {
            String trimmed = request.getTitle().trim();
            if (trimmed.length() < 2 || trimmed.length() > 150) {
                throw new IllegalArgumentException("Title must be between 2 and 150 characters");
            }
            existing.setTitle(trimmed);
        }
        if (request.getDescription() != null) {
            String trimmed = request.getDescription().trim();
            if (trimmed.length() < 5 || trimmed.length() > 2000) {
                throw new IllegalArgumentException("Description must be between 5 and 2000 characters");
            }
            existing.setDescription(trimmed);
        }
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            existing.setCategory(request.getCategory().trim());
        }
        if (request.getType() != null) {
            existing.setType(request.getType());
        }
        if (request.getLocation() != null) {
            String trimmed = request.getLocation().trim();
            if (trimmed.length() < 2 || trimmed.length() > 150) {
                throw new IllegalArgumentException("Location must be between 2 and 150 characters");
            }
            existing.setLocation(trimmed);
        }
        if (request.getReportDate() != null) {
            if (request.getReportDate().isAfter(java.time.LocalDate.now())) {
                throw new IllegalArgumentException("Report date cannot be in the future");
            }
            existing.setReportDate(request.getReportDate());
        }
        if (request.getImageUrl() != null) {
            existing.setImageUrl(request.getImageUrl().trim());
        }
        if (request.getStatus() != null) {
            validateStatusTransition(existing.getStatus(), request.getStatus());
            existing.setStatus(request.getStatus());
        }
        // CRITICAL SECURITY RULE: NEVER allow client to reassign ownership
        // existing.getUser() remains unchanged!

        ItemReport updated = itemReportRepository.save(existing);
        return mapToResponse(updated);
    }

    @Transactional
    public ItemReportResponse updateItemStatus(Long id, ItemReport.ItemStatus newStatus, Authentication authentication) {
        ItemReport existing = itemReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + id));

        validateOwnershipOrAdmin(existing, authentication);
        validateStatusTransition(existing.getStatus(), newStatus);

        existing.setStatus(newStatus);
        ItemReport updated = itemReportRepository.save(existing);
        return mapToResponse(updated);
    }

    public void validateStatusTransition(ItemReport.ItemStatus currentStatus, ItemReport.ItemStatus newStatus) {
        if (currentStatus == newStatus) {
            return;
        }

        // Terminal states cannot be altered
        if (currentStatus == ItemReport.ItemStatus.RETURNED || currentStatus == ItemReport.ItemStatus.RESOLVED || currentStatus == ItemReport.ItemStatus.CLOSED) {
            throw new IllegalArgumentException("Cannot transition status of an item that is already " + currentStatus + ". It is in a final state.");
        }

        // Transitions from OPEN
        if (currentStatus == ItemReport.ItemStatus.OPEN) {
            if (newStatus == ItemReport.ItemStatus.CLAIMED ||
                newStatus == ItemReport.ItemStatus.RETURNED ||
                newStatus == ItemReport.ItemStatus.RESOLVED ||
                newStatus == ItemReport.ItemStatus.CLOSED) {
                return;
            }
        }

        // Transitions from CLAIMED
        if (currentStatus == ItemReport.ItemStatus.CLAIMED) {
            if (newStatus == ItemReport.ItemStatus.RETURNED ||
                newStatus == ItemReport.ItemStatus.RESOLVED ||
                newStatus == ItemReport.ItemStatus.CLOSED ||
                newStatus == ItemReport.ItemStatus.OPEN) {
                return;
            }
        }

        throw new IllegalArgumentException("Invalid status transition from " + currentStatus + " to " + newStatus);
    }

    @Transactional
    public ItemReportResponse updateReport(Long id, ItemReportRequest request) {
        return updateReport(id, request, null);
    }

    @Transactional
    public void deleteReport(Long id, Authentication authentication) {
        ItemReport existing = itemReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + id));

        validateOwnershipOrAdmin(existing, authentication);

        itemReportRepository.delete(existing);
    }

    @Transactional
    public void deleteReport(Long id) {
        ItemReport existing = itemReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + id));
        itemReportRepository.delete(existing);
    }

    public void validateOwnershipOrAdmin(ItemReport report, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AccessDeniedException("Authentication required to modify or delete reports.");
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()) || "ADMIN".equalsIgnoreCase(a.getAuthority()));
        if (isAdmin) {
            return;
        }

        String currentUserEmail = authentication.getName();
        if (report.getUser() == null || !currentUserEmail.equalsIgnoreCase(report.getUser().getEmail())) {
            throw new AccessDeniedException("Access Denied: You do not have permission to modify or delete this report.");
        }
    }

    public ItemReportResponse mapToResponse(ItemReport report) {
        UserSummaryResponse userSummary = null;
        if (report.getUser() != null) {
            userSummary = new UserSummaryResponse(
                    report.getUser().getId(),
                    report.getUser().getName(),
                    report.getUser().getEmail()
            );
        }

        ItemReportResponse response = new ItemReportResponse(
                report.getId(),
                report.getTitle(),
                report.getDescription(),
                report.getCategory(),
                report.getType(),
                report.getLocation(),
                report.getReportDate(),
                report.getImageUrl(),
                report.getStatus(),
                report.getCreatedAt(),
                userSummary
        );

        try {
            long count = claimRequestRepository.countByItemReportId(report.getId());
            response.setClaimCount(count);
        } catch (Exception ignored) {
            response.setClaimCount(0L);
        }

        return response;
    }
}
