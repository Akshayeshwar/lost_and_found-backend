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

async function runSession11Tests() {
  console.log('====================================================');
  console.log('🧪 SESSION 11: VALIDATION & ERROR HANDLING TEST SUITE');
  console.log('====================================================\n');

  // Test 1: User Registration Bean Validation (Invalid Inputs)
  console.log('--- 1. Testing Registration Bean Validation (Invalid Inputs) ---');
  
  // 1a. Blank Name & Invalid Email & Short Password
  const invalidRegRes = await request('/users/register', {
    method: 'POST',
    body: {
      name: '',
      email: 'not-an-email',
      password: '123'
    }
  });

  console.log('1a. Submitting invalid registration body:');
  console.log('    HTTP Status:', invalidRegRes.status);
  console.log('    Field Errors:', invalidRegRes.data.fieldErrors);
  if (invalidRegRes.status !== 400) {
    throw new Error(`Expected HTTP 400 Bad Request, got ${invalidRegRes.status}`);
  }
  if (!invalidRegRes.data.fieldErrors?.name || !invalidRegRes.data.fieldErrors?.email || !invalidRegRes.data.fieldErrors?.password) {
    throw new Error('Expected fieldErrors for name, email, and password!');
  }
  console.log('    ✅ Verified: Field-level validation errors returned for name, email, and password.\n');

  // 1b. Valid Registration
  const timestamp = Date.now();
  const validEmail = `validator_${timestamp}@campus.edu`;
  const validPassword = 'SecurePassword@123';
  const validRegRes = await request('/users/register', {
    method: 'POST',
    body: {
      name: 'Validation Tester',
      email: validEmail,
      password: validPassword,
      role: 'ROLE_STUDENT'
    }
  });
  console.log('1b. Submitting valid registration body:');
  console.log('    HTTP Status:', validRegRes.status);
  if (validRegRes.status !== 201) {
    throw new Error(`Expected HTTP 201 Created, got ${validRegRes.status}`);
  }
  const userToken = validRegRes.data.token;
  console.log('    ✅ Verified: Valid registration succeeds with HTTP 201.\n');

  // 1c. Duplicate Email Validation
  console.log('1c. Submitting duplicate registration email:');
  const dupRegRes = await request('/users/register', {
    method: 'POST',
    body: {
      name: 'Duplicate Tester',
      email: validEmail,
      password: validPassword
    }
  });
  console.log('    HTTP Status:', dupRegRes.status);
  console.log('    Conflict message:', dupRegRes.data.message);
  if (dupRegRes.status !== 409) {
    throw new Error(`Expected HTTP 409 Conflict, got ${dupRegRes.status}`);
  }
  console.log('    ✅ Verified: Duplicate email rejected with HTTP 409 Conflict.\n');

  // Test 2: Login Validation
  console.log('--- 2. Testing Login Validation ---');
  // 2a. Blank Password
  const blankLoginRes = await request('/users/login', {
    method: 'POST',
    body: {
      email: validEmail,
      password: ''
    }
  });
  console.log('2a. Submitting blank login password:');
  console.log('    HTTP Status:', blankLoginRes.status);
  console.log('    Field Errors:', blankLoginRes.data.fieldErrors);
  if (blankLoginRes.status !== 400 || !blankLoginRes.data.fieldErrors?.password) {
    throw new Error('Expected HTTP 400 with fieldErrors.password!');
  }
  console.log('    ✅ Verified: Field error returned for missing password.\n');

  // 2b. Bad Credentials
  const badLoginRes = await request('/users/login', {
    method: 'POST',
    body: {
      email: validEmail,
      password: 'WrongPassword999'
    }
  });
  console.log('2b. Submitting incorrect password:');
  console.log('    HTTP Status:', badLoginRes.status);
  console.log('    Message:', badLoginRes.data.message);
  if (badLoginRes.status !== 401) {
    throw new Error(`Expected HTTP 401 Unauthorized, got ${badLoginRes.status}`);
  }
  console.log('    ✅ Verified: 401 Unauthorized returned with clear message.\n');

  // Test 3: Item Report Bean Validation (Invalid Inputs)
  console.log('--- 3. Testing Item Report Bean Validation ---');
  
  // 3a. Missing / invalid title, short description, future date, missing location
  const futureDate = '2099-12-31';
  const invalidItemRes = await request('/items', {
    method: 'POST',
    token: userToken,
    body: {
      title: 'A', // Too short (min 2)
      description: 'hi', // Too short (min 5)
      location: '', // Blank
      reportDate: futureDate, // In the future (violates @PastOrPresent)
      type: 'LOST',
      category: 'ELECTRONICS'
    }
  });

  console.log('3a. Submitting item with future date, short title, short description, blank location:');
  console.log('    HTTP Status:', invalidItemRes.status);
  console.log('    Field Errors:', invalidItemRes.data.fieldErrors);
  if (invalidItemRes.status !== 400) {
    throw new Error(`Expected HTTP 400 Bad Request, got ${invalidItemRes.status}`);
  }
  if (!invalidItemRes.data.fieldErrors?.title || 
      !invalidItemRes.data.fieldErrors?.description || 
      !invalidItemRes.data.fieldErrors?.location || 
      !invalidItemRes.data.fieldErrors?.reportDate) {
    throw new Error('Expected fieldErrors for title, description, location, and reportDate!');
  }
  console.log('    ✅ Verified: Field-level validation errors accurately pinpointed all invalid fields.\n');

  // 3b. Valid Item Report Creation
  console.log('3b. Submitting valid item report:');
  const validItemRes = await request('/items', {
    method: 'POST',
    token: userToken,
    body: {
      title: 'Valid Beats Studio Pro Headphones',
      description: 'Black over-ear wireless headphones with original carrying case.',
      location: 'Student Union Lounge Room 104',
      reportDate: new Date().toISOString().split('T')[0],
      type: 'LOST',
      category: 'ELECTRONICS'
    }
  });
  console.log('    HTTP Status:', validItemRes.status);
  if (validItemRes.status !== 201) {
    throw new Error(`Expected HTTP 201 Created, got ${validItemRes.status}`);
  }
  const createdItemId = validItemRes.data.id;
  console.log(`    ✅ Verified: Valid report created successfully with ID #${createdItemId}.\n`);

  // 3c. Item Update Bean Validation (Invalid Input on PUT)
  console.log('3c. Submitting invalid update on existing item (future date):');
  const invalidUpdateRes = await request(`/items/${createdItemId}`, {
    method: 'PUT',
    token: userToken,
    body: {
      title: 'Valid Beats Studio Pro Headphones',
      description: 'Black over-ear wireless headphones with original carrying case.',
      location: 'Student Union Lounge Room 104',
      reportDate: '2099-01-01', // Future date
      type: 'LOST',
      category: 'ELECTRONICS'
    }
  });
  console.log('    HTTP Status:', invalidUpdateRes.status);
  console.log('    Message:', invalidUpdateRes.data.message);
  if (invalidUpdateRes.status !== 400 || !invalidUpdateRes.data.message?.includes('Report date cannot be in the future')) {
    throw new Error('Expected HTTP 400 with "Report date cannot be in the future" on PUT update!');
  }
  console.log('    ✅ Verified: Input validation enforced on PUT updates.\n');

  // Test 4: Missing Item Handling (HTTP 404)
  console.log('--- 4. Testing Missing Item Handling (HTTP 404) ---');
  const missingItemRes = await request('/items/99999999');
  console.log('    HTTP Status for non-existent item:', missingItemRes.status);
  console.log('    Message:', missingItemRes.data.message);
  if (missingItemRes.status !== 404) {
    throw new Error(`Expected HTTP 404 Not Found, got ${missingItemRes.status}`);
  }
  console.log('    ✅ Verified: Clean HTTP 404 response without leaking internals.\n');

  // Test 5: Malformed Token / Auth Handling (HTTP 401)
  console.log('--- 5. Testing Expired / Malformed Token Handling ---');
  const badTokenRes = await request('/items', {
    method: 'POST',
    token: 'eyJhbGciOiJIUzI1NiJ9.invalid.signature',
    body: {
      title: 'Sample Item',
      description: 'Valid description text here',
      location: 'Campus Quad',
      reportDate: '2026-10-14',
      type: 'LOST',
      category: 'OTHER'
    }
  });
  console.log('    HTTP Status with bad token:', badTokenRes.status);
  console.log('    Message:', badTokenRes.data.message);
  if (badTokenRes.status !== 401) {
    throw new Error(`Expected HTTP 401 Unauthorized, got ${badTokenRes.status}`);
  }
  console.log('    ✅ Verified: Rejected bad token with HTTP 401.\n');

  // Test 6: Sensitive Information & Stack Trace Leakage Prevention
  console.log('--- 6. Verifying No Stack Traces or Sensitive Info in Errors ---');
  const responsesToCheck = [invalidRegRes, dupRegRes, blankLoginRes, badLoginRes, invalidItemRes, missingItemRes, badTokenRes];
  for (const res of responsesToCheck) {
    const raw = JSON.stringify(res.data);
    if (raw.includes('org.hibernate') || raw.includes('com.mysql') || raw.includes('Exception:') || raw.includes('.java:')) {
      throw new Error(`Potential stack trace or sensitive internals found in response: ${raw}`);
    }
  }
  console.log('    ✅ Verified: All error payloads are sanitized, standard JSON objects with no stack traces or database internals.\n');

  console.log('====================================================');
  console.log('🎉 ALL SESSION 11 VALIDATION & ERROR TESTS PASSED!');
  console.log('====================================================');
}

runSession11Tests().catch((err) => {
  console.error('\n❌ SESSION 11 TEST RUN FAILED:', err);
  process.exit(1);
});
