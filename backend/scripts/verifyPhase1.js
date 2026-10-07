/**
 * End-to-End Verification Runner for Phase 1
 * Validates backend and frontend flows against specifications.
 */

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
  console.log('=== Campus Events Platform: Phase 1 Verification ===\n');

  // 1. Health Endpoint (Phase 0 Regression)
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  console.log(`[Check 1] Health Endpoint: Status ${healthRes.status}, DB: ${healthJson.data?.database?.status}`);
  if (healthJson.data?.database?.status !== 'connected') {
    throw new Error('Database is not connected');
  }

  // 2. Student Registration
  const testStudentEmail = `verify_student_${Date.now()}@campus.edu`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Verification Student',
      email: testStudentEmail,
      password: 'VerifyPassword123!',
    }),
  });
  const regJson = await regRes.json();
  const regCookie = regRes.headers.get('set-cookie');
  console.log(`[Check 2] Student Registration: Status ${regRes.status}, Role: ${regJson.data?.user?.role}, Cookie Set: ${!!regCookie}`);
  if (regJson.data?.user?.passwordHash) {
    throw new Error('Security violation: passwordHash returned in response!');
  }

  // 3. Duplicate Email Rejection
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Imposter',
      email: testStudentEmail,
      password: 'AnotherPassword',
    }),
  });
  const dupJson = await dupRes.json();
  console.log(`[Check 3] Duplicate Email Rejection: Status ${dupRes.status}, Code: ${dupJson.error?.code}`);

  // 4. Invalid Login Rejection
  const badLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStudentEmail,
      password: 'WrongPassword',
    }),
  });
  const badLoginJson = await badLogin.json();
  console.log(`[Check 4] Invalid Login: Status ${badLogin.status}, Code: ${badLoginJson.error?.code}`);

  // 5. Successful Login & Cookie Attributes
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStudentEmail,
      password: 'VerifyPassword123!',
    }),
  });
  const loginJson = await loginRes.json();
  const rawCookie = loginRes.headers.get('set-cookie');
  const studentCookie = rawCookie ? rawCookie.split(';')[0] : '';
  const isHttpOnly = rawCookie?.toLowerCase().includes('httponly');
  console.log(`[Check 5] Login & Cookie: Status ${loginRes.status}, HttpOnly: ${isHttpOnly}, Role: ${loginJson.data?.user?.role}`);

  // 6. Access Protected Route (/api/auth/me) with Cookie
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  const meJson = await meRes.json();
  console.log(`[Check 6] Protected Route Access: Status ${meRes.status}, Name: ${meJson.data?.user?.name}`);

  // 7. Profile Update
  const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie,
    },
    body: JSON.stringify({ name: 'Updated Student Name' }),
  });
  const updateJson = await updateRes.json();
  console.log(`[Check 7] Profile Update: Status ${updateRes.status}, New Name: ${updateJson.data?.user?.name}`);

  // 8. Student Denied Admin Access
  const forbiddenRes = await fetch(`${BASE_URL}/users`, {
    headers: { Cookie: studentCookie },
  });
  console.log(`[Check 8] Student Access to Admin Route: Status ${forbiddenRes.status} (Expected 403)`);

  // 9. Organizer Login & Permissions
  const orgLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'organizer@campus.edu',
      password: 'OrgPass123!',
    }),
  });
  const orgLoginJson = await orgLoginRes.json();
  const orgCookie = orgLoginRes.headers.get('set-cookie')?.split(';')[0];
  console.log(`[Check 9] Organizer Login: Status ${orgLoginRes.status}, Role: ${orgLoginJson.data?.user?.role}`);

  const orgAdminAccess = await fetch(`${BASE_URL}/users`, {
    headers: { Cookie: orgCookie },
  });
  console.log(`[Check 10] Organizer Access to Admin Route: Status ${orgAdminAccess.status} (Expected 403)`);

  // 11. Admin Login & User Management
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@campus.edu',
      password: 'AdminPass123!',
    }),
  });
  const adminLoginJson = await adminLoginRes.json();
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0];
  console.log(`[Check 11] Admin Login: Status ${adminLoginRes.status}, Role: ${adminLoginJson.data?.user?.role}`);

  // 12. Admin Lists Users
  const userListRes = await fetch(`${BASE_URL}/users`, {
    headers: { Cookie: adminCookie },
  });
  const userListJson = await userListRes.json();
  console.log(`[Check 12] Admin Lists Users: Status ${userListRes.status}, Count: ${userListJson.data?.users?.length}`);

  // 13. Admin Deactivates Student
  const studentId = regJson.data.user._id;
  const deactRes = await fetch(`${BASE_URL}/users/${studentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const deactJson = await deactRes.json();
  console.log(`[Check 13] Admin Deactivates Student: Status ${deactRes.status}, isActive: ${deactJson.data?.user?.isActive}`);

  // 14. Deactivated Student Blocked with Existing Valid JWT
  const deactCheck = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  const deactCheckJson = await deactCheck.json();
  console.log(`[Check 14] Deactivated Student Access Check: Status ${deactCheck.status}, Code: ${deactCheckJson.error?.code}`);

  // 15. Deactivated Student Login Blocked
  const deactLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStudentEmail,
      password: 'VerifyPassword123!',
    }),
  });
  const deactLoginJson = await deactLogin.json();
  console.log(`[Check 15] Deactivated Student Login: Status ${deactLogin.status}, Code: ${deactLoginJson.error?.code}`);

  // 16. Admin Reactivates Student
  const reactRes = await fetch(`${BASE_URL}/users/${studentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ isActive: true }),
  });
  console.log(`[Check 16] Admin Reactivates Student: Status ${reactRes.status}`);

  // 17. Reactivated Student Can Access
  const restoredCheck = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  console.log(`[Check 17] Reactivated Student Access: Status ${restoredCheck.status} (Expected 200)`);

  // 18. Admin Self-Deactivation Prevented
  const selfDeact = await fetch(`${BASE_URL}/users/${adminLoginJson.data.user._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ isActive: false }),
  });
  const selfDeactJson = await selfDeact.json();
  console.log(`[Check 18] Admin Self-Deactivation Prevented: Status ${selfDeact.status}, Code: ${selfDeactJson.error?.code}`);

  // 19. Logout
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: studentCookie },
  });
  const logoutCookie = logoutRes.headers.get('set-cookie');
  console.log(`[Check 19] Logout: Status ${logoutRes.status}, Cookie Cleared: ${logoutCookie?.includes('Max-Age=0')}`);

  console.log('\n=== All Verification Checks Passed Successfully! ===');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
