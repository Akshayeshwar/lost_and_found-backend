const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api';

async function runSession8Tests() {
  console.log('=== Starting Session 8: JWT Authentication Tests ===\n');

  const testUser = {
    name: 'Akshay Security Tester',
    email: `jwt_tester_${Date.now()}@campus.edu`,
    password: 'SecurePassword123!',
    role: 'ROLE_STUDENT'
  };

  // Test 1: User Registration
  console.log('Test 1: User Registration (POST /api/users/register)');
  const regRes = await axios.post(`${BASE_URL}/users/register`, testUser);
  console.log('HTTP Status:', regRes.status);
  console.log('Registered User:', { id: regRes.data.id, name: regRes.data.name, email: regRes.data.email, role: regRes.data.role });
  console.log('JWT Token Issued:', regRes.data.token ? `${regRes.data.token.substring(0, 25)}...` : 'NONE');
  if (regRes.data.password || regRes.data.passwordHash) {
    throw new Error('FAIL: Password hash leaked in response!');
  }
  console.log('SUCCESS: Safe user response without password hash.');

  // Test 2: Prevent Duplicate Email Registration
  console.log('\nTest 2: Duplicate Email Validation');
  try {
    await axios.post(`${BASE_URL}/users/register`, testUser);
    throw new Error('FAIL: Duplicate email registration should have failed!');
  } catch (err) {
    if (err.response && err.response.status === 409) {
      console.log('SUCCESS: Correctly returned HTTP 409 Conflict for duplicate email.');
      console.log('Error message:', err.response.data.message);
    } else {
      throw err;
    }
  }

  // Test 3: User Login
  console.log('\nTest 3: User Login (POST /api/users/login)');
  const loginRes = await axios.post(`${BASE_URL}/users/login`, {
    email: testUser.email,
    password: testUser.password
  });
  console.log('HTTP Status:', loginRes.status);
  console.log('Login Response Message:', loginRes.data.message);
  const jwtToken = loginRes.data.token;
  console.log('Signed JWT Token received:', `${jwtToken.substring(0, 30)}...`);

  // Test 4: Invalid Credentials
  console.log('\nTest 4: Invalid Credentials Validation');
  try {
    await axios.post(`${BASE_URL}/users/login`, {
      email: testUser.email,
      password: 'WrongPassword456'
    });
    throw new Error('FAIL: Login with wrong password should have failed!');
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 400)) {
      console.log('SUCCESS: Correctly rejected invalid credentials with HTTP status:', err.response.status);
    } else {
      throw err;
    }
  }

  // Test 5: Protected Request Without Token (should be rejected with 401)
  console.log('\nTest 5: Protected Request Without Token (POST /api/items)');
  try {
    await axios.post(`${BASE_URL}/items`, {
      title: 'Unauthenticated Item',
      description: 'Should be rejected by Spring Security',
      category: 'OTHER',
      type: 'LOST',
      location: 'Campus Center',
      reportDate: '2026-10-14'
    });
    throw new Error('FAIL: Mutation request without JWT should have been rejected!');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('SUCCESS: Correctly rejected unauthenticated mutation with HTTP 401 Unauthorized.');
    } else {
      throw err;
    }
  }

  // Test 6: Protected Request With Valid JWT Token (GET /api/users/me)
  console.log('\nTest 6: Protected Profile Request With Bearer Token (GET /api/users/me)');
  const meRes = await axios.get(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${jwtToken}` }
  });
  console.log('HTTP Status:', meRes.status);
  console.log('Authenticated Profile:', { id: meRes.data.id, name: meRes.data.name, email: meRes.data.email, role: meRes.data.role });

  // Test 7: Protected Mutation Request With Valid JWT Token (POST /api/items)
  console.log('\nTest 7: Protected Mutation Request With Bearer Token (POST /api/items)');
  const reportPayload = {
    title: 'Blue HydroFlask Bottle',
    description: '32oz blue flask with campus stickers left near gym',
    category: 'OTHER',
    type: 'LOST',
    location: 'Campus Fitness Center',
    reportDate: '2026-10-14'
  };
  const createReportRes = await axios.post(`${BASE_URL}/items`, reportPayload, {
    headers: { Authorization: `Bearer ${jwtToken}` }
  });
  console.log('HTTP Status:', createReportRes.status);
  console.log('Report Created ID in MySQL:', createReportRes.data.id);
  console.log('Report Linked User in MySQL:', createReportRes.data.user);
  if (createReportRes.data.user?.email === testUser.email) {
    console.log('SUCCESS: Report was automatically linked to the authenticated user from the JWT token!');
  }

  // Test 8: Protected Request With Tampered / Invalid Token
  console.log('\nTest 8: Request With Tampered / Invalid Token');
  try {
    await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: 'Bearer this.is.a.fake.and.tampered.token' }
    });
    throw new Error('FAIL: Tampered token should have been rejected!');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('SUCCESS: Tampered token was rejected with HTTP 401 Unauthorized.');
    } else {
      throw err;
    }
  }

  console.log('\n=== All Session 8 Authentication Tests Passed Perfectly! ===');
}

runSession8Tests().catch(err => {
  console.error('\nTest failed with error:', err.response ? { status: err.response.status, data: err.response.data } : err.message);
  process.exit(1);
});
