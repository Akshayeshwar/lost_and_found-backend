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

async function runSession13MatchingTests() {
  console.log('================================================================');
  console.log('🧠 SESSION 13: SMART LOST-AND-FOUND MATCHING TEST RUNNER');
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

  // 1. Register Alice (Owner of LOST report)
  console.log('1. Registering Alice (Lost report owner)...');
  const aliceRes = await request('/users/register', {
    method: 'POST',
    body: { name: 'Alice Student', email: `alice_match_${timestamp}@campus.edu`, password: 'Password123' }
  });
  assert(aliceRes.status === 201, 'Alice registered successfully');
  const aliceToken = aliceRes.data.token;

  // 2. Register Bob (Finder of FOUND report)
  console.log('2. Registering Bob (Finder)...');
  const bobRes = await request('/users/register', {
    method: 'POST',
    body: { name: 'Bob GoodSamaritan', email: `bob_match_${timestamp}@campus.edu`, password: 'Password123' }
  });
  assert(bobRes.status === 201, 'Bob registered successfully');
  const bobToken = bobRes.data.token;

  // 3. Alice submits LOST report: "Black wallet lost near the library."
  console.log('\n3. Alice creates LOST report: "Black wallet lost near the library."');
  const lostRes = await request('/items', {
    method: 'POST',
    token: aliceToken,
    body: {
      title: 'Black wallet',
      description: 'Black wallet lost near the library with student ID inside.',
      category: 'PERSONAL_ITEMS',
      type: 'LOST',
      location: 'Near the library',
      reportDate: '2026-10-14',
      status: 'OPEN'
    }
  });
  assert(lostRes.status === 201, 'Alice\'s LOST report created with HTTP 201');
  const lostId = lostRes.data.id;
  console.log(`   -> Lost Report ID: #${lostId}`);

  // 4. Bob submits FOUND report: "Black leather wallet found outside the library."
  console.log('\n4. Bob creates FOUND report: "Black leather wallet found outside the library."');
  const foundRes = await request('/items', {
    method: 'POST',
    token: bobToken,
    body: {
      title: 'Black leather wallet',
      description: 'Black leather wallet found outside the library entrance on the steps.',
      category: 'PERSONAL_ITEMS',
      type: 'FOUND',
      location: 'Outside the library',
      reportDate: '2026-10-14',
      status: 'OPEN'
    }
  });
  assert(foundRes.status === 201, 'Bob\'s FOUND report created with HTTP 201');
  const foundId = foundRes.data.id;
  console.log(`   -> Found Report ID: #${foundId}`);

  // 5. Submit an unrelated FOUND report to test selectivity
  console.log('\n5. Creating unrelated FOUND report: "Calculus Textbook"');
  const unrelatedRes = await request('/items', {
    method: 'POST',
    token: bobToken,
    body: {
      title: 'Stewart Calculus Textbook 9th Ed',
      description: 'Hardcover mathematics textbook found in lecture hall 101',
      category: 'BOOKS_STATIONERY',
      type: 'FOUND',
      location: 'Science Hall 101',
      reportDate: '2026-10-14',
      status: 'OPEN'
    }
  });
  assert(unrelatedRes.status === 201, 'Unrelated report created');
  const unrelatedId = unrelatedRes.data.id;

  // 6. Test Match Suggestions for Alice's LOST wallet
  console.log('\n6. Querying suggested matches for Alice\'s LOST wallet (GET /api/items/' + lostId + '/matches)...');
  const matchesForLost = await request(`/items/${lostId}/matches`);
  assert(matchesForLost.status === 200, 'Matches endpoint returns 200 OK');
  assert(Array.isArray(matchesForLost.data), 'Returns an array of match suggestions');
  assert(matchesForLost.data.length > 0, 'Found at least one suggested match');

  const topMatch = matchesForLost.data[0];
  console.log('\n   Top Suggestion Details:');
  console.log(`   -> Candidate ID: #${topMatch.item.id} (${topMatch.item.title})`);
  console.log(`   -> Match Score: ${topMatch.matchScore}%`);
  console.log(`   -> Confidence: ${topMatch.confidence} (${topMatch.confidenceLabel})`);
  console.log(`   -> Reasons:`, topMatch.matchReasons);
  console.log(`   -> Summary: ${topMatch.explanation}`);

  assert(topMatch.item.id === foundId, 'Top suggested match is Bob\'s found wallet');
  assert(topMatch.item.type === 'FOUND', 'Matches ONLY opposite type (FOUND for LOST)');
  assert(topMatch.matchScore >= 70, `High match score (Score: ${topMatch.matchScore}% >= 70%)`);
  assert(topMatch.confidence === 'HIGH', 'Confidence classified as HIGH');
  assert(topMatch.matchReasons.some(r => r.toLowerCase().includes('category')), 'Reason cites category match');
  assert(topMatch.matchReasons.some(r => r.toLowerCase().includes('wallet') || r.toLowerCase().includes('title')), 'Reason cites title keyword match');
  assert(topMatch.matchReasons.some(r => r.toLowerCase().includes('library') || r.toLowerCase().includes('location')), 'Reason cites location match');

  // Verify unrelated item is NOT in suggested matches
  const hasUnrelated = matchesForLost.data.some(m => m.item.id === unrelatedId);
  assert(!hasUnrelated, 'Unrelated report is excluded due to low keyword similarity');

  // 7. Verify Bidirectionality: Bob's FOUND wallet should suggest Alice's LOST wallet
  console.log('\n7. Querying suggested matches for Bob\'s FOUND wallet (GET /api/items/' + foundId + '/matches)...');
  const matchesForFound = await request(`/items/${foundId}/matches`);
  assert(matchesForFound.status === 200, 'Matches endpoint for FOUND item returns 200 OK');
  const reverseMatch = matchesForFound.data.find(m => m.item.id === lostId);
  assert(reverseMatch !== undefined, 'Reverse matching correctly suggests Alice\'s lost wallet');
  assert(reverseMatch.item.type === 'LOST', 'Reverse match is of opposite type (LOST for FOUND)');
  assert(reverseMatch.matchScore >= 70, `Reverse match score is high (${reverseMatch.matchScore}%)`);

  // 8. Exclusion of Returned Items: Bob marks his found wallet as RETURNED
  console.log('\n8. Bob marks his found wallet as RETURNED...');
  const returnRes = await request(`/items/${foundId}/status`, {
    method: 'PUT',
    token: bobToken,
    body: { status: 'RETURNED' }
  });
  assert(returnRes.status === 200, 'Found item marked as RETURNED');

  console.log('   Re-querying matches for Alice\'s LOST wallet...');
  const matchesAfterReturn = await request(`/items/${lostId}/matches`);
  const stillMatchesReturned = matchesAfterReturn.data.some(m => m.item.id === foundId);
  assert(!stillMatchesReturned, 'Already returned item is strictly EXCLUDED from suggested matches');

  // 9. Edge Case: Non-existent item returns 404
  console.log('\n9. Testing non-existent item matches (GET /api/items/99999999/matches)...');
  const notFoundMatches = await request('/items/99999999/matches');
  assert(notFoundMatches.status === 404, 'Non-existent item returns 404 Not Found');

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passedCount}/${totalCount} assertions passed (${Math.round((passedCount/totalCount)*100)}%)`);
  console.log('================================================================\n');

  if (passedCount === totalCount) {
    console.log('🎉 ALL SMART MATCHING TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('❌ SOME MATCHING TESTS FAILED.');
    process.exit(1);
  }
}

runSession13MatchingTests().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
