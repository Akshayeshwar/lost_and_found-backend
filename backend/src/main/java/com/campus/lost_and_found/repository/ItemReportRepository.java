package com.campus.lost_and_found.repository;

import com.campus.lost_and_found.entity.ItemReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemReportRepository extends JpaRepository<ItemReport, Long>, JpaSpecificationExecutor<ItemReport> {

    List<ItemReport> findByUserId(Long userId);

    List<ItemReport> findByTypeAndStatusIn(ItemReport.ItemType type, java.util.Collection<ItemReport.ItemStatus> statuses);
}
