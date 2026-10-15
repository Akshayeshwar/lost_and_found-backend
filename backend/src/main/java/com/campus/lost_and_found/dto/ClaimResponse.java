package com.campus.lost_and_found.dto;

import com.campus.lost_and_found.entity.ClaimRequest;
import java.time.LocalDateTime;

public class ClaimResponse {

    private Long id;
    private Long itemReportId;
    private String itemTitle;
    private Long claimantId;
    private String claimantName;
    private String claimantContact;
    private String message;
    private ClaimRequest.ClaimStatus status;
    private LocalDateTime createdAt;

    public ClaimResponse() {
    }

    public ClaimResponse(Long id, Long itemReportId, String itemTitle, Long claimantId,
                         String claimantName, String claimantContact, String message,
                         ClaimRequest.ClaimStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.itemReportId = itemReportId;
        this.itemTitle = itemTitle;
        this.claimantId = claimantId;
        this.claimantName = claimantName;
        this.claimantContact = claimantContact;
        this.message = message;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getItemReportId() {
        return itemReportId;
    }

    public void setItemReportId(Long itemReportId) {
        this.itemReportId = itemReportId;
    }

    public String getItemTitle() {
        return itemTitle;
    }

    public void setItemTitle(String itemTitle) {
        this.itemTitle = itemTitle;
    }

    public Long getClaimantId() {
        return claimantId;
    }

    public void setClaimantId(Long claimantId) {
        this.claimantId = claimantId;
    }

    public String getClaimantName() {
        return claimantName;
    }

    public void setClaimantName(String claimantName) {
        this.claimantName = claimantName;
    }

    public String getClaimantContact() {
        return claimantContact;
    }

    public void setClaimantContact(String claimantContact) {
        this.claimantContact = claimantContact;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public ClaimRequest.ClaimStatus getStatus() {
        return status;
    }

    public void setStatus(ClaimRequest.ClaimStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
