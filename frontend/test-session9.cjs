const http = require('http');

const BASE_HOST = 'localhost';
const BASE_PORT = 8080;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: BASE_HOST,
      port: BASE_PORT,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runSession9Tests() {
  console.log('=== Starting Session 9: Authorization, Ownership & RBAC Tests ===\n');
  const timestamp = Date.now();

  try {
    // ------------------------------------------------------------------------
    // 1. Public Item Browsing (Unauthenticated Allowed)
    // ------------------------------------------------------------------------
    console.log('Test 1: Public Item Browsing without token (GET /api/items)');
    const publicBrowseRes = await request({ path: '/api/items?page=0&size=5', method: 'GET' });
    console.log(`HTTP Status: ${publicBrowseRes.status}`);
    if (publicBrowseRes.status !== 200) {
      throw new Error(`Expected 200 for public browsing, got ${publicBrowseRes.status}`);
    }
    console.log('SUCCESS: Public item browsing is available without authentication.\n');

    // ------------------------------------------------------------------------
    // 2. Unauthenticated Mutation Protection (401 Unauthorized)
    // ------------------------------------------------------------------------
    console.log('Test 2: Unauthenticated report creation (POST /api/items)');
    const unauthCreateRes = await request({
      path: '/api/items',
      method: 'POST'
    }, {
      title: 'Stolen Watch',
      description: 'Golden watch',
      category: 'ACCESSORIES',
      type: 'LOST',
      location: 'Library'
    });
    console.log(`HTTP Status: ${unauthCreateRes.status}`);
    if (unauthCreateRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthCreateRes.status}`);
    }
    console.log('SUCCESS: Unauthenticated creation correctly blocked with 401.\n');

    console.log('Test 3: Unauthenticated report update (PUT /api/items/1)');
    const unauthUpdateRes = await request({
      path: '/api/items/1',
      method: 'PUT'
    }, { title: 'Hacked Title' });
    console.log(`HTTP Status: ${unauthUpdateRes.status}`);
    if (unauthUpdateRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthUpdateRes.status}`);
    }
    console.log('SUCCESS: Unauthenticated update correctly blocked with 401.\n');

    console.log('Test 4: Unauthenticated report deletion (DELETE /api/items/1)');
    const unauthDeleteRes = await request({ path: '/api/items/1', method: 'DELETE' });
    console.log(`HTTP Status: ${unauthDeleteRes.status}`);
    if (unauthDeleteRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthDeleteRes.status}`);
    }
    console.log('SUCCESS: Unauthenticated deletion correctly blocked with 401.\n');

    console.log('Test 5: Unauthenticated My Reports query (GET /api/items/my)');
    const unauthMyReportsRes = await request({ path: '/api/items/my', method: 'GET' });
    console.log(`HTTP Status: ${unauthMyReportsRes.status}`);
    if (unauthMyReportsRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthMyReportsRes.status}`);
    }
    console.log('SUCCESS: Unauthenticated My Reports correctly blocked with 401.\n');

    // ------------------------------------------------------------------------
    // 3. User Setup (Student 1, Student 2, Admin)
    // ------------------------------------------------------------------------
    console.log('Test 6: Register Student 1 and Student 2 accounts');
    const student1Email = `student1_${timestamp}@campus.edu`;
    const student2Email = `student2_${timestamp}@campus.edu`;
    const adminEmail = `admin_${timestamp}@campus.edu`;

    const regStudent1 = await request({ path: '/api/users/register', method: 'POST' }, {
      name: 'Alice Student',
      email: student1Email,
      password: 'password123',
      role: 'STUDENT'
    });
    const token1 = regStudent1.data.token;
    const student1Id = regStudent1.data.id;
    console.log(`Registered Student 1: ${student1Email} (ID: ${student1Id}, Role: ${regStudent1.data.role})`);

    const regStudent2 = await request({ path: '/api/users/register', method: 'POST' }, {
      name: 'Bob Student',
      email: student2Email,
      password: 'password123',
      role: 'STUDENT'
    });
    const token2 = regStudent2.data.token;
    const student2Id = regStudent2.data.id;
    console.log(`Registered Student 2: ${student2Email} (ID: ${student2Id}, Role: ${regStudent2.data.role})`);

    const regAdmin = await request({ path: '/api/users/register', method: 'POST' }, {
      name: 'Security Admin',
      email: adminEmail,
      password: 'password123',
      role: 'ROLE_ADMIN'
    });
    const adminToken = regAdmin.data.token;
    const adminId = regAdmin.data.id;
    console.log(`Registered Admin: ${adminEmail} (ID: ${adminId}, Role: ${regAdmin.data.role})\n`);

    // ------------------------------------------------------------------------
    // 4. Server-Side Ownership Binding (Ignore Fake User IDs)
    // ------------------------------------------------------------------------
    console.log('Test 7: Student 1 creates Report 1 (sends fake userId: 99999 in payload)');
    const report1Res = await request({
      path: '/api/items',
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    }, {
      title: 'Alice Blue Backpack',
      description: 'Left in library 2nd floor with notebooks',
      category: 'BAGS',
      type: 'LOST',
      location: 'Central Library',
      reportDate: '2026-10-14',
      userId: 99999 // Attacker tries to forge ownership to another user
    });

    console.log(`HTTP Status: ${report1Res.status}`);
    const report1 = report1Res.data;
    console.log(`Report 1 ID: ${report1.id}`);
    console.log(`Report 1 Bound User in MySQL: ${report1.user.email} (ID: ${report1.user.id})`);
    if (report1.user.id !== student1Id) {
      throw new Error(`Server failed to associate report with authenticated user! Linked ID: ${report1.user.id}`);
    }
    console.log('SUCCESS: Server correctly ignored spoofed userId and securely associated Report 1 with Student 1!\n');

    console.log('Test 8: Student 2 creates Report 2');
    const report2Res = await request({
      path: '/api/items',
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` }
    }, {
      title: 'Bob Silver Water Bottle',
      description: 'Stainless steel hydroflask with stickers',
      category: 'OTHER',
      type: 'FOUND',
      location: 'Science Lab 102',
      reportDate: '2026-10-14'
    });
    console.log(`HTTP Status: ${report2Res.status}`);
    const report2 = report2Res.data;
    console.log(`Report 2 ID: ${report2.id}, Bound User: ${report2.user.email} (ID: ${report2.user.id})`);
    if (report2.user.id !== student2Id) {
      throw new Error('Server failed to associate Report 2 with Student 2');
    }
    console.log('SUCCESS: Report 2 securely bound to Student 2.\n');

    // ------------------------------------------------------------------------
    // 5. Secure My Reports Endpoint
    // ------------------------------------------------------------------------
    console.log('Test 9: Student 1 queries My Reports (GET /api/items/my)');
    const myReports1Res = await request({
      path: '/api/items/my',
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`HTTP Status: ${myReports1Res.status}`);
    const items1 = myReports1Res.data.content || myReports1Res.data;
    const hasReport1 = items1.some(i => i.id === report1.id);
    const hasReport2 = items1.some(i => i.id === report2.id);
    console.log(`Student 1 sees their Report 1: ${hasReport1}, sees Student 2's Report 2: ${hasReport2}`);
    if (!hasReport1 || hasReport2) {
      throw new Error('My Reports endpoint leaked other users reports or missed personal reports!');
    }
    console.log('SUCCESS: My Reports returns only the authenticated user\'s own reports!\n');

    // ------------------------------------------------------------------------
    // 6. Ownership Enforcement: Cross-User Tampering Prevention (403 Forbidden)
    // ------------------------------------------------------------------------
    console.log('Test 10: Student 1 attempts to UPDATE Student 2\'s Report 2 (PUT /api/items/' + report2.id + ')');
    const crossUpdateRes = await request({
      path: `/api/items/${report2.id}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` }
    }, {
      title: 'Tampered Title by Student 1',
      description: 'Hacked description'
    });
    console.log(`HTTP Status: ${crossUpdateRes.status}`);
    console.log(`Error Message: ${crossUpdateRes.data.message || JSON.stringify(crossUpdateRes.data)}`);
    if (crossUpdateRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for cross-user update, got ${crossUpdateRes.status}`);
    }
    console.log('SUCCESS: Prevented unauthorized modification with HTTP 403 Forbidden!\n');

    console.log('Test 11: Student 1 attempts to DELETE Student 2\'s Report 2 (DELETE /api/items/' + report2.id + ')');
    const crossDeleteRes = await request({
      path: `/api/items/${report2.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`HTTP Status: ${crossDeleteRes.status}`);
    console.log(`Error Message: ${crossDeleteRes.data.message || JSON.stringify(crossDeleteRes.data)}`);
    if (crossDeleteRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for cross-user deletion, got ${crossDeleteRes.status}`);
    }
    console.log('SUCCESS: Prevented unauthorized deletion with HTTP 403 Forbidden!\n');

    console.log('Test 12: Student 1 attempts to query Student 2\'s reports directly (GET /api/items/user/' + student2Id + ')');
    const crossUserQueryRes = await request({
      path: `/api/items/user/${student2Id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`HTTP Status: ${crossUserQueryRes.status}`);
    if (crossUserQueryRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for querying another user's reports route, got ${crossUserQueryRes.status}`);
    }
    console.log('SUCCESS: Prevented unauthorized user reports access with HTTP 403 Forbidden!\n');

    // ------------------------------------------------------------------------
    // 7. Legitimate Owner Mutation
    // ------------------------------------------------------------------------
    console.log('Test 13: Student 1 updates their OWN Report 1 (PUT /api/items/' + report1.id + ')');
    const ownerUpdateRes = await request({
      path: `/api/items/${report1.id}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` }
    }, {
      title: 'Alice Blue Backpack [FOUND IN LOCKER]',
      status: 'RESOLVED',
      userId: 77777 // Attempt to reassign owner - must be ignored!
    });
    console.log(`HTTP Status: ${ownerUpdateRes.status}`);
    if (ownerUpdateRes.status !== 200) {
      throw new Error(`Expected 200 OK for owner update, got ${ownerUpdateRes.status}`);
    }
    if (ownerUpdateRes.data.user.id !== student1Id) {
      throw new Error('Ownership was illegally altered during update!');
    }
    console.log(`Updated Title: ${ownerUpdateRes.data.title}`);
    console.log(`Updated Status: ${ownerUpdateRes.data.status}`);
    console.log(`Preserved Owner: ${ownerUpdateRes.data.user.email} (ID: ${ownerUpdateRes.data.user.id})`);
    console.log('SUCCESS: Owner update succeeded and preserved owner integrity!\n');

    // ------------------------------------------------------------------------
    // 8. Role-Based Moderation: Admin Privileges
    // ------------------------------------------------------------------------
    console.log('Test 14: Administrator updates Student 2\'s Report 2 (Admin moderation)');
    const adminUpdateRes = await request({
      path: `/api/items/${report2.id}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      status: 'CLAIMED',
      description: 'Admin verified claim and marked as CLAIMED'
    });
    console.log(`HTTP Status: ${adminUpdateRes.status}`);
    if (adminUpdateRes.status !== 200) {
      throw new Error(`Expected 200 OK for Admin moderation, got ${adminUpdateRes.status}`);
    }
    console.log('SUCCESS: Admin successfully moderated another user\'s report.\n');

    console.log('Test 15: Student 1 deletes their OWN Report 1');
    const ownerDeleteRes = await request({
      path: `/api/items/${report1.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log(`HTTP Status: ${ownerDeleteRes.status}`);
    if (ownerDeleteRes.status !== 200) {
      throw new Error(`Expected 200 OK for owner delete, got ${ownerDeleteRes.status}`);
    }
    console.log('SUCCESS: Owner deleted their own report.\n');

    console.log('Test 16: Administrator deletes Student 2\'s Report 2 (Admin moderation)');
    const adminDeleteRes = await request({
      path: `/api/items/${report2.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`HTTP Status: ${adminDeleteRes.status}`);
    if (adminDeleteRes.status !== 200) {
      throw new Error(`Expected 200 OK for Admin delete, got ${adminDeleteRes.status}`);
    }
    console.log('SUCCESS: Admin successfully deleted moderated report.\n');

    console.log('Test 17: Modify non-existent report ID 9999999 (returns 404 without leaking info)');
    const notFoundRes = await request({
      path: '/api/items/9999999',
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` }
    }, { title: 'Ghost Item' });
    console.log(`HTTP Status: ${notFoundRes.status}`);
    if (notFoundRes.status !== 404) {
      throw new Error(`Expected 404 Not Found, got ${notFoundRes.status}`);
    }
    console.log('SUCCESS: Correctly returned 404 Not Found for non-existent item.\n');

    console.log('=== All Session 9 Authorization & Ownership Tests Passed Perfectly! ===');
  } catch (err) {
    console.error('\nTest failed with error:', err.message || err);
    process.exit(1);
  }
}

runSession9Tests();
