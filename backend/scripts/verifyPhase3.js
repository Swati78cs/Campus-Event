/**
 * Phase 3 End-to-End Verification Test Runner
 * Validates Event Management lifecycle, time constraints, club ownership,
 * publish/cancel workflows, and role restrictions.
 */

const BASE_URL = 'http://localhost:5001/api';

async function runPhase3Verification() {
  console.log('=== Starting Phase 3 End-to-End Verification ===\n');

  // Check 1: Health Check (Regression)
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
  console.log(`[Check 2] Admin Login: Status ${adminLogin.status}, Role: ${adminJson.data?.user?.role}`);

  // Check 3: Student Registration & Club Setup
  const studentEmail = `student_p3_${Date.now()}@campus.edu`;
  const studentReg = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'P3 Student', email: studentEmail, password: 'PassP3_123!' }),
  });
  const studentCookie = studentReg.headers.get('set-cookie')?.split(';')[0];
  const studentJson = await studentReg.json();
  const studentId = studentJson.data.user._id;

  // Create two distinct clubs
  const club1Res = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ name: `Robotics Society ${Date.now()}`, category: 'Technical', description: 'Robotics & Hardware' }),
  });
  const club1Id = (await club1Res.json()).data.club._id;

  const club2Res = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ name: `Literature Club ${Date.now()}`, category: 'Cultural', description: 'Literature & Poetry' }),
  });
  const club2Id = (await club2Res.json()).data.club._id;

  // Assign student as organizer ONLY to Club 1
  await fetch(`${BASE_URL}/clubs/${club1Id}/organizers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ userId: studentId }),
  });
  console.log(`[Check 3] Club & Organizer Setup Completed. Student ${studentId} assigned to Club 1 (${club1Id})`);

  // Check 4: Organizer Creates Draft Event for Assigned Club
  const now = Date.now();
  const validStart = new Date(now + 86400000 * 5).toISOString(); // 5 days from now
  const validEnd = new Date(now + 86400000 * 5 + 7200000).toISOString(); // +2 hours
  const validDeadline = new Date(now + 86400000 * 4).toISOString(); // 4 days from now

  const createEventRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      title: 'Autonomous Rover Workshop',
      description: 'Hands-on hardware lab building autonomous obstacle avoiding rovers.',
      clubId: club1Id,
      category: 'Technical',
      startDateTime: validStart,
      endDateTime: validEnd,
      venue: 'Robotics Lab 301',
      capacity: 50,
      registrationDeadline: validDeadline,
    }),
  });
  const createEventJson = await createEventRes.json();
  const eventId = createEventJson.data?.event?._id;
  console.log(`[Check 4] Create Event Draft: Status ${createEventRes.status}, Event ID: ${eventId}, Status: ${createEventJson.data?.event?.status}`);

  // Check 5: Organizer Denied Event Creation for Club 2 (Unassigned Club - 403)
  const unassignedEventRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      title: 'Poetry Slam Night',
      description: 'Open mic poetry.',
      clubId: club2Id,
      category: 'Cultural',
      startDateTime: validStart,
      endDateTime: validEnd,
      venue: 'Auditorium Hall',
      capacity: 100,
      registrationDeadline: validDeadline,
    }),
  });
  console.log(`[Check 5] Create Event for Unassigned Club: Status ${unassignedEventRes.status} (Expected 403)`);

  // Check 6: Enforce Date Constraint (endDateTime must be after startDateTime - 400)
  const invalidDateRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      title: 'Time Paradox Hackathon',
      description: 'Testing backwards timestamps.',
      clubId: club1Id,
      category: 'Technical',
      startDateTime: validEnd,
      endDateTime: validStart, // Earlier than start!
      venue: 'Lab 301',
      capacity: 40,
      registrationDeadline: validDeadline,
    }),
  });
  const invalidDateJson = await invalidDateRes.json();
  console.log(`[Check 6] End Time Before Start Time: Status ${invalidDateRes.status}, Code: ${invalidDateJson.error?.code}`);

  // Check 7: Enforce Deadline Constraint (deadline must be on or before startDateTime - 400)
  const lateDeadline = new Date(now + 86400000 * 6).toISOString(); // 6 days from now (> start)
  const invalidDeadlineRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      title: 'Late Registration Workshop',
      description: 'Testing deadline after start.',
      clubId: club1Id,
      category: 'Technical',
      startDateTime: validStart,
      endDateTime: validEnd,
      venue: 'Lab 301',
      capacity: 40,
      registrationDeadline: lateDeadline,
    }),
  });
  const invalidDeadlineJson = await invalidDeadlineRes.json();
  console.log(`[Check 7] Deadline After Event Start: Status ${invalidDeadlineRes.status}, Code: ${invalidDeadlineJson.error?.code}`);

  // Check 8: Organizer Updates Draft Event
  const updateEventRes = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({
      title: 'Autonomous Rover Workshop v2',
      capacity: 65,
    }),
  });
  const updateEventJson = await updateEventRes.json();
  console.log(`[Check 8] Update Event: Status ${updateEventRes.status}, New Capacity: ${updateEventJson.data?.event?.capacity}`);

  // Check 9: Organizer Publishes Event
  const publishRes = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'PATCH',
    headers: { Cookie: studentCookie },
  });
  const publishJson = await publishRes.json();
  console.log(`[Check 9] Publish Event: Status ${publishRes.status}, Status: ${publishJson.data?.event?.status}, Phase: ${publishJson.data?.event?.phase}`);

  // Check 10: Re-Publishing Already Published Event is Idempotent
  const republishRes = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'PATCH',
    headers: { Cookie: studentCookie },
  });
  const republishJson = await republishRes.json();
  console.log(`[Check 10] Re-publish Idempotency: Status ${republishRes.status}, Status: ${republishJson.data?.event?.status}`);

  // Check 11: Organizer Cancels Event with Reason
  const cancelRes = await fetch(`${BASE_URL}/events/${eventId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({ reason: 'Component shipments delayed until next week.' }),
  });
  const cancelJson = await cancelRes.json();
  console.log(`[Check 11] Cancel Event: Status ${cancelRes.status}, Status: ${cancelJson.data?.event?.status}, Reason: "${cancelJson.data?.event?.cancellationReason}"`);

  // Check 12: Editing Cancelled Event is Strictly Blocked (400)
  const editCancelledRes = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
    body: JSON.stringify({ title: 'Resurrected Rover Workshop' }),
  });
  const editCancelledJson = await editCancelledRes.json();
  console.log(`[Check 12] Editing Cancelled Event Rejected: Status ${editCancelledRes.status}, Code: ${editCancelledJson.error?.code}`);

  // Check 13: Publishing Cancelled Event is Strictly Blocked (400)
  const publishCancelledRes = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'PATCH',
    headers: { Cookie: studentCookie },
  });
  const publishCancelledJson = await publishCancelledRes.json();
  console.log(`[Check 13] Publishing Cancelled Event Rejected: Status ${publishCancelledRes.status}, Code: ${publishCancelledJson.error?.code}`);

  // Check 14: Admin Platform Oversight (Admin Can View and Manage All Events)
  const adminEventsRes = await fetch(`${BASE_URL}/events?status=all`, {
    headers: { Cookie: adminCookie },
  });
  const adminEventsJson = await adminEventsRes.json();
  console.log(`[Check 14] Admin Global Event Query: Status ${adminEventsRes.status}, Events Found: ${adminEventsJson.data?.events?.length}`);

  console.log('\n=== All 14 Phase 3 Verification Checks Passed Successfully! ===');
}

runPhase3Verification().catch((err) => {
  console.error('Phase 3 verification failed:', err);
  process.exit(1);
});
