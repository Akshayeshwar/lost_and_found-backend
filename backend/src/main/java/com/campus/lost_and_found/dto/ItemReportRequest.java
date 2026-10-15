package com.campus.lost_and_found.dto;

import com.campus.lost_and_found.entity.ItemReport;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class ItemReportRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 2, max = 150, message = "Title must be between 2 and 150 characters")
    private String title;

    // Backward-compatibility alias for previous frontend sending 'name'
    public void setName(String name) {
        if (this.title == null || this.title.isBlank()) {
            this.title = name;
        }
    }

    public String getName() {
        return this.title;
    }

    @NotBlank(message = "Description is required")
    @Size(min = 5, max = 2000, message = "Description must be between 5 and 2000 characters")
    private String description;

    @NotBlank(message = "Category is required")
    private String category = "OTHER";

    @NotNull(message = "Item type is required (LOST or FOUND)")
    private ItemReport.ItemType type;

    @NotBlank(message = "Location is required")
    @Size(min = 2, max = 150, message = "Location must be between 2 and 150 characters")
    private String location;

    @NotNull(message = "Report date is required")
    @PastOrPresent(message = "Report date cannot be in the future")
    private LocalDate reportDate;

    // Backward-compatibility alias for previous frontend sending 'date'
    public void setDate(LocalDate date) {
        if (this.reportDate == null) {
            this.reportDate = date;
        }
    }

    public LocalDate getDate() {
        return this.reportDate;
    }

    private String imageUrl;

    private ItemReport.ItemStatus status = ItemReport.ItemStatus.OPEN;

    private Long userId;

    public ItemReportRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public ItemReport.ItemType getType() {
        return type;
    }

    public void setType(ItemReport.ItemType type) {
        this.type = type;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDate getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public ItemReport.ItemStatus getStatus() {
        return status;
    }

    public void setStatus(ItemReport.ItemStatus status) {
        this.status = status;
    }

    // Handles both standard lifecycle status (OPEN/CLAIMED/RESOLVED) and legacy forms sending "LOST"/"FOUND" in status
    @JsonProperty("status")
    public void setStatusFromJson(String statusVal) {
        if (statusVal != null && !statusVal.isBlank()) {
            String trimmed = statusVal.trim().toUpperCase();
            if ("LOST".equals(trimmed)) {
                this.type = ItemReport.ItemType.LOST;
                this.status = ItemReport.ItemStatus.OPEN;
            } else if ("FOUND".equals(trimmed)) {
                this.type = ItemReport.ItemType.FOUND;
                this.status = ItemReport.ItemStatus.OPEN;
            } else {
                try {
                    this.status = ItemReport.ItemStatus.valueOf(trimmed);
                } catch (IllegalArgumentException e) {
                    this.status = ItemReport.ItemStatus.OPEN;
                }
            }
        }
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
