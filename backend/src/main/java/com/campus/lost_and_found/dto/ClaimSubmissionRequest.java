package com.campus.lost_and_found.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ClaimSubmissionRequest {

    @NotBlank(message = "Your name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String claimantName;

    @NotBlank(message = "Contact information (email or phone) is required")
    @Size(min = 5, max = 150, message = "Contact information must be between 5 and 150 characters")
    private String claimantContact;

    @NotBlank(message = "Please describe proof of ownership or return details")
    @Size(min = 5, max = 2000, message = "Message must be between 5 and 2000 characters")
    private String message;

    public ClaimSubmissionRequest() {
    }

    public ClaimSubmissionRequest(String claimantName, String claimantContact, String message) {
        this.claimantName = claimantName;
        this.claimantContact = claimantContact;
        this.message = message;
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
}
