package com.campus.lost_and_found.dto;

import java.util.List;
import java.util.Map;

public class ItemMatchResponse {

    private ItemReportResponse item;
    private int matchScore; // 0 to 100
    private String confidence; // HIGH, MEDIUM, LOW
    private String confidenceLabel; // "Strong Potential Match", "Possible Match", "Low Match"
    private List<String> matchReasons;
    private Map<String, Integer> scoreBreakdown;
    private String explanation;

    public ItemMatchResponse() {
    }

    public ItemMatchResponse(ItemReportResponse item, int matchScore, String confidence,
                             String confidenceLabel, List<String> matchReasons,
                             Map<String, Integer> scoreBreakdown, String explanation) {
        this.item = item;
        this.matchScore = matchScore;
        this.confidence = confidence;
        this.confidenceLabel = confidenceLabel;
        this.matchReasons = matchReasons;
        this.scoreBreakdown = scoreBreakdown;
        this.explanation = explanation;
    }

    public ItemReportResponse getItem() {
        return item;
    }

    public void setItem(ItemReportResponse item) {
        this.item = item;
    }

    public int getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(int matchScore) {
        this.matchScore = matchScore;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public String getConfidenceLabel() {
        return confidenceLabel;
    }

    public void setConfidenceLabel(String confidenceLabel) {
        this.confidenceLabel = confidenceLabel;
    }

    public List<String> getMatchReasons() {
        return matchReasons;
    }

    public void setMatchReasons(List<String> matchReasons) {
        this.matchReasons = matchReasons;
    }

    public Map<String, Integer> getScoreBreakdown() {
        return scoreBreakdown;
    }

    public void setScoreBreakdown(Map<String, Integer> scoreBreakdown) {
        this.scoreBreakdown = scoreBreakdown;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }
}
