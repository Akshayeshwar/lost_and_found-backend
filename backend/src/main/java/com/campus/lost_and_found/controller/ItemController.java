package com.campus.lost_and_found.controller;

import com.campus.lost_and_found.entity.Item;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.repository.UserRepository;
import com.campus.lost_and_found.service.ItemService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemService itemService;
    private final UserRepository userRepository;

    public ItemController(ItemService itemService, UserRepository userRepository) {
        this.itemService = itemService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public Item addItem(@RequestBody Item item) {
        return itemService.addItem(item);
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<?> addItemForUser(
            @PathVariable Long userId,
            @RequestBody Item item) {

        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("User ID " + userId + " does not exist. Please register first.");
        }

        item.setUser(user);

        return ResponseEntity.ok(itemService.addItem(item));
    }

    @GetMapping
    public List<Item> getAllItems() {
        return itemService.getAllItems();
    }

    @GetMapping("/search")
    public List<Item> searchItems(@RequestParam String name) {
        return itemService.searchItems(name);
    }

    @GetMapping("/status/{status}")
    public List<Item> getItemsByStatus(@PathVariable String status) {
        return itemService.getItemsByStatus(status);
    }

    @GetMapping("/user/{userId}")
    public List<Item> getItemsByUser(@PathVariable Long userId) {
        return itemService.getItemsByUser(userId);
    }

    @GetMapping("/{id}")
    public Item getItemById(@PathVariable Long id) {
        return itemService.getItemById(id);
    }

    @PutMapping("/{id}")
    public Item updateItem(@PathVariable Long id, @RequestBody Item item) {

        Item existingItem = itemService.getItemById(id);

        if (existingItem == null) {
            return null;
        }

        existingItem.setName(item.getName());
        existingItem.setDescription(item.getDescription());
        existingItem.setLocation(item.getLocation());
        existingItem.setStatus(item.getStatus());
        existingItem.setDate(item.getDate());

        return itemService.addItem(existingItem);
    }

    @DeleteMapping("/{id}")
    public String deleteItem(@PathVariable Long id) {
        itemService.deleteItem(id);
        return "Item deleted successfully";
    }
}
