package com.campus.lost_and_found.repository;

import com.campus.lost_and_found.entity.ClaimRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClaimRequestRepository extends JpaRepository<ClaimRequest, Long> {
    List<ClaimRequest> findByItemReportIdOrderByCreatedAtDesc(Long itemReportId);
    List<ClaimRequest> findByClaimantIdOrderByCreatedAtDesc(Long claimantId);
    long countByItemReportId(Long itemReportId);
}
