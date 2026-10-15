package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.ClaimResponse;
import com.campus.lost_and_found.dto.ClaimSubmissionRequest;
import com.campus.lost_and_found.entity.ClaimRequest;
import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.repository.ClaimRequestRepository;
import com.campus.lost_and_found.repository.ItemReportRepository;
import com.campus.lost_and_found.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClaimServiceTest {

    @Mock
    private ClaimRequestRepository claimRequestRepository;

    @Mock
    private ItemReportRepository itemReportRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ClaimService claimService;

    private User owner;
    private User claimant;
    private ItemReport openItem;
    private ClaimRequest pendingClaim;

    @BeforeEach
    void setUp() {
        owner = new User("Report Owner", "owner@campus.edu", "pw", "ROLE_STUDENT");
        owner.setId(10L);

        claimant = new User("Claimant Bob", "bob@campus.edu", "pw", "ROLE_STUDENT");
        claimant.setId(20L);

        openItem = new ItemReport(
                "Calculus Textbook",
                "Stewart 9th Edition left in Hall A",
                "DOCUMENTS",
                ItemReport.ItemType.FOUND,
                "Lecture Hall A",
                LocalDate.now(),
                null,
                ItemReport.ItemStatus.OPEN,
                owner
        );
        openItem.setId(100L);

        pendingClaim = new ClaimRequest(
                openItem,
                claimant,
                "Claimant Bob",
                "bob@campus.edu / 555-0199",
                "My name is written in pencil on page 3"
        );
        pendingClaim.setId(500L);
        pendingClaim.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should submit claim for an open item")
    void submitClaim_Success() {
        ClaimSubmissionRequest request = new ClaimSubmissionRequest(
                "Claimant Bob",
                "bob@campus.edu",
                "Left it on the 3rd row desk"
        );

        when(itemReportRepository.findById(100L)).thenReturn(Optional.of(openItem));
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("bob@campus.edu");
        when(userRepository.findByEmail("bob@campus.edu")).thenReturn(Optional.of(claimant));
        when(claimRequestRepository.save(any(ClaimRequest.class))).thenAnswer(i -> {
            ClaimRequest c = i.getArgument(0);
            c.setId(501L);
            c.setCreatedAt(LocalDateTime.now());
            return c;
        });

        ClaimResponse response = claimService.submitClaim(100L, request, authentication);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(501L);
        assertThat(response.getStatus()).isEqualTo(ClaimRequest.ClaimStatus.PENDING);
        assertThat(response.getClaimantName()).isEqualTo("Claimant Bob");
    }

    @Test
    @DisplayName("Cannot submit claim for an already RETURNED item (Throws IllegalArgumentException)")
    void submitClaim_OnReturnedItem_ThrowsIllegalArgument() {
        openItem.setStatus(ItemReport.ItemStatus.RETURNED);

        ClaimSubmissionRequest request = new ClaimSubmissionRequest("Bob", "bob@campus.edu", "details");
        when(itemReportRepository.findById(100L)).thenReturn(Optional.of(openItem));

        assertThrows(IllegalArgumentException.class, () -> {
            claimService.submitClaim(100L, request, authentication);
        });

        verify(claimRequestRepository, never()).save(any(ClaimRequest.class));
    }

    @Test
    @DisplayName("Owner should successfully view claims for their item")
    void getClaimsForItem_Owner_Success() {
        when(itemReportRepository.findById(100L)).thenReturn(Optional.of(openItem));
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("owner@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());
        when(claimRequestRepository.findByItemReportIdOrderByCreatedAtDesc(100L))
                .thenReturn(List.of(pendingClaim));

        List<ClaimResponse> claims = claimService.getClaimsForItem(100L, authentication);

        assertThat(claims).hasSize(1);
        assertThat(claims.get(0).getClaimantName()).isEqualTo("Claimant Bob");
        assertThat(claims.get(0).getClaimantContact()).contains("555-0199");
    }

    @Test
    @DisplayName("Non-owner must be blocked with AccessDeniedException from viewing claims")
    void getClaimsForItem_NonOwner_ThrowsAccessDenied() {
        when(itemReportRepository.findById(100L)).thenReturn(Optional.of(openItem));
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("other_student@campus.edu"); // Not owner
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());

        assertThrows(AccessDeniedException.class, () -> {
            claimService.getClaimsForItem(100L, authentication);
        });

        verify(claimRequestRepository, never()).findByItemReportIdOrderByCreatedAtDesc(anyLong());
    }

    @Test
    @DisplayName("Approving claim marks claim as APPROVED and item as CLAIMED")
    void approveClaim_Success() {
        when(itemReportRepository.findById(100L)).thenReturn(Optional.of(openItem));
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("owner@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());
        when(claimRequestRepository.findById(500L)).thenReturn(Optional.of(pendingClaim));
        when(claimRequestRepository.save(any(ClaimRequest.class))).thenAnswer(i -> i.getArgument(0));

        ClaimResponse response = claimService.approveClaim(100L, 500L, authentication);

        assertThat(response.getStatus()).isEqualTo(ClaimRequest.ClaimStatus.APPROVED);
        assertThat(openItem.getStatus()).isEqualTo(ItemReport.ItemStatus.CLAIMED);

        verify(itemReportRepository, times(1)).save(openItem);
    }

    @Test
    @DisplayName("Rejecting claim marks claim as REJECTED")
    void rejectClaim_Success() {
        when(itemReportRepository.findById(100L)).thenReturn(Optional.of(openItem));
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("owner@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());
        when(claimRequestRepository.findById(500L)).thenReturn(Optional.of(pendingClaim));
        when(claimRequestRepository.save(any(ClaimRequest.class))).thenAnswer(i -> i.getArgument(0));

        ClaimResponse response = claimService.rejectClaim(100L, 500L, authentication);

        assertThat(response.getStatus()).isEqualTo(ClaimRequest.ClaimStatus.REJECTED);
        // Item remains in its current status
        assertThat(openItem.getStatus()).isEqualTo(ItemReport.ItemStatus.OPEN);
    }
}
