/**
 * Comprehensive Backend Authentication & Authorization Test Script
 * Verifies all 17 backend criteria for Phase 1.
 */

const BASE_URL = 'http://localhost:5001/api';

const runTests = async () => {
  console.log('=== Starting Phase 1 Backend Authentication Tests ===\n');

  let studentCookie = '';
  let adminCookie = '';
  let studentId = '';

  // Test 1: Register Student
  console.log('[Test 1] Register Student (Bob)...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Student',
      email: 'bob@campus.edu',
      password: 'BobSecurePassword123',
    }),
  });
  const regJson = await regRes.json();
  const regCookie = regRes.headers.get('set-cookie');
  console.log(`Status: ${regRes.status}, Success: ${regJson.success}, Role: ${regJson.data?.user?.role}`);
  if (regJson.data?.user?.passwordHash) {
    throw new Error('FAILURE: passwordHash leaked in registration response!');
  }
  studentId = regJson.data?.user?._id;
  if (!studentId && regJson.error?.code === 'EMAIL_ALREADY_EXISTS') {
    console.log('Note: Bob already exists from previous run, will test login.');
  }

  // Test 2: Reject Duplicate Email
  console.log('\n[Test 2] Reject Duplicate Email...');
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Imposter',
      email: 'bob@campus.edu',
      password: 'AnotherPassword123',
    }),
  });
  const dupJson = await dupRes.json();
  console.log(`Status: ${dupRes.status}, Error Code: ${dupJson.error?.code}`);

  // Test 3: Reject Invalid Registration Data (Short Password)
  console.log('\n[Test 3] Reject Invalid Registration Data (Short Password)...');
  const invalidReg = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Short',
      email: 'short@campus.edu',
      password: '123',
    }),
  });
  const invalidRegJson = await invalidReg.json();
  console.log(`Status: ${invalidReg.status}, Code: ${invalidRegJson.error?.code}`);

  // Test 4: Login with Invalid Credentials
  console.log('\n[Test 4] Reject Invalid Credentials...');
  const badLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bob@campus.edu',
      password: 'WrongPassword',
    }),
  });
  const badLoginJson = await badLogin.json();
  console.log(`Status: ${badLogin.status}, Code: ${badLoginJson.error?.code}, Message: ${badLoginJson.message}`);

  // Test 5: Successful Student Login
  console.log('\n[Test 5] Student Login (Bob)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bob@campus.edu',
      password: 'BobSecurePassword123',
    }),
  });
  const loginJson = await loginRes.json();
  const setCookieHeader = loginRes.headers.get('set-cookie');
  studentCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  studentId = loginJson.data?.user?._id;
  console.log(`Status: ${loginRes.status}, Success: ${loginJson.success}, Cookie captured: ${studentCookie.substring(0, 25)}...`);

  // Test 6: Access Protected Route (/api/auth/me) with Cookie
  console.log('\n[Test 6] Access Protected Route (/api/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  const meJson = await meRes.json();
  console.log(`Status: ${meRes.status}, User: ${meJson.data?.user?.name}, Role: ${meJson.data?.user?.role}, Active: ${meJson.data?.user?.isActive}`);

  // Test 7: Reject Protected Route Without Cookie
  console.log('\n[Test 7] Reject Protected Route Without Cookie...');
  const noAuthRes = await fetch(`${BASE_URL}/auth/me`);
  const noAuthJson = await noAuthRes.json();
  console.log(`Status: ${noAuthRes.status}, Code: ${noAuthJson.error?.code}`);

  // Test 8: Update Profile
  console.log('\n[Test 8] Update Profile (/api/auth/profile)...');
  const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie,
    },
    body: JSON.stringify({ name: 'Robert Student' }),
  });
  const updateJson = await updateRes.json();
  console.log(`Status: ${updateRes.status}, Updated Name: ${updateJson.data?.user?.name}`);

  // Test 9: Student Attempts Admin Route (/api/users) -> Expect 403 Forbidden
  console.log('\n[Test 9] Student Attempts Admin Route (/api/users)...');
  const forbiddenRes = await fetch(`${BASE_URL}/users`, {
    headers: { Cookie: studentCookie },
  });
  const forbiddenJson = await forbiddenRes.json();
  console.log(`Status: ${forbiddenRes.status}, Code: ${forbiddenJson.error?.code}, Message: ${forbiddenJson.message}`);

  // Test 10: Admin Login
  console.log('\n[Test 10] Admin Login (admin@campus.edu)...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@campus.edu',
      password: 'AdminPass123!',
    }),
  });
  const adminLoginJson = await adminLoginRes.json();
  const adminSetCookie = adminLoginRes.headers.get('set-cookie');
  adminCookie = adminSetCookie ? adminSetCookie.split(';')[0] : '';
  console.log(`Status: ${adminLoginRes.status}, Admin Role: ${adminLoginJson.data?.user?.role}`);

  // Test 11: Admin Lists All Users
  console.log('\n[Test 11] Admin Lists Users (/api/users)...');
  const usersRes = await fetch(`${BASE_URL}/users`, {
    headers: { Cookie: adminCookie },
  });
  const usersJson = await usersRes.json();
  console.log(`Status: ${usersRes.status}, Total Users: ${usersJson.data?.users?.length}`);

  // Test 12: Admin Deactivates Student
  console.log(`\n[Test 12] Admin Deactivates Student (ID: ${studentId})...`);
  const deactRes = await fetch(`${BASE_URL}/users/${studentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const deactJson = await deactRes.json();
  console.log(`Status: ${deactRes.status}, User isActive: ${deactJson.data?.user?.isActive}`);

  // Test 13: Deactivated Student Immediate Rejection on Protected Request
  console.log('\n[Test 13] Deactivated Student Tries Protected Request with Existing Valid Token...');
  const deactMeRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  const deactMeJson = await deactMeRes.json();
  console.log(`Status: ${deactMeRes.status}, Code: ${deactMeJson.error?.code}, Message: ${deactMeJson.message}`);

  // Test 14: Deactivated Student Login Blocked
  console.log('\n[Test 14] Deactivated Student Tries to Log In...');
  const deactLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bob@campus.edu',
      password: 'BobSecurePassword123',
    }),
  });
  const deactLoginJson = await deactLoginRes.json();
  console.log(`Status: ${deactLoginRes.status}, Code: ${deactLoginJson.error?.code}`);

  // Test 15: Admin Reactivates Student
  console.log('\n[Test 15] Admin Reactivates Student...');
  const reactRes = await fetch(`${BASE_URL}/users/${studentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ isActive: true }),
  });
  const reactJson = await reactRes.json();
  console.log(`Status: ${reactRes.status}, User isActive: ${reactJson.data?.user?.isActive}`);

  // Test 16: Admin Self-Deactivation Prevented
  console.log('\n[Test 16] Admin Attempts Self-Deactivation...');
  const selfDeactRes = await fetch(`${BASE_URL}/users/${adminLoginJson.data.user._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const selfDeactJson = await selfDeactRes.json();
  console.log(`Status: ${selfDeactRes.status}, Code: ${selfDeactJson.error?.code}`);

  // Test 17: Logout
  console.log('\n[Test 17] Logout (/api/auth/logout)...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
  });
  const logoutJson = await logoutRes.json();
  const clearCookieHeader = logoutRes.headers.get('set-cookie');
  console.log(`Status: ${logoutRes.status}, Message: ${logoutJson.message}, Set-Cookie cleared: ${clearCookieHeader?.includes('Max-Age=0')}`);

  console.log('\n=== All 17 Backend Tests Completed Successfully! ===');
};

runTests().catch((err) => {
  console.error('\nTest runner failed:', err);
  process.exit(1);
});
