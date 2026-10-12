package com.campus.lost_and_found.repository;

import com.campus.lost_and_found.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findByNameContainingIgnoreCase(String name);

    List<Item> findByStatusIgnoreCase(String status);

    List<Item> findByUserId(Long userId);
}