package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.ClaimResponse;
import com.campus.lost_and_found.dto.ClaimSubmissionRequest;
import com.campus.lost_and_found.entity.ClaimRequest;
import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.exception.ResourceNotFoundException;
import com.campus.lost_and_found.repository.ClaimRequestRepository;
import com.campus.lost_and_found.repository.ItemReportRepository;
import com.campus.lost_and_found.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClaimService {

    private final ClaimRequestRepository claimRequestRepository;
    private final ItemReportRepository itemReportRepository;
    private final UserRepository userRepository;

    public ClaimService(ClaimRequestRepository claimRequestRepository,
                        ItemReportRepository itemReportRepository,
                        UserRepository userRepository) {
        this.claimRequestRepository = claimRequestRepository;
        this.itemReportRepository = itemReportRepository;
        this.userRepository = userRepository;
    }

    /**
     * Submit an interest / claim request for an item.
     * Open to any authenticated user or student providing contact information.
     */
    @Transactional
    public ClaimResponse submitClaim(Long itemId, ClaimSubmissionRequest request, Authentication authentication) {
        ItemReport item = itemReportRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + itemId));

        if (item.getStatus() == ItemReport.ItemStatus.RETURNED || item.getStatus() == ItemReport.ItemStatus.CLOSED) {
            throw new IllegalArgumentException("Cannot submit a claim for an item that is already " + item.getStatus() + ".");
        }

        User claimant = null;
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
            claimant = userRepository.findByEmail(authentication.getName()).orElse(null);
        }

        ClaimRequest claim = new ClaimRequest(
                item,
                claimant,
                request.getClaimantName().trim(),
                request.getClaimantContact().trim(),
                request.getMessage().trim()
        );

        ClaimRequest saved = claimRequestRepository.save(claim);
        return mapToResponse(saved);
    }

    /**
     * View all claims for a given item report.
     * Allowed only for the item report owner or an administrator.
     */
    @Transactional(readOnly = true)
    public List<ClaimResponse> getClaimsForItem(Long itemId, Authentication authentication) {
        ItemReport item = itemReportRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + itemId));

        validateOwnershipOrAdmin(item, authentication);

        return claimRequestRepository.findByItemReportIdOrderByCreatedAtDesc(itemId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Approve a claim request.
     * Automatically transitions the item report from OPEN to CLAIMED.
     */
    @Transactional
    public ClaimResponse approveClaim(Long itemId, Long claimId, Authentication authentication) {
        ItemReport item = itemReportRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + itemId));

        validateOwnershipOrAdmin(item, authentication);

        ClaimRequest claim = claimRequestRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim request not found with ID: " + claimId));

        if (!claim.getItemReport().getId().equals(itemId)) {
            throw new IllegalArgumentException("Claim request does not belong to item report ID: " + itemId);
        }

        claim.setStatus(ClaimRequest.ClaimStatus.APPROVED);
        ClaimRequest updatedClaim = claimRequestRepository.save(claim);

        // Update item status to CLAIMED if currently OPEN
        if (item.getStatus() == ItemReport.ItemStatus.OPEN) {
            item.setStatus(ItemReport.ItemStatus.CLAIMED);
            itemReportRepository.save(item);
        }

        return mapToResponse(updatedClaim);
    }

    /**
     * Reject a claim request.
     */
    @Transactional
    public ClaimResponse rejectClaim(Long itemId, Long claimId, Authentication authentication) {
        ItemReport item = itemReportRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + itemId));

        validateOwnershipOrAdmin(item, authentication);

        ClaimRequest claim = claimRequestRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim request not found with ID: " + claimId));

        if (!claim.getItemReport().getId().equals(itemId)) {
            throw new IllegalArgumentException("Claim request does not belong to item report ID: " + itemId);
        }

        claim.setStatus(ClaimRequest.ClaimStatus.REJECTED);
        ClaimRequest updatedClaim = claimRequestRepository.save(claim);

        return mapToResponse(updatedClaim);
    }

    public void validateOwnershipOrAdmin(ItemReport item, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AccessDeniedException("Authentication required to access claims.");
        }

        boolean isAdmin = false;
        if (authentication.getAuthorities() != null) {
            for (GrantedAuthority auth : authentication.getAuthorities()) {
                if ("ROLE_ADMIN".equalsIgnoreCase(auth.getAuthority()) || "ADMIN".equalsIgnoreCase(auth.getAuthority())) {
                    isAdmin = true;
                    break;
                }
            }
        }

        if (isAdmin) {
            return;
        }

        String currentUserEmail = authentication.getName();
        if (item.getUser() == null || !currentUserEmail.equalsIgnoreCase(item.getUser().getEmail())) {
            throw new AccessDeniedException("Access Denied: You do not have permission to access claims for this item.");
        }
    }

    public ClaimResponse mapToResponse(ClaimRequest claim) {
        return new ClaimResponse(
                claim.getId(),
                claim.getItemReport().getId(),
                claim.getItemReport().getTitle(),
                (claim.getClaimant() != null) ? claim.getClaimant().getId() : null,
                claim.getClaimantName(),
                claim.getClaimantContact(),
                claim.getMessage(),
                claim.getStatus(),
                claim.getCreatedAt()
        );
    }
}
