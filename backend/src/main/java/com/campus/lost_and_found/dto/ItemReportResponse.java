package com.campus.lost_and_found.dto;

import com.campus.lost_and_found.entity.ItemReport;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ItemReportResponse {

    private Long id;
    private String title;
    private String description;
    private String category;
    private ItemReport.ItemType type;
    private String location;
    private LocalDate reportDate;
    private String imageUrl;
    private ItemReport.ItemStatus status;
    private LocalDateTime createdAt;
    private UserSummaryResponse user;
    private Long claimCount;

    public ItemReportResponse() {
    }

    public ItemReportResponse(Long id, String title, String description, String category,
                              ItemReport.ItemType type, String location, LocalDate reportDate,
                              String imageUrl, ItemReport.ItemStatus status,
                              LocalDateTime createdAt, UserSummaryResponse user) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.type = type;
        this.location = location;
        this.reportDate = reportDate;
        this.imageUrl = imageUrl;
        this.status = status;
        this.createdAt = createdAt;
        this.user = user;
    }

    // Backward-compatibility getters for vanilla frontend expecting name and date
    public String getName() {
        return this.title;
    }

    public LocalDate getDate() {
        return this.reportDate;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public UserSummaryResponse getUser() {
        return user;
    }

    public void setUser(UserSummaryResponse user) {
        this.user = user;
    }

    public Long getClaimCount() {
        return claimCount;
    }

    public void setClaimCount(Long claimCount) {
        this.claimCount = claimCount;
    }
}
