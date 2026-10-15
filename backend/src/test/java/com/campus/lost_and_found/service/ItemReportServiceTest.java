package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.ItemReportRequest;
import com.campus.lost_and_found.dto.ItemReportResponse;
import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.exception.ResourceNotFoundException;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItemReportServiceTest {

    @Mock
    private ItemReportRepository itemReportRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ClaimRequestRepository claimRequestRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ItemReportService itemReportService;

    private User owner;
    private User otherUser;
    private ItemReport sampleItem;

    @BeforeEach
    void setUp() {
        lenient().when(authentication.isAuthenticated()).thenReturn(true);

        owner = new User("Alice Owner", "alice@campus.edu", "hashedPw", "ROLE_STUDENT");
        owner.setId(1L);

        otherUser = new User("Bob Intruder", "bob@campus.edu", "hashedPw", "ROLE_STUDENT");
        otherUser.setId(2L);

        sampleItem = new ItemReport(
                "MacBook Air M2",
                "Silver 13-inch laptop in black sleeve",
                "ELECTRONICS",
                ItemReport.ItemType.LOST,
                "Library 3rd Floor",
                LocalDate.now(),
                null,
                ItemReport.ItemStatus.OPEN,
                owner
        );
        sampleItem.setId(10L);
        sampleItem.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should create report securely bound to authenticated user")
    void createReport_BindsAuthenticatedUser() {
        ItemReportRequest request = new ItemReportRequest();
        request.setTitle("Found Sony Headphones");
        request.setDescription("Black wireless headphones");
        request.setCategory("ELECTRONICS");
        request.setType(ItemReport.ItemType.FOUND);
        request.setLocation("Student Union");
        request.setReportDate(LocalDate.now());

        when(authentication.getName()).thenReturn("alice@campus.edu");
        when(userRepository.findByEmail("alice@campus.edu")).thenReturn(Optional.of(owner));
        when(itemReportRepository.save(any(ItemReport.class))).thenAnswer(invocation -> {
            ItemReport item = invocation.getArgument(0);
            item.setId(50L);
            return item;
        });

        ItemReportResponse response = itemReportService.createReport(request, authentication);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(50L);
        assertThat(response.getTitle()).isEqualTo("Found Sony Headphones");
        assertThat(response.getUser()).isNotNull();
        assertThat(response.getUser().getEmail()).isEqualTo("alice@campus.edu");
    }

    @Test
    @DisplayName("Should block unauthenticated user from creating report (Throws AccessDeniedException)")
    void createReport_Unauthenticated_ThrowsAccessDenied() {
        ItemReportRequest request = new ItemReportRequest();
        request.setTitle("Test Item");

        assertThrows(AccessDeniedException.class, () -> {
            itemReportService.createReport(request, (Authentication) null);
        });
    }

    @Test
    @DisplayName("Should retrieve report by ID")
    void getReportById_Success() {
        when(itemReportRepository.findById(10L)).thenReturn(Optional.of(sampleItem));
        when(claimRequestRepository.countByItemReportId(10L)).thenReturn(2L);

        ItemReportResponse response = itemReportService.getReportById(10L);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getTitle()).isEqualTo("MacBook Air M2");
        assertThat(response.getClaimCount()).isEqualTo(2L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when report ID does not exist")
    void getReportById_NotFound_ThrowsException() {
        when(itemReportRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            itemReportService.getReportById(999L);
        });
    }

    @Test
    @DisplayName("Owner should successfully update own report")
    void updateReport_Owner_Success() {
        ItemReportRequest request = new ItemReportRequest();
        request.setTitle("MacBook Air M2 (Found sticker)");
        request.setLocation("Library Front Desk");

        when(itemReportRepository.findById(10L)).thenReturn(Optional.of(sampleItem));
        when(authentication.getName()).thenReturn("alice@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());
        when(itemReportRepository.save(any(ItemReport.class))).thenAnswer(i -> i.getArgument(0));

        ItemReportResponse response = itemReportService.updateReport(10L, request, authentication);

        assertThat(response.getTitle()).isEqualTo("MacBook Air M2 (Found sticker)");
        assertThat(response.getLocation()).isEqualTo("Library Front Desk");
    }

    @Test
    @DisplayName("Non-owner should be blocked from updating another user's report (403 AccessDenied)")
    void updateReport_NonOwner_ThrowsAccessDenied() {
        ItemReportRequest request = new ItemReportRequest();
        request.setTitle("Hacked Title");

        when(itemReportRepository.findById(10L)).thenReturn(Optional.of(sampleItem));
        when(authentication.getName()).thenReturn("bob@campus.edu"); // Not the owner
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());

        assertThrows(AccessDeniedException.class, () -> {
            itemReportService.updateReport(10L, request, authentication);
        });

        verify(itemReportRepository, never()).save(any(ItemReport.class));
    }

    @Test
    @DisplayName("Owner should successfully delete own report")
    void deleteReport_Owner_Success() {
        when(itemReportRepository.findById(10L)).thenReturn(Optional.of(sampleItem));
        when(authentication.getName()).thenReturn("alice@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> itemReportService.deleteReport(10L, authentication));
        verify(itemReportRepository, times(1)).delete(sampleItem);
    }

    @Test
    @DisplayName("Non-owner should be blocked from deleting another user's report")
    void deleteReport_NonOwner_ThrowsAccessDenied() {
        when(itemReportRepository.findById(10L)).thenReturn(Optional.of(sampleItem));
        when(authentication.getName()).thenReturn("bob@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());

        assertThrows(AccessDeniedException.class, () -> {
            itemReportService.deleteReport(10L, authentication);
        });

        verify(itemReportRepository, never()).delete(any(ItemReport.class));
    }

    @Test
    @DisplayName("Owner should successfully mark item as RETURNED")
    void updateItemStatus_MarkReturned_Success() {
        when(itemReportRepository.findById(10L)).thenReturn(Optional.of(sampleItem));
        when(authentication.getName()).thenReturn("alice@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());
        when(itemReportRepository.save(any(ItemReport.class))).thenAnswer(i -> i.getArgument(0));

        ItemReportResponse response = itemReportService.updateItemStatus(10L, ItemReport.ItemStatus.RETURNED, authentication);

        assertThat(response.getStatus()).isEqualTo(ItemReport.ItemStatus.RETURNED);
    }

    @Test
    @DisplayName("Terminal state RETURNED cannot be reopened (Throws IllegalArgumentException)")
    void updateItemStatus_TerminalState_ThrowsIllegalArgument() {
        sampleItem.setStatus(ItemReport.ItemStatus.RETURNED);

        when(itemReportRepository.findById(10L)).thenReturn(Optional.of(sampleItem));
        when(authentication.getName()).thenReturn("alice@campus.edu");
        when(authentication.getAuthorities()).thenReturn(Collections.emptyList());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            itemReportService.updateItemStatus(10L, ItemReport.ItemStatus.OPEN, authentication);
        });

        assertThat(ex.getMessage()).contains("final state");
        verify(itemReportRepository, never()).save(any(ItemReport.class));
    }

    @Test
    @DisplayName("validateStatusTransition should enforce valid and invalid state transitions")
    void validateStatusTransition_Rules() {
        // Valid transitions from OPEN
        assertDoesNotThrow(() -> itemReportService.validateStatusTransition(ItemReport.ItemStatus.OPEN, ItemReport.ItemStatus.CLAIMED));
        assertDoesNotThrow(() -> itemReportService.validateStatusTransition(ItemReport.ItemStatus.OPEN, ItemReport.ItemStatus.RETURNED));

        // Valid transitions from CLAIMED
        assertDoesNotThrow(() -> itemReportService.validateStatusTransition(ItemReport.ItemStatus.CLAIMED, ItemReport.ItemStatus.RETURNED));
        assertDoesNotThrow(() -> itemReportService.validateStatusTransition(ItemReport.ItemStatus.CLAIMED, ItemReport.ItemStatus.OPEN));

        // Terminal states cannot transition
        assertThrows(IllegalArgumentException.class, () ->
                itemReportService.validateStatusTransition(ItemReport.ItemStatus.RETURNED, ItemReport.ItemStatus.OPEN)
        );
        assertThrows(IllegalArgumentException.class, () ->
                itemReportService.validateStatusTransition(ItemReport.ItemStatus.CLOSED, ItemReport.ItemStatus.OPEN)
        );
    }
}
