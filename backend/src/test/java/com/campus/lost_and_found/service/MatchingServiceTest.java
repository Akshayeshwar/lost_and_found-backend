package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.ItemMatchResponse;
import com.campus.lost_and_found.dto.ItemReportResponse;
import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.exception.ResourceNotFoundException;
import com.campus.lost_and_found.repository.ItemReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock
    private ItemReportRepository itemReportRepository;

    @Mock
    private ItemReportService itemReportService;

    @InjectMocks
    private MatchingService matchingService;

    private User sampleUser;
    private ItemReport lostWallet;
    private ItemReport foundWallet;
    private ItemReport foundLaptop;

    @BeforeEach
    void setUp() {
        sampleUser = new User("Alice", "alice@campus.edu", "pw", "ROLE_STUDENT");
        sampleUser.setId(1L);

        // Example from prompt:
        // Lost report: "Black wallet lost near the library."
        lostWallet = new ItemReport(
                "Black wallet",
                "Black wallet lost near the library.",
                "PERSONAL_ITEMS",
                ItemReport.ItemType.LOST,
                "Near the library",
                LocalDate.now(),
                null,
                ItemReport.ItemStatus.OPEN,
                sampleUser
        );
        lostWallet.setId(101L);

        // Found report: "Black leather wallet found outside the library."
        foundWallet = new ItemReport(
                "Black leather wallet",
                "Black leather wallet found outside the library.",
                "PERSONAL_ITEMS",
                ItemReport.ItemType.FOUND,
                "Outside the library",
                LocalDate.now(),
                null,
                ItemReport.ItemStatus.OPEN,
                sampleUser
        );
        foundWallet.setId(202L);

        foundLaptop = new ItemReport(
                "MacBook Air M2",
                "Silver Apple laptop left in lecture hall 3",
                "ELECTRONICS",
                ItemReport.ItemType.FOUND,
                "Lecture Hall 3",
                LocalDate.now().minusDays(10),
                null,
                ItemReport.ItemStatus.OPEN,
                sampleUser
        );
        foundLaptop.setId(203L);
    }

    @Test
    @DisplayName("Should evaluate high match score for wallet example (Same category, overlapping keywords)")
    void evaluateMatch_WalletExample_HighMatch() {
        MatchingService.MatchEvaluation evaluation = matchingService.evaluateMatch(lostWallet, foundWallet);

        assertThat(evaluation.score).isGreaterThanOrEqualTo(70);
        assertThat(evaluation.confidence).isEqualTo("HIGH");
        assertThat(evaluation.confidenceLabel).isEqualTo("Strong Potential Match");
        assertThat(evaluation.reasons).anyMatch(r -> r.contains("category"));
        assertThat(evaluation.reasons).anyMatch(r -> r.contains("title"));
        assertThat(evaluation.reasons).anyMatch(r -> r.contains("location"));
        assertThat(evaluation.summary).contains("Strong Potential Match");
    }

    @Test
    @DisplayName("Should evaluate low match score for completely unrelated items")
    void evaluateMatch_UnrelatedItems_LowScore() {
        MatchingService.MatchEvaluation evaluation = matchingService.evaluateMatch(lostWallet, foundLaptop);

        assertThat(evaluation.score).isLessThan(MatchingService.MIN_MATCH_THRESHOLD);
    }

    @Test
    @DisplayName("findPotentialMatches should return opposite type matches and exclude returned/non-matching items")
    void findPotentialMatches_Success() {
        ItemReportResponse foundWalletDto = new ItemReportResponse();
        foundWalletDto.setId(202L);
        foundWalletDto.setTitle("Black leather wallet");

        when(itemReportRepository.findById(101L)).thenReturn(Optional.of(lostWallet));
        when(itemReportRepository.findByTypeAndStatusIn(eq(ItemReport.ItemType.FOUND), any()))
                .thenReturn(List.of(foundWallet, foundLaptop));
        when(itemReportService.mapToResponse(foundWallet)).thenReturn(foundWalletDto);

        List<ItemMatchResponse> matches = matchingService.findPotentialMatches(101L);

        assertThat(matches).isNotEmpty();
        assertThat(matches.size()).isEqualTo(1); // foundLaptop filtered out due to score < threshold
        ItemMatchResponse topMatch = matches.get(0);
        assertThat(topMatch.getItem().getId()).isEqualTo(202L);
        assertThat(topMatch.getMatchScore()).isGreaterThanOrEqualTo(70);
        assertThat(topMatch.getMatchReasons()).isNotEmpty();
    }

    @Test
    @DisplayName("findPotentialMatches should throw ResourceNotFoundException for unknown item")
    void findPotentialMatches_NotFound_ThrowsException() {
        when(itemReportRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            matchingService.findPotentialMatches(999L);
        });
    }
}
