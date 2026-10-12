package com.campus.lost_and_found.service;

import com.campus.lost_and_found.entity.Item;
import com.campus.lost_and_found.repository.ItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ItemService {

    private final ItemRepository itemRepository;

    public ItemService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    public Item addItem(Item item) {
        return itemRepository.save(item);
    }

    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    public List<Item> searchItems(String name) {
        return itemRepository.findByNameContainingIgnoreCase(name);
    }

    public List<Item> getItemsByStatus(String status) {
        return itemRepository.findByStatusIgnoreCase(status);
    }

    public List<Item> getItemsByUser(Long userId) {
        return itemRepository.findByUserId(userId);
    }

    public Item getItemById(Long id) {
        return itemRepository.findById(id).orElse(null);
    }

    public void deleteItem(Long id) {
        itemRepository.deleteById(id);
    }
}