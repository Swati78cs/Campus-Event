/**
 * Comprehensive Backend Club Management & Organizer Assignment Test Suite
 */

const BASE_URL = 'http://localhost:5001/api';

const runClubTests = async () => {
  console.log('=== Starting Phase 2 Backend Club Management Tests ===\n');

  // 1. Admin Login
  console.log('[Step 1] Admin Login...');
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'AdminPass123!' }),
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0];
  const adminJson = await adminLogin.json();
  const adminId = adminJson.data.user._id;
  console.log(`Admin login status: ${adminLogin.status}`);

  // 2. Student Login
  console.log('[Step 2] Student Login...');
  const studentLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@campus.edu', password: 'StudentPass123!' }),
  });
  const studentCookie = studentLogin.headers.get('set-cookie')?.split(';')[0];
  const studentJson = await studentLogin.json();
  const studentId = studentJson.data.user._id;
  console.log(`Student login status: ${studentLogin.status}`);

  // 3. Organizer Login
  console.log('[Step 3] Organizer Login...');
  const orgLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer@campus.edu', password: 'OrgPass123!' }),
  });
  const orgCookie = orgLogin.headers.get('set-cookie')?.split(';')[0];
  const orgJson = await orgLogin.json();
  const orgId = orgJson.data.user._id;
  console.log(`Organizer login status: ${orgLogin.status}`);

  // Test 1: Admin Creates Club
  console.log('\n[Test 1] Admin Creates Club (Coding & Algorithm Club)...');
  const clubName = `Coding & Algorithm Club ${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: clubName,
      description: 'Official student coding club hosting algorithmic challenges, hackathons, and workshops.',
      category: 'Technical',
    }),
  });
  const createJson = await createRes.json();
  console.log(`Status: ${createRes.status}, Club ID: ${createJson.data?.club?._id}, Category: ${createJson.data?.club?.category}`);
  const createdClubId = createJson.data?.club?._id;

  // Test 2: Reject Duplicate Club Name
  console.log('\n[Test 2] Reject Duplicate Club Name...');
  const dupRes = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: clubName,
      description: 'Duplicate club attempt with identical name.',
      category: 'Technical',
    }),
  });
  const dupJson = await dupRes.json();
  console.log(`Status: ${dupRes.status}, Code: ${dupJson.error?.code}`);

  // Test 3: Reject Non-Admin Club Creation
  console.log('\n[Test 3] Student Attempts Club Creation (Expect 403)...');
  const studentCreateRes = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      name: 'Unauthorized Club',
      description: 'Attempting to create club as a regular student.',
      category: 'Social',
    }),
  });
  console.log(`Status: ${studentCreateRes.status} (Expected 403)`);

  // Test 4: Public List Clubs
  console.log('\n[Test 4] Public List Clubs...');
  const listRes = await fetch(`${BASE_URL}/clubs`);
  const listJson = await listRes.json();
  console.log(`Status: ${listRes.status}, Total Active Clubs: ${listJson.data?.clubs?.length}`);

  // Test 5: Admin Updates Club
  console.log('\n[Test 5] Admin Updates Club Details...');
  const updateRes = await fetch(`${BASE_URL}/clubs/${createdClubId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      description: 'Updated comprehensive description for algorithms, competitive programming, and web dev.',
      category: 'Technical',
    }),
  });
  const updateJson = await updateRes.json();
  console.log(`Status: ${updateRes.status}, Updated Description Length: ${updateJson.data?.club?.description?.length}`);

  // Test 6: Admin Assigns Organizer
  console.log('\n[Test 6] Admin Assigns Organizer to Club...');
  const assignRes = await fetch(`${BASE_URL}/clubs/${createdClubId}/organizers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ userId: orgId }),
  });
  const assignJson = await assignRes.json();
  console.log(`Status: ${assignRes.status}, Organizers Count: ${assignJson.data?.club?.organizers?.length}`);

  // Test 7: Reject Duplicate Organizer Assignment
  console.log('\n[Test 7] Reject Duplicate Organizer Assignment...');
  const dupAssign = await fetch(`${BASE_URL}/clubs/${createdClubId}/organizers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ userId: orgId }),
  });
  const dupAssignJson = await dupAssign.json();
  console.log(`Status: ${dupAssign.status}, Code: ${dupAssignJson.error?.code}`);

  // Test 8: Organizer Retrieves Assigned Clubs (/api/clubs/my-clubs)
  console.log('\n[Test 8] Organizer Calls /api/clubs/my-clubs...');
  const myClubsRes = await fetch(`${BASE_URL}/clubs/my-clubs`, {
    headers: { Cookie: orgCookie },
  });
  const myClubsJson = await myClubsRes.json();
  console.log(`Status: ${myClubsRes.status}, My Clubs Count: ${myClubsJson.data?.clubs?.length}`);

  // Test 9: Student Denied from /api/clubs/my-clubs
  console.log('\n[Test 9] Student Access to /api/clubs/my-clubs (Expect 403)...');
  const studentMyClubs = await fetch(`${BASE_URL}/clubs/my-clubs`, {
    headers: { Cookie: studentCookie },
  });
  console.log(`Status: ${studentMyClubs.status} (Expected 403)`);

  // Test 10: Admin Promotes Student to Organizer via PATCH /api/users/:id/role
  console.log('\n[Test 10] Admin Promotes Student to Organizer...');
  const promoteRes = await fetch(`${BASE_URL}/users/${studentId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ role: 'organizer' }),
  });
  const promoteJson = await promoteRes.json();
  console.log(`Status: ${promoteRes.status}, New Role: ${promoteJson.data?.user?.role}`);

  // Test 11: Admin Removes Organizer from Club
  console.log('\n[Test 11] Admin Removes Organizer from Club...');
  const removeRes = await fetch(`${BASE_URL}/clubs/${createdClubId}/organizers/${orgId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  const removeJson = await removeRes.json();
  console.log(`Status: ${removeRes.status}, Remaining Organizers: ${removeJson.data?.club?.organizers?.length}`);

  // Test 12: Admin Self-Role-Change Blocked
  console.log('\n[Test 12] Admin Attempts Self-Role-Change (Expect 400)...');
  const selfRole = await fetch(`${BASE_URL}/users/${adminId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ role: 'student' }),
  });
  const selfRoleJson = await selfRole.json();
  console.log(`Status: ${selfRole.status}, Code: ${selfRoleJson.error?.code}`);

  console.log('\n=== All Phase 2 Backend Club Management Tests Completed! ===');
};

runClubTests().catch((err) => {
  console.error('Club test runner failed:', err);
  process.exit(1);
});
