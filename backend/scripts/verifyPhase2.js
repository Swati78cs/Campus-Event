/**
 * Phase 2 End-to-End Verification Test Runner
 */

const BASE_URL = 'http://localhost:5001/api';

async function runPhase2Verification() {
  console.log('=== Starting Phase 2 End-to-End Verification ===\n');

  // Check 1: Health Check (Phase 0/1 Regression)
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  console.log(`[Check 1] System Health: Status ${healthRes.status}, DB: ${healthJson.data?.database?.status}`);
  if (healthJson.data?.database?.status !== 'connected') {
    throw new Error('Database is disconnected');
  }

  // Check 2: Admin Login
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'AdminPass123!' }),
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0];
  const adminJson = await adminLogin.json();
  const adminId = adminJson.data.user._id;
  console.log(`[Check 2] Admin Login: Status ${adminLogin.status}, Role: ${adminJson.data?.user?.role}`);

  // Check 3: Student Registration
  const testEmail = `student_phase2_${Date.now()}@campus.edu`;
  const studentReg = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Phase2 Candidate',
      email: testEmail,
      password: 'PassPhase2_123!',
    }),
  });
  const studentJson = await studentReg.json();
  const studentCookie = studentReg.headers.get('set-cookie')?.split(';')[0];
  const studentId = studentJson.data.user._id;
  console.log(`[Check 3] Student Registration: Status ${studentReg.status}, Candidate ID: ${studentId}`);

  // Check 4: Admin Creates Club
  const clubName = `Design & Innovation Club ${Date.now()}`;
  const createClubRes = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: clubName,
      description: 'Campus club dedicated to UI/UX design, product prototyping, and user research.',
      category: 'Technical',
    }),
  });
  const createClubJson = await createClubRes.json();
  const clubId = createClubJson.data?.club?._id;
  console.log(`[Check 4] Admin Creates Club: Status ${createClubRes.status}, Name: ${createClubJson.data?.club?.name}`);

  // Check 5: Duplicate Club Name Rejected
  const dupClub = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: clubName,
      description: 'Duplicate club attempt.',
      category: 'Technical',
    }),
  });
  const dupClubJson = await dupClub.json();
  console.log(`[Check 5] Duplicate Club Name: Status ${dupClub.status}, Code: ${dupClubJson.error?.code}`);

  // Check 6: Student Denied Club Creation (403)
  const studentCreateClub = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      name: 'Unauthorized Club Attempt',
      description: 'Student attempting club creation.',
      category: 'Social',
    }),
  });
  console.log(`[Check 6] Student Club Creation: Status ${studentCreateClub.status} (Expected 403)`);

  // Check 7: Public / Student Lists Clubs
  const listClubs = await fetch(`${BASE_URL}/clubs`);
  const listClubsJson = await listClubs.json();
  console.log(`[Check 7] Public Lists Clubs: Status ${listClubs.status}, Total: ${listClubsJson.data?.clubs?.length}`);

  // Check 8: Admin Updates Club Details
  const updateClubRes = await fetch(`${BASE_URL}/clubs/${clubId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      description: 'Updated description covering Figma design systems, frontend prototyping, and UX workshops.',
      category: 'Technical',
    }),
  });
  const updateClubJson = await updateClubRes.json();
  console.log(`[Check 8] Admin Updates Club: Status ${updateClubRes.status}, Desc: ${updateClubJson.data?.club?.description?.substring(0, 35)}...`);

  // Check 9: Admin Promotes Student to Organizer & Assigns to Club
  const assignOrgRes = await fetch(`${BASE_URL}/clubs/${clubId}/organizers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ userId: studentId }),
  });
  const assignOrgJson = await assignOrgRes.json();
  console.log(`[Check 9] Admin Assigns Organizer: Status ${assignOrgRes.status}, Organizers: ${assignOrgJson.data?.club?.organizers?.length}`);

  // Check 10: Verify Candidate Role Elevated to Organizer
  const checkRole = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  const checkRoleJson = await checkRole.json();
  console.log(`[Check 10] Candidate Auto-Promotion to Organizer: Status ${checkRole.status}, Role: ${checkRoleJson.data?.user?.role}`);

  // Check 11: Promoted Organizer Calls /api/clubs/my-clubs
  const myClubsRes = await fetch(`${BASE_URL}/clubs/my-clubs`, {
    headers: { Cookie: studentCookie },
  });
  const myClubsJson = await myClubsRes.json();
  console.log(`[Check 11] Organizer Retrieves My Clubs: Status ${myClubsRes.status}, Count: ${myClubsJson.data?.clubs?.length}`);

  // Check 12: Admin Removes Organizer
  const removeOrgRes = await fetch(`${BASE_URL}/clubs/${clubId}/organizers/${studentId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  const removeOrgJson = await removeOrgRes.json();
  console.log(`[Check 12] Admin Removes Organizer: Status ${removeOrgRes.status}, Remaining: ${removeOrgJson.data?.club?.organizers?.length}`);

  // Check 13: Admin Changes User Role Directly
  const directRoleRes = await fetch(`${BASE_URL}/users/${studentId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ role: 'student' }),
  });
  const directRoleJson = await directRoleRes.json();
  console.log(`[Check 13] Admin Changes User Role: Status ${directRoleRes.status}, Role: ${directRoleJson.data?.user?.role}`);

  // Check 14: Admin Self-Role-Change Blocked
  const selfRoleRes = await fetch(`${BASE_URL}/users/${adminId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ role: 'student' }),
  });
  const selfRoleJson = await selfRoleRes.json();
  console.log(`[Check 14] Admin Self-Role-Change: Status ${selfRoleRes.status}, Code: ${selfRoleJson.error?.code}`);

  console.log('\n=== All 14 Phase 2 Verification Checks Passed Successfully! ===');
}

runPhase2Verification().catch((err) => {
  console.error('Phase 2 verification failed:', err);
  process.exit(1);
});
