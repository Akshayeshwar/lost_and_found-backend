package com.campus.lost_and_found.dto;

import com.campus.lost_and_found.entity.ItemReport;
import jakarta.validation.constraints.NotNull;

public class StatusUpdateRequest {

    @NotNull(message = "Status is required")
    private ItemReport.ItemStatus status;

    public StatusUpdateRequest() {
    }

    public StatusUpdateRequest(ItemReport.ItemStatus status) {
        this.status = status;
    }

    public ItemReport.ItemStatus getStatus() {
        return status;
    }

    public void setStatus(ItemReport.ItemStatus status) {
        this.status = status;
    }
}
