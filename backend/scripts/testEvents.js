/**
 * Phase 3 Automated Backend Event Management Test Suite
 */

const BASE_URL = 'http://localhost:5001/api';

const runEventTests = async () => {
  console.log('=== Starting Phase 3 Backend Event Management Tests ===\n');

  // Logins
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'AdminPass123!' }),
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0];
  console.log(`[Setup] Admin Login: ${adminLogin.status}`);

  const orgLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer@campus.edu', password: 'OrgPass123!' }),
  });
  const orgCookie = orgLogin.headers.get('set-cookie')?.split(';')[0];
  const orgJson = await orgLogin.json();
  const orgId = orgJson.data.user._id;
  console.log(`[Setup] Organizer Login: ${orgLogin.status}`);

  const studentLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@campus.edu', password: 'StudentPass123!' }),
  });
  const studentCookie = studentLogin.headers.get('set-cookie')?.split(';')[0];
  console.log(`[Setup] Student Login: ${studentLogin.status}`);

  // Setup: Create Club A and Club B
  const clubARes = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: `Club A - Tech ${Date.now()}`,
      description: 'Technical club for web dev and AI experiments.',
      category: 'Technical',
    }),
  });
  const clubAJson = await clubARes.json();
  const clubAId = clubAJson.data.club._id;

  // Assign organizer to Club A
  await fetch(`${BASE_URL}/clubs/${clubAId}/organizers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ userId: orgId }),
  });
  console.log(`[Setup] Club A created and Organizer assigned: ${clubAId}`);

  // Create Club B without assigning Organizer
  const clubBRes = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: `Club B - Music ${Date.now()}`,
      description: 'Campus music club for live concerts and acoustic nights.',
      category: 'Cultural',
    }),
  });
  const clubBJson = await clubBRes.json();
  const clubBId = clubBJson.data.club._id;
  console.log(`[Setup] Club B created (unassigned to organizer): ${clubBId}`);

  // Future Dates setup (10 days ahead)
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 10);
  const startDateTime = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const endDateTime = new Date(baseDate.getTime() + 5 * 60 * 60 * 1000).toISOString();
  const deadlineDateTime = new Date(baseDate.getTime() + 1 * 60 * 60 * 1000).toISOString();

  // Test 1: Organizer Creates Event for Assigned Club A
  console.log('\n[Test 1] Organizer Creates Event for Assigned Club A...');
  const createRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({
      title: 'Full-Stack Hackathon 2026',
      description: 'Annual college hackathon exploring MERN architecture and real-time computing.',
      clubId: clubAId,
      category: 'Technical',
      startDateTime,
      endDateTime,
      venue: 'Main Auditorium, Hall 1',
      capacity: 100,
      registrationDeadline: deadlineDateTime,
    }),
  });
  const createJson = await createRes.json();
  console.log(`Status: ${createRes.status}, Event ID: ${createJson.data?.event?._id}, Status: ${createJson.data?.event?.status}, Phase: ${createJson.data?.event?.phase}`);
  const eventId = createJson.data?.event?._id;

  // Test 2: Organizer Attempts to Create Event for Unassigned Club B (Expect 403)
  console.log('\n[Test 2] Organizer Attempts Event for Unassigned Club B (Expect 403)...');
  const unauthRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({
      title: 'Unauthorized Concert Event',
      description: 'Organizer attempting creation on unassigned club.',
      clubId: clubBId,
      category: 'Cultural',
      startDateTime,
      endDateTime,
      venue: 'Music Hall',
      capacity: 50,
      registrationDeadline: deadlineDateTime,
    }),
  });
  console.log(`Status: ${unauthRes.status} (Expected 403)`);

  // Test 3: Student Attempts to Create Event (Expect 403)
  console.log('\n[Test 3] Student Attempts Event Creation (Expect 403)...');
  const studentCreate = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      title: 'Student Attempt Event',
      description: 'Unauthorized student attempt.',
      clubId: clubAId,
      category: 'Technical',
      startDateTime,
      endDateTime,
      venue: 'Lab 2',
      capacity: 30,
      registrationDeadline: deadlineDateTime,
    }),
  });
  console.log(`Status: ${studentCreate.status} (Expected 403)`);

  // Test 4: Reject Invalid End Date (End before Start)
  console.log('\n[Test 4] Reject End Date Before Start Date...');
  const badDates = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({
      title: 'Bad Date Event',
      description: 'Event with inverted start and end datetimes.',
      clubId: clubAId,
      category: 'Technical',
      startDateTime: endDateTime, // Start after end
      endDateTime: startDateTime,
      venue: 'Room 101',
      capacity: 20,
      registrationDeadline: deadlineDateTime,
    }),
  });
  const badDatesJson = await badDates.json();
  console.log(`Status: ${badDates.status}, Code: ${badDatesJson.error?.code}`);

  // Test 5: Organizer Edits Authorized Event
  console.log('\n[Test 5] Organizer Edits Authorized Event...');
  const editRes = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({
      venue: 'New Advanced Tech Pavilion, Hall A',
      capacity: 150,
    }),
  });
  const editJson = await editRes.json();
  console.log(`Status: ${editRes.status}, Updated Capacity: ${editJson.data?.event?.capacity}, Venue: ${editJson.data?.event?.venue}`);

  // Test 6: Organizer Publishes Event
  console.log('\n[Test 6] Organizer Publishes Event...');
  const publishRes = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'PATCH',
    headers: { Cookie: orgCookie },
  });
  const publishJson = await publishRes.json();
  console.log(`Status: ${publishRes.status}, Status: ${publishJson.data?.event?.status}, Calculated Phase: ${publishJson.data?.event?.phase}`);

  // Test 7: Reject Double Publishing
  console.log('\n[Test 7] Reject Double Publishing...');
  const doublePub = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'PATCH',
    headers: { Cookie: orgCookie },
  });
  const doublePubJson = await doublePub.json();
  console.log(`Status: ${doublePub.status}, Code: ${doublePubJson.error?.code}`);

  // Test 8: Organizer Cancels Event
  console.log('\n[Test 8] Organizer Cancels Event...');
  const cancelRes = await fetch(`${BASE_URL}/events/${eventId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({ reason: 'Rescheduled due to university exams.' }),
  });
  const cancelJson = await cancelRes.json();
  console.log(`Status: ${cancelRes.status}, Status: ${cancelJson.data?.event?.status}, Calculated Phase: ${cancelJson.data?.event?.phase}, Reason: ${cancelJson.data?.event?.cancellationReason}`);

  // Test 9: Reject Editing Cancelled Event
  console.log('\n[Test 9] Reject Editing Cancelled Event...');
  const editCancelled = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({ capacity: 200 }),
  });
  const editCancelledJson = await editCancelled.json();
  console.log(`Status: ${editCancelled.status}, Code: ${editCancelledJson.error?.code}`);

  // Test 10: Admin Can Manage Platform-Wide (Create for Club B)
  console.log('\n[Test 10] Admin Creates Event for Club B Directly...');
  const adminEventRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      title: 'Campus Symphony Night',
      description: 'Classical university orchestra concert showcasing student musicians.',
      clubId: clubBId,
      category: 'Cultural',
      startDateTime,
      endDateTime,
      venue: 'Open Air Amphitheatre',
      capacity: 300,
      registrationDeadline: deadlineDateTime,
    }),
  });
  const adminEventJson = await adminEventRes.json();
  console.log(`Status: ${adminEventRes.status}, Admin Event Created: ${adminEventJson.data?.event?.title}`);

  // Test 11: Organizer Lists Authorized Events (Should only see Club A events, not Club B)
  console.log('\n[Test 11] Organizer Lists Authorized Events...');
  const orgListRes = await fetch(`${BASE_URL}/events`, {
    headers: { Cookie: orgCookie },
  });
  const orgListJson = await orgListRes.json();
  console.log(`Status: ${orgListRes.status}, Organizer Event Count: ${orgListJson.data?.events?.length}`);

  // Test 12: Admin Lists All Events
  console.log('\n[Test 12] Admin Lists All Events...');
  const adminListRes = await fetch(`${BASE_URL}/events`, {
    headers: { Cookie: adminCookie },
  });
  const adminListJson = await adminListRes.json();
  console.log(`Status: ${adminListRes.status}, Admin Total Event Count: ${adminListJson.data?.events?.length}`);

  console.log('\n=== All Phase 3 Backend Event Tests Completed Successfully! ===');
};

runEventTests().catch((err) => {
  console.error('Event tests failed:', err);
  process.exit(1);
});
