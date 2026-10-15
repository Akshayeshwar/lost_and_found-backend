const http = require('http');

const BASE_URL = 'http://localhost:8080/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const postData = options.body ? JSON.stringify(options.body) : null;

    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runSession12E2E() {
  console.log('================================================================');
  console.log('🏆 SESSION 12: COMPLETE END-TO-END APPLICATION TEST RUNNER');
  console.log('================================================================\n');

  const timestamp = Date.now();
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${details}`);
    }
  }

  // --- 1. HEALTH & DATABASE CONNECTIVITY ---
  console.log('--- 1. Health & Database Connectivity ---');
  const healthRes = await request('/health');
  assert(healthRes.status === 200, 'Health endpoint status 200 OK');
  assert(healthRes.data.database === 'CONNECTED', 'Database status is CONNECTED');
  assert(healthRes.data.status === 'UP', 'Service status is UP');

  // --- 2. REGISTRATION & VALIDATION ---
  console.log('\n--- 2. User Registration, Validation & Hashing ---');
  const invalidReg = await request('/users/register', {
    method: 'POST',
    body: { name: '', email: 'not-an-email', password: '123' }
  });
  assert(invalidReg.status === 400, 'Invalid registration rejected with 400 Bad Request');
  assert(invalidReg.data.fieldErrors?.name !== undefined, 'Validation identifies missing name');
  assert(invalidReg.data.fieldErrors?.email !== undefined, 'Validation identifies invalid email');
  assert(invalidReg.data.fieldErrors?.password !== undefined, 'Validation identifies short password');

  const userEmail = `student_${timestamp}@campus.edu`;
  const validReg = await request('/users/register', {
    method: 'POST',
    body: { name: 'Session 12 Tester', email: userEmail, password: 'SecurePassword123' }
  });
  assert(validReg.status === 201, 'Valid user registered with 201 Created');
  assert(validReg.data.token !== undefined, 'JWT Token issued upon registration');
  assert(validReg.data.user?.password === undefined, 'Password hash is NEVER leaked in user response');
  const studentToken = validReg.data.token;

  // Duplicate email check
  const dupReg = await request('/users/register', {
    method: 'POST',
    body: { name: 'Clone User', email: userEmail, password: 'SecurePassword123' }
  });
  assert(dupReg.status === 409, 'Duplicate email registration rejected with 409 Conflict');

  // --- 3. LOGIN & PASSWORD HASHING ---
  console.log('\n--- 3. User Login & Password Hashing Verification ---');
  const badLogin = await request('/users/login', {
    method: 'POST',
    body: { email: userEmail, password: 'WrongPassword' }
  });
  assert(badLogin.status === 401, 'Login with incorrect password rejected with 401 Unauthorized');

  const goodLogin = await request('/users/login', {
    method: 'POST',
    body: { email: userEmail, password: 'SecurePassword123' }
  });
  assert(goodLogin.status === 200, 'Login with correct BCrypt password succeeds with 200 OK');
  assert(goodLogin.data.token !== undefined, 'Login response contains signed JWT');

  // --- 4. PUBLIC DISCOVERY, SEARCH, FILTERS & EMPTY STATE ---
  console.log('\n--- 4. Discovery, Search, Filtering & Empty State ---');
  const catalogRes = await request('/items?paged=true&page=0&size=5');
  assert(catalogRes.status === 200, 'Public item discovery accessible without authentication');
  assert(Array.isArray(catalogRes.data.content), 'Catalog returns content array');

  const searchRes = await request('/items?search=Bottle&paged=true');
  assert(searchRes.status === 200, 'Search by keyword executes successfully');
  assert(searchRes.data.content.length > 0, 'Search returns matching results');

  // Empty state test: search with nonsense term
  const emptySearchRes = await request('/items?search=XYZ_NONEXISTENT_NONSENSE_9999&paged=true');
  assert(emptySearchRes.status === 200, 'Nonsense search executes without error');
  assert(emptySearchRes.data.content.length === 0, 'Nonsense search returns 0 items (Triggers Empty State)');

  // Filter by LOST and OPEN
  const filterRes = await request('/items?type=LOST&status=OPEN&paged=true');
  assert(filterRes.status === 200, 'Filtering by LOST and OPEN executes successfully');

  // --- 5. REPORT CREATION, VALIDATION & OWNERSHIP ---
  console.log('\n--- 5. Report Creation, Validation & Ownership ---');
  const invalidItemRes = await request('/items', {
    method: 'POST',
    token: studentToken,
    body: {
      title: 'A', // too short
      description: 'Hi', // too short
      category: 'INVALID_CATEGORY',
      type: 'LOST',
      location: '',
      reportDate: '2099-01-01' // future date
    }
  });
  assert(invalidItemRes.status === 400, 'Invalid item report rejected with 400 Bad Request');
  assert(invalidItemRes.data.fieldErrors?.title !== undefined, 'Bean validation catches short title');
  assert(invalidItemRes.data.fieldErrors?.reportDate !== undefined, 'Bean validation catches future date');

  // Create valid item report with spoofed userId
  const createItemRes = await request('/items', {
    method: 'POST',
    token: studentToken,
    body: {
      userId: 9999999, // Intentional spoof attempt
      title: 'Stainless Steel Water Flask',
      description: 'Silver insulated thermos bottle with carabiner clip',
      category: 'PERSONAL_ITEMS',
      type: 'FOUND',
      location: 'Library 2nd Floor Study Room 4',
      reportDate: '2026-10-14',
      status: 'OPEN'
    }
  });
  assert(createItemRes.status === 201, 'Valid item report created with 201 Created');
  const createdItemId = createItemRes.data.id;
  assert(createItemRes.data.user?.email === userEmail, 'Server bound report to JWT owner and IGNORED spoofed userId');

  // --- 6. MY REPORTS (OWNERSHIP VERIFICATION) ---
  console.log('\n--- 6. My Reports & Report Ownership ---');
  const myReportsRes = await request('/items/my', {
    method: 'GET',
    token: studentToken
  });
  assert(myReportsRes.status === 200, 'My Reports accessible by authenticated user');
  const foundInMyReports = myReportsRes.data.items?.some(i => i.id === createdItemId) || 
                           myReportsRes.data.content?.some(i => i.id === createdItemId);
  assert(foundInMyReports, 'Newly created item appears in authenticated user\'s My Reports');

  // Register second user to test unauthorized access
  const secondEmail = `student2_${timestamp}@campus.edu`;
  const secondUser = await request('/users/register', {
    method: 'POST',
    body: { name: 'Intruder Bob', email: secondEmail, password: 'SecurePassword123' }
  });
  const secondToken = secondUser.data.token;

  // Second user attempts to update first user's item -> 403 Forbidden
  const unauthorizedUpdate = await request(`/items/${createdItemId}`, {
    method: 'PUT',
    token: secondToken,
    body: { title: 'Hacked Title' }
  });
  assert(unauthorizedUpdate.status === 403, 'Non-owner update blocked with 403 Forbidden');

  // Second user attempts to delete first user's item -> 403 Forbidden
  const unauthorizedDelete = await request(`/items/${createdItemId}`, {
    method: 'DELETE',
    token: secondToken
  });
  assert(unauthorizedDelete.status === 403, 'Non-owner deletion blocked with 403 Forbidden');

  // --- 7. CLAIM & RETURN WORKFLOW ---
  console.log('\n--- 7. Claim & Return Workflow ---');
  // Student 2 claims the found flask
  const claimRes = await request(`/items/${createdItemId}/claims`, {
    method: 'POST',
    token: secondToken,
    body: {
      claimantName: 'Bob Student',
      claimantContact: 'bob@campus.edu / 555-0199',
      message: 'Has a small scratch on the bottom rim'
    }
  });
  assert(claimRes.status === 201, 'Student 2 submitted claim with 201 Created');
  const claimId = claimRes.data.id;

  // Student 2 cannot inspect claims of another user's item -> 403 Forbidden
  const unauthorizedClaimsView = await request(`/items/${createdItemId}/claims`, {
    method: 'GET',
    token: secondToken
  });
  assert(unauthorizedClaimsView.status === 403, 'Claim list hidden from non-owners with 403 Forbidden');

  // Owner views claims
  const ownerClaimsView = await request(`/items/${createdItemId}/claims`, {
    method: 'GET',
    token: studentToken
  });
  assert(ownerClaimsView.status === 200, 'Item owner can view claims on their report');
  assert(ownerClaimsView.data.length >= 1, 'Owner sees the submitted claim');

  // Owner approves claim -> Item automatically changes to CLAIMED
  const approveClaimRes = await request(`/items/${createdItemId}/claims/${claimId}/approve`, {
    method: 'PUT',
    token: studentToken
  });
  assert(approveClaimRes.status === 200, 'Owner approved claim with 200 OK');

  // Owner marks item as RETURNED
  const returnRes = await request(`/items/${createdItemId}/status`, {
    method: 'PUT',
    token: studentToken,
    body: { status: 'RETURNED' }
  });
  assert(returnRes.status === 200, 'Owner successfully marked item as RETURNED');
  assert(returnRes.data.status === 'RETURNED', 'Item status updated to RETURNED');

  // Cannot reopen returned item (Terminal State Protection)
  const reopenRes = await request(`/items/${createdItemId}/status`, {
    method: 'PUT',
    token: studentToken,
    body: { status: 'OPEN' }
  });
  assert(reopenRes.status === 400, 'Reopening RETURNED item blocked with 400 Bad Request');

  // --- 8. ERROR & NOT FOUND STATES ---
  console.log('\n--- 8. Error & Not Found States ---');
  const notFoundItem = await request('/items/99999999');
  assert(notFoundItem.status === 404, 'Non-existent item returns 404 Not Found');

  const badTokenRes = await request('/items/my', {
    method: 'GET',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
  });
  assert(badTokenRes.status === 401, 'Malformed / Tampered JWT rejected with 401 Unauthorized');

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passedCount}/${totalCount} assertions passed (${Math.round((passedCount/totalCount)*100)}%)`);
  console.log('================================================================\n');

  if (passedCount === totalCount) {
    console.log('🎉 ALL APPLICATION END-TO-END TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runSession12E2E().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
