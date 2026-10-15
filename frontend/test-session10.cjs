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

async function runSession10Tests() {
  console.log('====================================================');
  console.log('🚀 SESSION 10 E2E TEST: ITEM STATUS & RETURN WORKFLOW');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const ownerEmail = `owner_s10_${timestamp}@campus.edu`;
  const studentEmail = `student_s10_${timestamp}@campus.edu`;
  const password = 'Password@123';

  // 1. Register Owner
  console.log('1. Registering Owner User...');
  const regOwnerRes = await request('/users/register', {
    method: 'POST',
    body: { name: 'Owner Alice', email: ownerEmail, password, role: 'ROLE_STUDENT' }
  });
  if (regOwnerRes.status !== 201) throw new Error('Owner reg failed: ' + JSON.stringify(regOwnerRes));
  const ownerToken = regOwnerRes.data.token;
  console.log('   ✅ Owner registered. Token received.\n');

  // 2. Register Student Claimant
  console.log('2. Registering Student Claimant...');
  const regStudentRes = await request('/users/register', {
    method: 'POST',
    body: { name: 'Student Bob', email: studentEmail, password, role: 'ROLE_STUDENT' }
  });
  if (regStudentRes.status !== 201) throw new Error('Student reg failed: ' + JSON.stringify(regStudentRes));
  const studentToken = regStudentRes.data.token;
  console.log('   ✅ Student registered. Token received.\n');

  // 3. Owner creates a FOUND item report
  console.log('3. Owner creating FOUND report (Status: OPEN)...');
  const createRes = await request('/items', {
    method: 'POST',
    token: ownerToken,
    body: {
      title: `Hydro Flask Water Bottle (${timestamp})`,
      description: 'Navy blue 32oz bottle found on 2nd floor library study desk near window.',
      category: 'OTHER',
      type: 'FOUND',
      location: 'Library 2nd Floor',
      reportDate: '2026-10-14',
      status: 'OPEN'
    }
  });
  if (createRes.status !== 201) throw new Error('Create item failed: ' + JSON.stringify(createRes));
  const item = createRes.data;
  console.log(`   ✅ Item created: ID #${item.id}, Status: ${item.status}\n`);

  // 4. Student submits a claim/expression of interest
  console.log('4. Student Bob submits a claim for Item #' + item.id + '...');
  const claimRes = await request(`/items/${item.id}/claims`, {
    method: 'POST',
    token: studentToken,
    body: {
      claimantName: 'Student Bob',
      claimantContact: 'bob.student@campus.edu / 555-0142',
      message: 'It has a sticker of a pine tree and a small dent at the bottom.'
    }
  });
  if (claimRes.status !== 201) throw new Error('Claim submission failed: ' + JSON.stringify(claimRes));
  const claim = claimRes.data;
  console.log(`   ✅ Claim submitted: Claim ID #${claim.id}, Status: ${claim.status}\n`);

  // 5. Security & Privacy: Verify Unauthorized Access to Claims is Forbidden
  console.log('5. Security Check: Unrelated Student Bob attempting to view Item #' + item.id + ' claims...');
  const unauthClaimsRes = await request(`/items/${item.id}/claims`, {
    token: studentToken
  });
  console.log(`   Received HTTP status: ${unauthClaimsRes.status}`);
  if (unauthClaimsRes.status !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for non-owner, got: ${unauthClaimsRes.status}`);
  }
  console.log('   ✅ 403 Forbidden verified: Non-owners cannot inspect claimant contact details.\n');

  // 6. Owner views claims for Item
  console.log('6. Owner Alice retrieving claims for Item #' + item.id + '...');
  const ownerClaimsRes = await request(`/items/${item.id}/claims`, {
    token: ownerToken
  });
  if (ownerClaimsRes.status !== 200) throw new Error('Owner get claims failed: ' + JSON.stringify(ownerClaimsRes));
  console.log(`   ✅ Retrieved ${ownerClaimsRes.data.length} claim(s). Claimant: ${ownerClaimsRes.data[0].claimantName}, Contact: ${ownerClaimsRes.data[0].claimantContact}\n`);

  // 7. Owner approves the claim
  console.log('7. Owner Alice approving Claim #' + claim.id + '...');
  const approveRes = await request(`/items/${item.id}/claims/${claim.id}/approve`, {
    method: 'PUT',
    token: ownerToken
  });
  if (approveRes.status !== 200) throw new Error('Approve claim failed: ' + JSON.stringify(approveRes));
  console.log(`   ✅ Claim approved! Claim status: ${approveRes.data.status}`);

  // Verify item status auto-transitioned to CLAIMED
  const itemAfterClaimRes = await request(`/items/${item.id}`);
  console.log(`   ✅ Item status automatically updated to: ${itemAfterClaimRes.data.status}\n`);
  if (itemAfterClaimRes.data.status !== 'CLAIMED') {
    throw new Error(`Expected item status to be CLAIMED, got: ${itemAfterClaimRes.data.status}`);
  }

  // 8. Return Workflow: Owner marks the item as RETURNED
  console.log('8. Return Workflow: Owner Alice marking Item #' + item.id + ' as RETURNED...');
  const returnRes = await request(`/items/${item.id}/status`, {
    method: 'PUT',
    token: ownerToken,
    body: { status: 'RETURNED' }
  });
  if (returnRes.status !== 200) throw new Error('Mark returned failed: ' + JSON.stringify(returnRes));
  console.log(`   ✅ Item successfully marked as RETURNED! Status: ${returnRes.data.status}\n`);

  // 9. State Machine Protection: Terminal state cannot be transitioned
  console.log('9. State Machine Enforcement: Attempting to reopen a RETURNED item to OPEN...');
  const invalidTransitionRes = await request(`/items/${item.id}/status`, {
    method: 'PUT',
    token: ownerToken,
    body: { status: 'OPEN' }
  });
  console.log(`   Received HTTP status: ${invalidTransitionRes.status}`);
  if (invalidTransitionRes.status !== 400) {
    throw new Error(`Expected HTTP 400 Bad Request for terminal state alteration, got: ${invalidTransitionRes.status}`);
  }
  console.log(`   ✅ 400 Bad Request verified: "${invalidTransitionRes.data.message}"\n`);

  // 10. Cannot submit claims for already RETURNED items
  console.log('10. Integrity Check: Attempting to submit a new claim on an already RETURNED item...');
  const lateClaimRes = await request(`/items/${item.id}/claims`, {
    method: 'POST',
    token: studentToken,
    body: {
      claimantName: 'Late Claimant',
      claimantContact: 'late@campus.edu',
      message: 'Can I still claim this?'
    }
  });
  console.log(`   Received HTTP status: ${lateClaimRes.status}`);
  if (lateClaimRes.status !== 400) {
    throw new Error(`Expected HTTP 400 Bad Request for claim on RETURNED item, got: ${lateClaimRes.status}`);
  }
  console.log(`   ✅ 400 Bad Request verified: "${lateClaimRes.data.message}"\n`);

  // 11. Non-owner cannot update status
  console.log('11. Authorization Check: Non-owner Bob attempting to update status of Alice\'s item...');
  const unauthStatusRes = await request(`/items/${item.id}/status`, {
    method: 'PUT',
    token: studentToken,
    body: { status: 'OPEN' }
  });
  console.log(`   Received HTTP status: ${unauthStatusRes.status}`);
  if (unauthStatusRes.status !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for non-owner status change, got: ${unauthStatusRes.status}`);
  }
  console.log('   ✅ 403 Forbidden verified: Non-owners cannot update item status.\n');

  console.log('====================================================');
  console.log('🎉 ALL SESSION 10 TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runSession10Tests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
