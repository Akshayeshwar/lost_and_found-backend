import axios from 'axios';

// Backend base URL from Vite environment variables (fallback to '/api' for Vite dev proxy)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('campus_jwt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore if localStorage unavailable
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction, field validation, and 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred.';
    let fieldErrors = null;

    if (error.response) {
      // Backend returned HTTP 4xx / 5xx
      const data = error.response.data;
      const status = error.response.status;

      fieldErrors = data?.fieldErrors || data?.validationErrors || null;

      if (status === 401) {
        try {
          localStorage.removeItem('campus_jwt_token');
          localStorage.removeItem('campus_jwt_user');
        } catch {}
        message = data?.message || 'Authentication session has expired or is invalid. Please sign in again.';
      } else if (status === 403) {
        message = data?.message || 'Access Denied: You do not have permission to perform this action.';
      } else if (status === 404) {
        message = data?.message || 'The requested campus report or resource could not be found.';
      } else if (status === 409) {
        message = data?.message || 'A conflicting record already exists in the system.';
      } else if (status === 400) {
        if (fieldErrors && typeof fieldErrors === 'object') {
          message = Object.values(fieldErrors).join(', ');
        } else {
          message = data?.message || 'Invalid request data. Please check your inputs.';
        }
      } else if (status === 500) {
        message = data?.message || 'Internal server error. Please try again later or contact campus support.';
      } else if (typeof data === 'string') {
        message = data;
      } else if (data?.message) {
        message = data.message;
      } else {
        message = `Server responded with error status ${status}`;
      }
    } else if (error.request) {
      // Network failure / server offline
      message = 'Network Error: Unable to connect to the backend server. Please verify the Spring Boot service is running.';
    } else {
      message = error.message;
    }

    const appError = new Error(message);
    appError.status = error.response ? error.response.status : null;
    appError.fieldErrors = fieldErrors;
    appError.response = error.response;
    return Promise.reject(appError);
  }
);

/**
 * Fetch items with optional filtering and pagination
 * @param {Object} params - { type, category, search, page, size, sortBy, sortDir, paged }
 */
export async function fetchItems(params = {}) {
  // If paged is not explicitly set, default to paged=false to retrieve full active list for frontend rendering
  const requestParams = {
    paged: false,
    ...params
  };

  const response = await apiClient.get('/items', { params: requestParams });
  // Backend returns array if paged=false, or PagedResponse object if paged=true
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.content || [];
}

/**
 * Fetch reports belonging to the currently authenticated user
 * Verified on server via the JWT principal.
 */
export async function fetchMyReports(params = {}) {
  const requestParams = {
    paged: false,
    ...params
  };
  const response = await apiClient.get('/items/my', { params: requestParams });
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.content || [];
}

/**
 * Fetch paginated reports for the currently authenticated user
 */
export async function fetchMyReportsPaged(params = {}) {
  const response = await apiClient.get('/items/my', { params: { paged: true, ...params } });
  return response.data;
}

/**
 * Fetch items with server-side pagination, search, category, type and status filters
 * Returns full PagedResponse: { content, pageNumber, pageSize, totalElements, totalPages, last }
 */
export async function fetchItemsPaged({
  type = null,
  status = null,
  category = null,
  search = null,
  page = 0,
  size = 6,
  sortBy = 'createdAt',
  sortDir = 'desc'
} = {}) {
  const params = {
    paged: true,
    page,
    size,
    sortBy,
    sortDir
  };
  if (type && type !== 'ALL') params.type = type;
  if (status && status !== 'ALL') params.status = status;
  if (category && category !== 'ALL') params.category = category;
  if (search && search.trim()) params.search = search.trim();

  const response = await apiClient.get('/items', { params });
  return response.data;
}

/**
 * Fetch a single report by ID
 */
export async function fetchItemById(id) {
  const response = await apiClient.get(`/items/${id}`);
  return response.data;
}

/**
 * Create a new lost or found item report
 */
export async function createItemReport(itemData) {
  const payload = {
    title: itemData.title?.trim(),
    description: itemData.description?.trim(),
    category: itemData.category || 'OTHER',
    type: itemData.type,
    location: itemData.location?.trim(),
    reportDate: itemData.reportDate || new Date().toISOString().split('T')[0],
    imageUrl: itemData.imageUrl?.trim() || null,
    status: itemData.status || 'OPEN',
    userId: itemData.userId || null
  };

  const response = await apiClient.post('/items', payload);
  return response.data;
}

/**
 * Update an existing report
 */
export async function updateItemReport(id, itemData) {
  const response = await apiClient.put(`/items/${id}`, itemData);
  return response.data;
}

/**
 * Delete a report by ID
 */
export async function deleteItemReport(id) {
  const response = await apiClient.delete(`/items/${id}`);
  return response.data;
}

/**
 * Update an item's status (e.g. RETURNED, CLAIMED, OPEN, CLOSED)
 * Only permitted for item report owner or administrator.
 */
export async function updateItemStatus(id, status) {
  const response = await apiClient.put(`/items/${id}/status`, { status });
  return response.data;
}

/**
 * Submit an expression of interest or claim for an item
 */
export async function submitClaim(itemId, { claimantName, claimantContact, message }) {
  const payload = {
    claimantName: claimantName.trim(),
    claimantContact: claimantContact.trim(),
    message: message.trim()
  };
  const response = await apiClient.post(`/items/${itemId}/claims`, payload);
  return response.data;
}

/**
 * Fetch all claims submitted for a specific item
 * Only accessible by the item's owner or administrator.
 */
export async function fetchItemClaims(itemId) {
  const response = await apiClient.get(`/items/${itemId}/claims`);
  return response.data;
}

/**
 * Approve a claim submitted for an item
 */
export async function approveClaim(itemId, claimId) {
  const response = await apiClient.put(`/items/${itemId}/claims/${claimId}/approve`);
  return response.data;
}

/**
 * Reject a claim submitted for an item
 */
export async function rejectClaim(itemId, claimId) {
  const response = await apiClient.put(`/items/${itemId}/claims/${claimId}/reject`);
  return response.data;
}

/**
 * Fetch smart potential matches for an item (opposite type: LOST vs FOUND)
 * Excludes same report and returned items; provides transparent match scores and explanations.
 */
export async function fetchSuggestedMatches(itemId) {
  const response = await apiClient.get(`/items/${itemId}/matches`);
  return response.data;
}

/**
 * Health check endpoint to verify backend and MySQL connectivity
 */
export async function checkBackendHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}

export default apiClient;
