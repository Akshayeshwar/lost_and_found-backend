package com.campus.lost_and_found.service;

import com.campus.lost_and_found.dto.ItemMatchResponse;
import com.campus.lost_and_found.dto.ItemReportResponse;
import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.exception.ResourceNotFoundException;
import com.campus.lost_and_found.repository.ItemReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MatchingService {

    public static final int MIN_MATCH_THRESHOLD = 20;
    public static final int MAX_SUGGESTED_MATCHES = 5;

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
            "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between",
            "both", "but", "by", "can", "cannot", "could", "did", "do", "does", "doing", "down",
            "during", "each", "few", "for", "from", "further", "had", "has", "have", "having",
            "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if",
            "in", "into", "is", "isn't", "it", "its", "itself", "just", "me", "more", "most",
            "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
            "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
            "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
            "then", "there", "these", "they", "this", "those", "through", "to", "too", "under",
            "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what", "when",
            "where", "which", "while", "who", "whom", "why", "with", "won't", "would", "you",
            "your", "yours", "yourself", "yourselves", "near", "outside", "inside", "left",
            "found", "lost", "item", "report", "someone", "please"
    );

    private final ItemReportRepository itemReportRepository;
    private final ItemReportService itemReportService;

    public MatchingService(ItemReportRepository itemReportRepository, ItemReportService itemReportService) {
        this.itemReportRepository = itemReportRepository;
        this.itemReportService = itemReportService;
    }

    /**
     * Find potential matching reports of the opposite type (LOST vs FOUND).
     * Excludes the same report and any reports that have already been returned or closed.
     */
    @Transactional(readOnly = true)
    public List<ItemMatchResponse> findPotentialMatches(Long itemId) {
        ItemReport target = itemReportRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item report not found with ID: " + itemId));

        // 1. Determine opposite type: LOST <-> FOUND
        ItemReport.ItemType oppositeType = (target.getType() == ItemReport.ItemType.LOST)
                ? ItemReport.ItemType.FOUND
                : ItemReport.ItemType.LOST;

        // 2. Fetch active candidates of opposite type (exclude RETURNED, CLOSED, RESOLVED)
        List<ItemReport.ItemStatus> activeStatuses = List.of(ItemReport.ItemStatus.OPEN, ItemReport.ItemStatus.CLAIMED);
        List<ItemReport> candidates = itemReportRepository.findByTypeAndStatusIn(oppositeType, activeStatuses);

        // 3. Compute match scores and explanations
        List<ItemMatchResponse> matches = new ArrayList<>();
        for (ItemReport candidate : candidates) {
            // Exclude the same report if types ever collided
            if (candidate.getId().equals(target.getId())) {
                continue;
            }

            MatchEvaluation evaluation = evaluateMatch(target, candidate);
            if (evaluation.score >= MIN_MATCH_THRESHOLD) {
                ItemReportResponse candidateDto = itemReportService.mapToResponse(candidate);
                matches.add(new ItemMatchResponse(
                        candidateDto,
                        evaluation.score,
                        evaluation.confidence,
                        evaluation.confidenceLabel,
                        evaluation.reasons,
                        evaluation.scoreBreakdown,
                        evaluation.summary
                ));
            }
        }

        // 4. Sort descending by score, limit to top suggestions
        matches.sort((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()));
        return matches.stream().limit(MAX_SUGGESTED_MATCHES).collect(Collectors.toList());
    }

    /**
     * Transparent scoring engine comparing Category (30%), Title (35%), Location (20%), Description (15%).
     */
    public MatchEvaluation evaluateMatch(ItemReport source, ItemReport candidate) {
        int categoryScore = 0;
        int titleScore = 0;
        int locationScore = 0;
        int descriptionScore = 0;
        int dateBonus = 0;

        List<String> reasons = new ArrayList<>();
        Map<String, Integer> breakdown = new LinkedHashMap<>();

        // 1. Category Matching (Max 30 pts)
        if (source.getCategory() != null && candidate.getCategory() != null) {
            if (source.getCategory().equalsIgnoreCase(candidate.getCategory())) {
                if ("OTHER".equalsIgnoreCase(source.getCategory())) {
                    categoryScore = 10;
                    reasons.add("Both classified under general 'OTHER' category (+10 pts)");
                } else {
                    categoryScore = 30;
                    reasons.add("Identical category match: " + source.getCategory() + " (+30 pts)");
                }
            }
        }
        breakdown.put("category", categoryScore);

        // 2. Title Keyword Overlap (Max 35 pts)
        Set<String> sourceTitleKeywords = extractKeywords(source.getTitle());
        Set<String> candidateTitleKeywords = extractKeywords(candidate.getTitle());
        Set<String> commonTitleKeywords = new LinkedHashSet<>(sourceTitleKeywords);
        commonTitleKeywords.retainAll(candidateTitleKeywords);

        if (!commonTitleKeywords.isEmpty()) {
            double diceRatio = (2.0 * commonTitleKeywords.size()) / (sourceTitleKeywords.size() + candidateTitleKeywords.size());
            titleScore = (int) Math.round(diceRatio * 35);
            if (titleScore < 10) titleScore = 10; // Minimum points for shared title keyword
            reasons.add("Shared title keyword(s): " + String.join(", ", commonTitleKeywords) + " (+" + titleScore + " pts)");
        }
        breakdown.put("title", titleScore);

        // 3. Location Keyword Overlap (Max 20 pts)
        if (source.getLocation() != null && candidate.getLocation() != null) {
            if (source.getLocation().trim().equalsIgnoreCase(candidate.getLocation().trim())) {
                locationScore = 20;
                reasons.add("Exact matching location: '" + source.getLocation() + "' (+20 pts)");
            } else {
                Set<String> sourceLocKeywords = extractKeywords(source.getLocation());
                Set<String> candidateLocKeywords = extractKeywords(candidate.getLocation());
                Set<String> commonLoc = new LinkedHashSet<>(sourceLocKeywords);
                commonLoc.retainAll(candidateLocKeywords);

                if (!commonLoc.isEmpty()) {
                    double locRatio = (2.0 * commonLoc.size()) / (sourceLocKeywords.size() + candidateLocKeywords.size());
                    locationScore = Math.max(10, (int) Math.round(locRatio * 20));
                    reasons.add("Matching location keyword(s): " + String.join(", ", commonLoc) + " (+" + locationScore + " pts)");
                }
            }
        }
        breakdown.put("location", locationScore);

        // 4. Description Keyword Overlap (Max 15 pts)
        Set<String> sourceDescKeywords = extractKeywords(source.getDescription());
        Set<String> candidateDescKeywords = extractKeywords(candidate.getDescription());
        Set<String> commonDesc = new LinkedHashSet<>(sourceDescKeywords);
        commonDesc.retainAll(candidateDescKeywords);
        // Exclude words already highlighted in title
        commonDesc.removeAll(commonTitleKeywords);

        if (!commonDesc.isEmpty()) {
            descriptionScore = Math.min(15, commonDesc.size() * 5);
            List<String> topDescWords = commonDesc.stream().limit(3).toList();
            reasons.add("Overlapping description keyword(s): " + String.join(", ", topDescWords) + " (+" + descriptionScore + " pts)");
        }
        breakdown.put("description", descriptionScore);

        // 5. Date Proximity Bonus (Max 5 pts)
        if (source.getReportDate() != null && candidate.getReportDate() != null) {
            long daysDiff = Math.abs(ChronoUnit.DAYS.between(source.getReportDate(), candidate.getReportDate()));
            if (daysDiff <= 3) {
                dateBonus = 5;
                reasons.add("Reported within " + daysDiff + " day(s) of each other (+5 pts)");
            } else if (daysDiff <= 7) {
                dateBonus = 3;
                reasons.add("Reported within a week of each other (+3 pts)");
            }
        }
        breakdown.put("dateProximity", dateBonus);

        int totalScore = Math.min(100, categoryScore + titleScore + locationScore + descriptionScore + dateBonus);

        // Confidence classification without claiming absolute certainty
        String confidence;
        String confidenceLabel;
        if (totalScore >= 70) {
            confidence = "HIGH";
            confidenceLabel = "Strong Potential Match";
        } else if (totalScore >= 40) {
            confidence = "MEDIUM";
            confidenceLabel = "Possible Match";
        } else {
            confidence = "LOW";
            confidenceLabel = "Weak Match";
        }

        String summary = String.format("%s (%d%%) based on %s.",
                confidenceLabel,
                totalScore,
                reasons.isEmpty() ? "general similarity" : reasons.get(0).toLowerCase());

        return new MatchEvaluation(totalScore, confidence, confidenceLabel, reasons, breakdown, summary);
    }

    /**
     * Extract meaningful lowercase keyword tokens excluding punctuation and stop words.
     */
    public Set<String> extractKeywords(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptySet();
        }
        String clean = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ");
        String[] tokens = clean.split("\\s+");
        Set<String> keywords = new LinkedHashSet<>();
        for (String t : tokens) {
            String trimmed = t.trim();
            if (trimmed.length() >= 3 && !STOP_WORDS.contains(trimmed)) {
                keywords.add(trimmed);
            }
        }
        return keywords;
    }

    public static class MatchEvaluation {
        public final int score;
        public final String confidence;
        public final String confidenceLabel;
        public final List<String> reasons;
        public final Map<String, Integer> scoreBreakdown;
        public final String summary;

        public MatchEvaluation(int score, String confidence, String confidenceLabel,
                               List<String> reasons, Map<String, Integer> scoreBreakdown, String summary) {
            this.score = score;
            this.confidence = confidence;
            this.confidenceLabel = confidenceLabel;
            this.reasons = reasons;
            this.scoreBreakdown = scoreBreakdown;
            this.summary = summary;
        }
    }
}
