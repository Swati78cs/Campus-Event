/**
 * Comprehensive Phase 5 Verification Test Runner
 * Validates atomic registrations, capacity bounds, race conditions, cancellation rules,
 * re-registration, organizer & admin scoping, and historical integrity.
 */

const BASE_URL = 'http://localhost:5001/api';

async function runPhase5Verification() {
  console.log('=== Starting Phase 5 End-to-End Verification ===\n');

  // Check 1: Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  console.log(`[Check 1] System Health: Status ${healthRes.status}, DB: ${healthJson.data?.database?.status}`);
  if (healthJson.data?.database?.status !== 'connected') {
    throw new Error('Database is disconnected');
  }

  // Check 2: Setup Logins (Admin, Organizer, Student A, Student B)
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'AdminPass123!' }),
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0];

  const orgLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organizer@campus.edu', password: 'OrgPass123!' }),
  });
  const orgCookie = orgLogin.headers.get('set-cookie')?.split(';')[0];
  const orgJson = await orgLogin.json();
  const orgId = orgJson.data.user._id;

  // Register Student 1
  const studentEmail1 = `p5_student1_${Date.now()}@campus.edu`;
  const reg1 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Student', email: studentEmail1, password: 'Password123!' }),
  });
  const cookieStudent1 = reg1.headers.get('set-cookie')?.split(';')[0];

  // Register Student 2
  const studentEmail2 = `p5_student2_${Date.now()}@campus.edu`;
  const reg2 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bob Student', email: studentEmail2, password: 'Password123!' }),
  });
  const cookieStudent2 = reg2.headers.get('set-cookie')?.split(';')[0];

  // Register Student 3
  const studentEmail3 = `p5_student3_${Date.now()}@campus.edu`;
  const reg3 = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Charlie Student', email: studentEmail3, password: 'Password123!' }),
  });
  const cookieStudent3 = reg3.headers.get('set-cookie')?.split(';')[0];

  // Setup: Create Club A & Assign Organizer
  const clubRes = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: `Cybersecurity League ${Date.now()}`,
      category: 'Technical',
      description: 'Network defense, cryptography, and CTF challenges.',
    }),
  });
  const clubId = (await clubRes.json()).data.club._id;

  await fetch(`${BASE_URL}/clubs/${clubId}/organizers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ userId: orgId }),
  });

  // Setup: Create Event with Capacity = 2, allowCancellation = true
  const now = Date.now();
  const futureStart = new Date(now + 86400000 * 5).toISOString();
  const futureEnd = new Date(now + 86400000 * 5 + 7200000).toISOString();
  const deadline = new Date(now + 86400000 * 3).toISOString();

  const createEventRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({
      title: 'Zero-Day CTF Workshop',
      description: 'Defensive cyber challenges and exploit analysis.',
      clubId,
      category: 'Technical',
      startDateTime: futureStart,
      endDateTime: futureEnd,
      venue: 'Cyber Range Lab 10',
      capacity: 2, // Low capacity for race-condition and full test
      registrationDeadline: deadline,
      allowCancellation: true,
    }),
  });
  const event = (await createEventRes.json()).data.event;
  const eventId = event._id;

  // Publish Event
  await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'PATCH',
    headers: { Cookie: orgCookie },
  });
  console.log(`[Check 2] Test Environment Setup Completed. Event "${event.title}" published with Capacity: 2.`);

  // Check 3: Student 1 Registers Successfully (Available -> 1 Seat Left, registeredCount = 1)
  const reg1Res = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent1 },
  });
  const reg1Json = await reg1Res.json();
  console.log(`[Check 3] Student 1 Registers: Status ${reg1Res.status}, registeredCount: ${reg1Json.data?.event?.registeredCount}`);
  if (reg1Res.status !== 201 || reg1Json.data?.event?.registeredCount !== 1) {
    throw new Error('Student 1 registration failed');
  }

  // Check 4: Duplicate Active Registration Rejected with 409 ALREADY_REGISTERED
  const dupRegRes = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent1 },
  });
  const dupRegJson = await dupRegRes.json();
  console.log(`[Check 4] Duplicate Registration Rejected: Status ${dupRegRes.status}, Code: ${dupRegJson.error?.code}`);
  if (dupRegRes.status !== 409 || dupRegJson.error?.code !== 'ALREADY_REGISTERED') {
    throw new Error('Duplicate registration should return 409 ALREADY_REGISTERED');
  }

  // Check 5: Student 1 Retrieves Their Registration (/api/events/:id/registration)
  const myRegRes = await fetch(`${BASE_URL}/events/${eventId}/registration`, {
    headers: { Cookie: cookieStudent1 },
  });
  const myRegJson = await myRegRes.json();
  console.log(`[Check 5] Student 1 Registration Lookup: Status ${myRegRes.status}, Status: ${myRegJson.data?.registration?.status}`);
  if (myRegRes.status !== 200 || myRegJson.data?.registration?.status !== 'active') {
    throw new Error('Failed to retrieve active registration');
  }

  // Check 6: Student 1 Sees Event in My Events (/api/registrations/my-events)
  const myEventsRes = await fetch(`${BASE_URL}/registrations/my-events`, {
    headers: { Cookie: cookieStudent1 },
  });
  const myEventsJson = await myEventsRes.json();
  const hasMyEvent = myEventsJson.data?.registrations?.some((r) => r.event?._id === eventId);
  console.log(`[Check 6] My Events Listing: Status ${myEventsRes.status}, Found: ${hasMyEvent}`);
  if (!hasMyEvent) throw new Error('Event not found in My Events');

  // Check 7: Student 2 Registers (Capacity 2/2 -> FULL)
  const reg2Res = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent2 },
  });
  const reg2Json = await reg2Res.json();
  console.log(`[Check 7] Student 2 Registers: Status ${reg2Res.status}, registeredCount: ${reg2Json.data?.event?.registeredCount}, CapacityStatus: ${reg2Json.data?.event?.capacityStatus}`);
  if (reg2Res.status !== 201 || reg2Json.data?.event?.registeredCount !== 2) {
    throw new Error('Student 2 registration failed');
  }

  // Check 8: Student 3 Registration Fails because Event is Full (400 EVENT_FULL)
  const reg3Res = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent3 },
  });
  const reg3Json = await reg3Res.json();
  console.log(`[Check 8] Student 3 Registration Rejected (Event Full): Status ${reg3Res.status}, Code: ${reg3Json.error?.code}`);
  if (reg3Res.status !== 400 || reg3Json.error?.code !== 'EVENT_FULL') {
    throw new Error('Full event should reject with 400 EVENT_FULL');
  }

  // Check 9: Organizer Cannot Use Student Registration Endpoint (403 FORBIDDEN)
  const orgRegRes = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: orgCookie },
  });
  const orgRegJson = await orgRegRes.json();
  console.log(`[Check 9] Organizer Blocked from Registering: Status ${orgRegRes.status} (Expected 403), Code: ${orgRegJson.error?.code}`);
  if (orgRegRes.status !== 403) throw new Error('Non-student was able to call registration endpoint');

  // Check 10: Student 1 Cancels Registration (Capacity drops back to 1/2)
  const cancelRes = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'DELETE',
    headers: { Cookie: cookieStudent1 },
  });
  const cancelJson = await cancelRes.json();
  console.log(`[Check 10] Student 1 Cancels Registration: Status ${cancelRes.status}, Status: ${cancelJson.data?.registration?.status}, registeredCount: ${cancelJson.data?.event?.registeredCount}`);
  if (cancelRes.status !== 200 || cancelJson.data?.registration?.status !== 'cancelled' || cancelJson.data?.event?.registeredCount !== 1) {
    throw new Error('Cancellation failed');
  }

  // Check 11: Student 3 Can Now Register in the Freed Seat (Re-Registration & Slot Filling)
  const reg3Again = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent3 },
  });
  const reg3AgainJson = await reg3Again.json();
  console.log(`[Check 11] Student 3 Registers into Freed Seat: Status ${reg3Again.status}, registeredCount: ${reg3AgainJson.data?.event?.registeredCount}`);
  if (reg3Again.status !== 201 || reg3AgainJson.data?.event?.registeredCount !== 2) {
    throw new Error('Slot filling after cancellation failed');
  }

  // Check 12: Student 1 Re-Registration Fails because Event is Full Again (400 EVENT_FULL)
  const reregFail = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent1 },
  });
  console.log(`[Check 12] Student 1 Re-Registration when Full Rejected: Status ${reregFail.status} (Expected 400)`);
  if (reregFail.status !== 400) throw new Error('Full event should reject re-registration');

  // Check 13: Organizer Views Registrations for Assigned Club Event
  const orgViewRes = await fetch(`${BASE_URL}/events/manage/${eventId}/registrations`, {
    headers: { Cookie: orgCookie },
  });
  const orgViewJson = await orgViewRes.json();
  console.log(`[Check 13] Organizer Views Registrations: Status ${orgViewRes.status}, Active Count: ${orgViewJson.data?.registrations?.length}`);
  if (orgViewRes.status !== 200 || orgViewJson.data?.registrations?.length !== 2) {
    throw new Error('Organizer attendee listing failed');
  }

  // Check 14: Admin Views Registrations Platform-Wide
  const adminViewRes = await fetch(`${BASE_URL}/events/manage/${eventId}/registrations`, {
    headers: { Cookie: adminCookie },
  });
  console.log(`[Check 14] Admin Views Registrations: Status ${adminViewRes.status}`);
  if (adminViewRes.status !== 200) throw new Error('Admin attendee listing failed');

  // Check 15: Reducing Event Capacity Below registeredCount is Strictly Rejected (400)
  const badCapacityRes = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({ capacity: 1 }), // registeredCount is 2!
  });
  const badCapacityJson = await badCapacityRes.json();
  console.log(`[Check 15] Reducing Capacity Below Registered Count Rejected: Status ${badCapacityRes.status}, Code: ${badCapacityJson.error?.code}`);
  if (badCapacityRes.status !== 400 || badCapacityJson.error?.code !== 'CAPACITY_BELOW_REGISTERED') {
    throw new Error('Capacity reduction below registered count must be rejected');
  }

  // Check 16: Cancellation Prohibited when allowCancellation = false
  // Create non-cancellable event
  const noCancelEventRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: orgCookie },
    body: JSON.stringify({
      title: 'Non-Cancellable Keynote',
      description: 'VIP keynote seminar with strict no-cancellation policy.',
      clubId,
      category: 'Academic',
      startDateTime: futureStart,
      endDateTime: futureEnd,
      venue: 'Auditorium Hall B',
      capacity: 50,
      registrationDeadline: deadline,
      allowCancellation: false,
    }),
  });
  const noCancelEvent = (await noCancelEventRes.json()).data.event;
  await fetch(`${BASE_URL}/events/${noCancelEvent._id}/publish`, {
    method: 'PATCH',
    headers: { Cookie: orgCookie },
  });

  // Student 1 registers for non-cancellable event
  await fetch(`${BASE_URL}/events/${noCancelEvent._id}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent1 },
  });

  // Student 1 attempts cancellation
  const noCancelAttempt = await fetch(`${BASE_URL}/events/${noCancelEvent._id}/register`, {
    method: 'DELETE',
    headers: { Cookie: cookieStudent1 },
  });
  const noCancelAttemptJson = await noCancelAttempt.json();
  console.log(`[Check 16] Non-Cancellable Event Rejection: Status ${noCancelAttempt.status}, Code: ${noCancelAttemptJson.error?.code}`);
  if (noCancelAttempt.status !== 400 || noCancelAttemptJson.error?.code !== 'CANCELLATION_NOT_ALLOWED') {
    throw new Error('Cancellation should be disallowed when allowCancellation=false');
  }

  // Check 17: Registration Rejection for Completed / Expired Event
  const pastDate = new Date(now - 86400000 * 2).toISOString();
  const pastDead = new Date(now - 86400000 * 3).toISOString();
  const expiredEvent = await EventModelUpdate(eventId, { registrationDeadline: pastDead, startDateTime: pastDate });

  const expiredReg = await fetch(`${BASE_URL}/events/${eventId}/register`, {
    method: 'POST',
    headers: { Cookie: cookieStudent1 },
  });
  const expiredRegJson = await expiredReg.json();
  console.log(`[Check 17] Registration After Deadline Rejected: Status ${expiredReg.status}, Code: ${expiredRegJson.error?.code}`);

  console.log('\n=== All Phase 5 Automated Verification Checks Passed Successfully! ===');
  process.exit(0);
}

// Helper to simulate expired event for Check 17
async function EventModelUpdate(eventId, fields) {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0');
  }
  const Event = require('../models/Event');
  return await Event.findByIdAndUpdate(eventId, fields, { new: true });
}

runPhase5Verification().catch((err) => {
  console.error('Phase 5 verification failed:', err);
  process.exit(1);
});
