package com.campus.lost_and_found.controller;

import com.campus.lost_and_found.dto.ItemMatchResponse;
import com.campus.lost_and_found.dto.ItemReportRequest;
import com.campus.lost_and_found.dto.ItemReportResponse;
import com.campus.lost_and_found.dto.PagedResponse;
import com.campus.lost_and_found.entity.ItemReport;
import com.campus.lost_and_found.entity.User;
import com.campus.lost_and_found.service.ItemReportService;
import com.campus.lost_and_found.service.MatchingService;
import com.campus.lost_and_found.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import com.campus.lost_and_found.dto.ClaimResponse;
import com.campus.lost_and_found.dto.ClaimSubmissionRequest;
import com.campus.lost_and_found.dto.StatusUpdateRequest;
import com.campus.lost_and_found.service.ClaimService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
public class ItemReportController {

    private final ItemReportService itemReportService;
    private final UserService userService;
    private final ClaimService claimService;
    private final MatchingService matchingService;

    public ItemReportController(ItemReportService itemReportService,
                                UserService userService,
                                ClaimService claimService,
                                MatchingService matchingService) {
        this.itemReportService = itemReportService;
        this.userService = userService;
        this.claimService = claimService;
        this.matchingService = matchingService;
    }

    /**
     * POST /api/items - Create an item report (securely linked to authenticated user)
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ItemReportResponse> createReport(
            @Valid @RequestBody ItemReportRequest request,
            Authentication authentication) {
        ItemReportResponse response = itemReportService.createReport(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/items/my - List reports belonging to the authenticated user.
     * Uses authenticated principal on server.
     */
    @GetMapping({"/my", "/me"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyReports(
            @RequestParam(required = false) ItemReport.ItemType type,
            @RequestParam(required = false) ItemReport.ItemStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "true") boolean paged,
            Authentication authentication) {

        User currentUser = userService.getUserByEmailEntity(authentication.getName());
        if (!paged) {
            return ResponseEntity.ok(itemReportService.getUserReportsList(currentUser.getId()));
        }

        PagedResponse<ItemReportResponse> response = itemReportService.getReports(
                type, status, category, search, currentUser.getId(), page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/items/user/{userId} - Admin or owner route to create report under specific user
     */
    @PostMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @itemSecurity.isUserOwner(#userId, authentication)")
    public ResponseEntity<ItemReportResponse> createReportForUser(
            @PathVariable Long userId,
            @Valid @RequestBody ItemReportRequest request,
            Authentication authentication) {
        ItemReportResponse response = itemReportService.createReport(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/items - List reports with pagination, sorting and multi-field filters
     * Supports ?type=LOST&category=ELECTRONICS&search=keys&page=0&size=10&sortBy=createdAt&sortDir=desc
     */
    @GetMapping
    public ResponseEntity<?> getReports(
            @RequestParam(required = false) ItemReport.ItemType type,
            @RequestParam(required = false) ItemReport.ItemStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "true") boolean paged) {

        String queryKeyword = (search != null && !search.isBlank()) ? search :
                (keyword != null && !keyword.isBlank()) ? keyword : name;

        if (!paged) {
            return ResponseEntity.ok(itemReportService.getAllReportsList());
        }

        PagedResponse<ItemReportResponse> response = itemReportService.getReports(
                type, status, category, queryKeyword, userId, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/items/{id} - Get a single report by ID (Public)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ItemReportResponse> getReportById(@PathVariable Long id) {
        return ResponseEntity.ok(itemReportService.getReportById(id));
    }

    /**
     * PUT /api/items/{id} - Update a report (Owner or Admin only)
     */
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated() and @itemSecurity.canModify(#id, authentication)")
    public ResponseEntity<ItemReportResponse> updateReport(
            @PathVariable Long id,
            @RequestBody ItemReportRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(itemReportService.updateReport(id, request, authentication));
    }

    /**
     * DELETE /api/items/{id} - Delete a report (Owner or Admin only)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated() and @itemSecurity.canModify(#id, authentication)")
    public ResponseEntity<Map<String, Object>> deleteReport(
            @PathVariable Long id,
            Authentication authentication) {
        itemReportService.deleteReport(id, authentication);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Item report deleted successfully");
        response.put("id", id);
        return ResponseEntity.ok(response);
    }

    /**
     * PUT/PATCH /api/items/{id}/status - Update item status (Owner or Admin only)
     */
    @RequestMapping(value = "/{id}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("isAuthenticated() and @itemSecurity.canModify(#id, authentication)")
    public ResponseEntity<ItemReportResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request,
            Authentication authentication) {
        ItemReportResponse response = itemReportService.updateItemStatus(id, request.getStatus(), authentication);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/items/{id}/claims - Submit interest / claim request for an item
     */
    @PostMapping("/{id}/claims")
    public ResponseEntity<ClaimResponse> submitClaim(
            @PathVariable Long id,
            @Valid @RequestBody ClaimSubmissionRequest request,
            Authentication authentication) {
        ClaimResponse response = claimService.submitClaim(id, request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/items/{id}/claims - View claims for an item (Owner or Admin only)
     */
    @GetMapping("/{id}/claims")
    @PreAuthorize("isAuthenticated() and @itemSecurity.canModify(#id, authentication)")
    public ResponseEntity<List<ClaimResponse>> getClaimsForItem(
            @PathVariable Long id,
            Authentication authentication) {
        List<ClaimResponse> claims = claimService.getClaimsForItem(id, authentication);
        return ResponseEntity.ok(claims);
    }

    /**
     * PUT /api/items/{id}/claims/{claimId}/approve - Approve a claim (Owner or Admin only)
     */
    @PutMapping("/{id}/claims/{claimId}/approve")
    @PreAuthorize("isAuthenticated() and @itemSecurity.canModify(#id, authentication)")
    public ResponseEntity<ClaimResponse> approveClaim(
            @PathVariable Long id,
            @PathVariable Long claimId,
            Authentication authentication) {
        ClaimResponse response = claimService.approveClaim(id, claimId, authentication);
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/items/{id}/claims/{claimId}/reject - Reject a claim (Owner or Admin only)
     */
    @PutMapping("/{id}/claims/{claimId}/reject")
    @PreAuthorize("isAuthenticated() and @itemSecurity.canModify(#id, authentication)")
    public ResponseEntity<ClaimResponse> rejectClaim(
            @PathVariable Long id,
            @PathVariable Long claimId,
            Authentication authentication) {
        ClaimResponse response = claimService.rejectClaim(id, claimId, authentication);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // Backward-Compatible Helper Routes
    // ==========================================

    @GetMapping("/search")
    public ResponseEntity<PagedResponse<ItemReportResponse>> searchReports(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String searchTerm = (query != null && !query.isBlank()) ? query : name;
        return ResponseEntity.ok(itemReportService.getReports(null, null, null, searchTerm, null, page, size, "createdAt", "desc"));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<PagedResponse<ItemReportResponse>> getReportsByStatus(
            @PathVariable ItemReport.ItemStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(itemReportService.getReports(null, status, null, null, null, page, size, "createdAt", "desc"));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<PagedResponse<ItemReportResponse>> getReportsByType(
            @PathVariable ItemReport.ItemType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(itemReportService.getReports(type, null, null, null, null, page, size, "createdAt", "desc"));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<PagedResponse<ItemReportResponse>> getReportsByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(itemReportService.getReports(null, null, category, null, null, page, size, "createdAt", "desc"));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @itemSecurity.isUserOwner(#userId, authentication)")
    public ResponseEntity<PagedResponse<ItemReportResponse>> getReportsByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        return ResponseEntity.ok(itemReportService.getReports(null, null, null, null, userId, page, size, "createdAt", "desc"));
    }

    /**
     * GET /api/items/{id}/matches - Smart matching suggestions between LOST and FOUND reports.
     * Matches only opposite types (LOST <-> FOUND), compares title, description, category, and location,
     * excludes the same report and returned items, and provides transparent match scores and reasons.
     */
    @GetMapping("/{id}/matches")
    public ResponseEntity<List<ItemMatchResponse>> getSuggestedMatches(@PathVariable Long id) {
        List<ItemMatchResponse> matches = matchingService.findPotentialMatches(id);
        return ResponseEntity.ok(matches);
    }
}
