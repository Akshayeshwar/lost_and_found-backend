const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';

async function runTests() {
  console.log('=== Starting Session 7 Integration Tests ===\n');

  // Test 1: Health Check
  console.log('Test 1: Health Check (Backend + MySQL)');
  const healthRes = await axios.get(`${BASE_URL}/health`);
  console.log('Health Status:', healthRes.data);

  // Test 2: Search by title & description
  console.log('\nTest 2: Search items with keyword "Bottle"');
  const searchRes = await axios.get(`${BASE_URL}/items`, { params: { search: 'Bottle', paged: true } });
  console.log('Search matches found:', searchRes.data.totalElements);
  console.log('First match title:', searchRes.data.content[0]?.title);

  // Test 3: Filter by type, category, and status
  console.log('\nTest 3: Filter items by type=LOST and status=OPEN');
  const filterRes = await axios.get(`${BASE_URL}/items`, { params: { type: 'LOST', status: 'OPEN', paged: true } });
  console.log('Matching LOST + OPEN count:', filterRes.data.totalElements);

  // Test 4: Pagination (page=0, size=2 and page=1, size=2)
  console.log('\nTest 4: Verify Pagination');
  const page0 = await axios.get(`${BASE_URL}/items`, { params: { page: 0, size: 2, paged: true } });
  console.log(`Page 0: items=${page0.data.content.length}, totalPages=${page0.data.totalPages}, isLast=${page0.data.last}`);
  const page1 = await axios.get(`${BASE_URL}/items`, { params: { page: 1, size: 2, paged: true } });
  console.log(`Page 1: items=${page1.data.content.length}, pageNumber=${page1.data.pageNumber}, isLast=${page1.data.last}`);

  // Authenticate user for report mutations
  const authRes = await axios.post(`${BASE_URL}/users/register`, {
    name: 'Discovery Tester',
    email: `disco_${Date.now()}@campus.edu`,
    password: 'Password123'
  });
  const token = authRes.data.token;
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Test 5: Create a new report (POST /api/items)
  console.log('\nTest 5: Create a new item report (POST /api/items)');
  const newReport = {
    title: 'Casio fx-991EX Scientific Calculator',
    description: 'Black scientific calculator left in Seminar Hall Room 2',
    category: 'BOOKS_STATIONERY',
    type: 'LOST',
    location: 'Mechanical Seminar Hall',
    reportDate: '2026-10-14',
    status: 'OPEN'
  };
  const createRes = await axios.post(`${BASE_URL}/items`, newReport, authHeaders);
  const createdId = createRes.data.id;
  console.log('Successfully created report! ID assigned by MySQL:', createdId);
  console.log('Report Title:', createRes.data.title);

  // Test 6: Retrieve created report directly (GET /api/items/{id})
  console.log('\nTest 6: Retrieve report by ID from MySQL');
  const fetchRes = await axios.get(`${BASE_URL}/items/${createdId}`);
  console.log('Fetched ID:', fetchRes.data.id, 'Title:', fetchRes.data.title, 'Status:', fetchRes.data.status);

  // Test 7: Edit the report (PUT /api/items/{id})
  console.log('\nTest 7: Edit report details and status (PUT /api/items/{id})');
  const updatePayload = {
    title: 'Casio fx-991EX Calculator (Claimed by Owner)',
    description: 'Black scientific calculator - verified and claimed',
    category: 'BOOKS_STATIONERY',
    type: 'LOST',
    location: 'Mechanical Seminar Hall - Security Desk',
    reportDate: '2026-10-14',
    status: 'CLAIMED'
  };
  const updateRes = await axios.put(`${BASE_URL}/items/${createdId}`, updatePayload, authHeaders);
  console.log('Updated ID:', updateRes.data.id, 'New Title:', updateRes.data.title, 'New Status:', updateRes.data.status);

  // Test 8: Delete the report (DELETE /api/items/{id})
  console.log('\nTest 8: Delete report (DELETE /api/items/{id})');
  const deleteRes = await axios.delete(`${BASE_URL}/items/${createdId}`, authHeaders);
  console.log('Delete response:', deleteRes.data);

  // Test 9: Verify deletion (should return 404)
  console.log('\nTest 9: Verify report is deleted from MySQL');
  try {
    await axios.get(`${BASE_URL}/items/${createdId}`);
    console.error('FAIL: Report still exists!');
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log('SUCCESS: Report correctly returned 404 Not Found after deletion.');
    } else {
      console.error('Unexpected error:', err.message);
    }
  }

  console.log('\n=== All Session 7 Tests Completed Successfully! ===');
}

runTests().catch(err => {
  console.error('Test script error:', err.response ? err.response.data : err.message);
  process.exit(1);
});
