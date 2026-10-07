/**
 * Phase 7 End-to-End Automated Verification Script
 * Campus Event Management & QR Ticketing Platform
 * Volunteer Management Verification Suite
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const VolunteerAssignment = require('../models/VolunteerAssignment');

const API_BASE = 'http://127.0.0.1:5001/api';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  let json;
  try {
    json = await response.json();
  } catch (err) {
    json = null;
  }
  return { status: response.status, headers: response.headers, data: json };
}

async function extractCookie(headers) {
  const rawCookie = headers.get('set-cookie');
  if (!rawCookie) return null;
  return rawCookie.split(';')[0];
}

async function run() {
  console.log('=== Starting Phase 7 End-to-End Verification ===\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(dbUri);
  console.log('[DB] Connected to MongoDB replica set.');

  const timestamp = Date.now();

  // [Check 1] System Health
  const healthRes = await requestJson(`${API_BASE}/health`);
  if (healthRes.status !== 200 || healthRes.data?.data?.database?.status !== 'connected') {
    throw new Error(`[Check 1 Failed] Health check status: ${healthRes.status}`);
  }
  console.log('[Check 1] System Health: Status 200, DB: connected');

  // Setup: Admin, Organizer 1, Organizer 2, Club 1, Club 2, Event 1 (Club 1), Event 2 (Club 2)
  const admin = await User.create({
    name: 'Admin Phase7',
    email: `admin_p7_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'admin',
    isActive: true,
  });

  const orgUser1 = await User.create({
    name: 'Organizer One',
    email: `org1_p7_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'organizer',
    isActive: true,
  });

  const orgUser2 = await User.create({
    name: 'Organizer Two',
    email: `org2_p7_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'organizer',
    isActive: true,
  });

  const club1 = await Club.create({
    name: `Robotics Club ${timestamp}`,
    description: 'Robotics & Hardware Systems',
    category: 'Technical',
    leadEmail: `lead1_p7_${timestamp}@test.edu`,
    organizers: [orgUser1._id],
    isActive: true,
  });

  const club2 = await Club.create({
    name: `Drama Club ${timestamp}`,
    description: 'Performing Arts and Theater',
    category: 'Cultural',
    leadEmail: `lead2_p7_${timestamp}@test.edu`,
    organizers: [orgUser2._id],
    isActive: true,
  });

  const now = new Date();
  const event1 = await Event.create({
    title: `Robotics Expo ${timestamp}`,
    description: 'Annual robotics and automation showcase.',
    club: club1._id,
    category: 'Technical',
    venue: 'Hall A',
    startDateTime: new Date(now.getTime() + 86400000 * 2),
    endDateTime: new Date(now.getTime() + 86400000 * 3),
    registrationDeadline: new Date(now.getTime() + 86400000),
    capacity: 50,
    status: 'published',
    createdBy: orgUser1._id,
  });

  const event2 = await Event.create({
    title: `Street Theater Showcase ${timestamp}`,
    description: 'Cultural street plays and drama performance.',
    club: club2._id,
    category: 'Cultural',
    venue: 'Open Amphitheater',
    startDateTime: new Date(now.getTime() + 86400000 * 2),
    endDateTime: new Date(now.getTime() + 86400000 * 3),
    registrationDeadline: new Date(now.getTime() + 86400000),
    capacity: 100,
    status: 'published',
    createdBy: orgUser2._id,
  });

  // Create Volunteer Candidates: Student, Organizer, Admin, Inactive Candidate
  const candidateStudent = await User.create({
    name: 'Volunteer Student',
    email: `vol_stu_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const candidateOrg = await User.create({
    name: 'Volunteer Organizer Candidate',
    email: `vol_org_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'organizer',
    isActive: true,
  });

  const candidateAdmin = await User.create({
    name: 'Volunteer Admin Candidate',
    email: `vol_adm_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'admin',
    isActive: true,
  });

  const inactiveUser = await User.create({
    name: 'Inactive Candidate',
    email: `inactive_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: false,
  });

  // Login accounts to obtain cookies
  async function login(email) {
    const res = await requestJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Pass@1234' }),
    });
    return await extractCookie(res.headers);
  }

  const adminCookie = await login(admin.email);
  const org1Cookie = await login(orgUser1.email);
  const org2Cookie = await login(orgUser2.email);
  const studentCookie = await login(candidateStudent.email);

  console.log('[Check 2] Setup Completed. Clubs, Events, and Role Candidates created.');

  // [Check 3] Organizer 1 assigns candidateStudent to Event 1 (Authorized club)
  const assign1Res = await requestJson(`${API_BASE}/events/${event1._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: org1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: candidateStudent._id }),
  });

  if (assign1Res.status !== 201) {
    throw new Error(`[Check 3 Failed] Organizer failed to assign volunteer: ${JSON.stringify(assign1Res.data)}`);
  }
  console.log('[Check 3] Authorized Organizer Assigns Volunteer: Status 201 Created');

  // [Check 4] Cross-Club Unauthorized Assignment: Organizer 1 attempts to assign volunteer to Event 2 (Club 2) -> 403 Forbidden
  const assignCrossRes = await requestJson(`${API_BASE}/events/${event2._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: org1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: candidateStudent._id }),
  });

  if (assignCrossRes.status !== 403) {
    throw new Error(`[Check 4 Failed] Expected 403 for cross-club assignment, got ${assignCrossRes.status}`);
  }
  console.log('[Check 4] Cross-Club Unauthorized Organizer Assignment Blocked: Status 403 FORBIDDEN');

  // [Check 5] Admin Assigns Globally to any Event (Event 2)
  const assignAdminRes = await requestJson(`${API_BASE}/events/${event2._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: candidateStudent._id }),
  });

  if (assignAdminRes.status !== 201) {
    throw new Error(`[Check 5 Failed] Admin global assignment failed: ${JSON.stringify(assignAdminRes.data)}`);
  }
  console.log('[Check 5] Admin Assigns Volunteer Globally: Status 201 Created');

  // [Check 6] Inactive User Assignment Blocked -> 400 USER_INACTIVE
  const assignInactiveRes = await requestJson(`${API_BASE}/events/${event1._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: org1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: inactiveUser._id }),
  });

  if (assignInactiveRes.status !== 400 || assignInactiveRes.data?.error?.code !== 'USER_INACTIVE') {
    throw new Error(`[Check 6 Failed] Expected 400 USER_INACTIVE for inactive user assignment, got ${assignInactiveRes.status}`);
  }
  console.log('[Check 6] Inactive User Assignment Blocked: Status 400 USER_INACTIVE');

  // [Check 7] Eligible Account Roles: Assign Organizer & Admin candidates
  const assignOrgCand = await requestJson(`${API_BASE}/events/${event1._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: org1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: candidateOrg._id }),
  });
  const assignAdmCand = await requestJson(`${API_BASE}/events/${event1._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: org1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: candidateAdmin._id }),
  });

  if (assignOrgCand.status !== 201 || assignAdmCand.status !== 201) {
    throw new Error(`[Check 7 Failed] Failed to assign organizer/admin candidates: ${assignOrgCand.status}, ${assignAdmCand.status}`);
  }
  console.log('[Check 7] Eligible Roles Assigned (Organizer & Admin): Status 201 Created');

  // [Check 8] Duplicate ACTIVE Assignment Blocked -> 409 ALREADY_ASSIGNED
  const dupAssignRes = await requestJson(`${API_BASE}/events/${event1._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: org1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: candidateStudent._id }),
  });

  if (dupAssignRes.status !== 409 || dupAssignRes.data?.error?.code !== 'ALREADY_ASSIGNED') {
    throw new Error(`[Check 8 Failed] Expected 409 ALREADY_ASSIGNED, got ${dupAssignRes.status}`);
  }
  console.log('[Check 8] Duplicate Active Assignment Rejected: Status 409 ALREADY_ASSIGNED');

  // [Check 9] List Volunteers for Event 1
  const listVolsRes = await requestJson(`${API_BASE}/events/${event1._id}/volunteers`, {
    headers: { Cookie: org1Cookie },
  });

  if (listVolsRes.status !== 200 || listVolsRes.data?.data?.volunteers?.length !== 3) {
    throw new Error(`[Check 9 Failed] Expected 3 volunteers for Event 1, got: ${JSON.stringify(listVolsRes.data)}`);
  }
  console.log('[Check 9] List Event Volunteers: Status 200, Count: 3');

  // [Check 10] Unauthorized Organizer Cannot Remove Volunteer from Another Club's Event
  const unauthRemoveRes = await requestJson(`${API_BASE}/events/${event2._id}/volunteers/${candidateStudent._id}`, {
    method: 'DELETE',
    headers: { Cookie: org1Cookie },
  });

  if (unauthRemoveRes.status !== 403) {
    throw new Error(`[Check 10 Failed] Expected 403 for unauthorized removal, got ${unauthRemoveRes.status}`);
  }
  console.log('[Check 10] Unauthorized Organizer Removal Blocked: Status 403 FORBIDDEN');

  // [Check 11 & 12] Authorized Organizer Removes Volunteer (candidateStudent from Event 1)
  const removeRes = await requestJson(`${API_BASE}/events/${event1._id}/volunteers/${candidateStudent._id}`, {
    method: 'DELETE',
    headers: { Cookie: org1Cookie },
  });

  if (removeRes.status !== 200) {
    throw new Error(`[Check 11 Failed] Removal failed: ${JSON.stringify(removeRes.data)}`);
  }

  // Verify historical record preserved in DB with status: 'removed'
  const historicalRecord = await VolunteerAssignment.findOne({
    event: event1._id,
    user: candidateStudent._id,
    status: 'removed',
  });

  if (!historicalRecord || !historicalRecord.removedAt || !historicalRecord.removedBy) {
    throw new Error('[Check 12 Failed] Historical volunteer assignment document was not preserved with audit details');
  }
  console.log('[Check 11, 12] Volunteer Removed: Status 200, Historical Audit Record Preserved in MongoDB');

  // [Check 13] Re-assignment after Removal Succeeds
  const reAssignRes = await requestJson(`${API_BASE}/events/${event1._id}/volunteers`, {
    method: 'POST',
    headers: { Cookie: org1Cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: candidateStudent._id }),
  });

  if (reAssignRes.status !== 201) {
    throw new Error(`[Check 13 Failed] Re-assignment failed: ${JSON.stringify(reAssignRes.data)}`);
  }
  console.log('[Check 13] Volunteer Re-assignment after Historical Removal: Status 201 Created');

  // [Check 14] Active Volunteer Retrieves My Assigned Events (GET /api/volunteers/my-events)
  const myAssignedRes = await requestJson(`${API_BASE}/volunteers/my-events`, {
    headers: { Cookie: studentCookie },
  });

  if (myAssignedRes.status !== 200) {
    throw new Error(`[Check 14 Failed] Failed to retrieve assigned events: ${JSON.stringify(myAssignedRes.data)}`);
  }
  // candidateStudent is assigned to Event 1 and Event 2
  const assignedList = myAssignedRes.data?.data?.assignments || [];
  if (assignedList.length < 2) {
    throw new Error(`[Check 14 Failed] Expected at least 2 active assignments, found ${assignedList.length}`);
  }
  console.log(`[Check 14] Volunteer Retrieved Assigned Events: Status 200, Active Assignments: ${assignedList.length}`);

  // [Check 15] Volunteer Status Badge Endpoint (GET /api/volunteers/status)
  const statusRes = await requestJson(`${API_BASE}/volunteers/status`, {
    headers: { Cookie: studentCookie },
  });

  if (statusRes.status !== 200 || !statusRes.data?.data?.hasActiveAssignments) {
    throw new Error('[Check 15 Failed] Expected hasActiveAssignments: true');
  }
  console.log('[Check 15] Volunteer Status Check: Status 200, hasActiveAssignments: true');

  // [Check 16] Search Eligible Users Endpoint (GET /api/volunteers/eligible-users?search=...)
  const searchRes = await requestJson(`${API_BASE}/volunteers/eligible-users?search=${encodeURIComponent(candidateStudent.name)}`, {
    headers: { Cookie: org1Cookie },
  });

  if (searchRes.status !== 200 || !searchRes.data?.data?.users?.length) {
    throw new Error('[Check 16 Failed] Search eligible users returned no results');
  }
  const foundUser = searchRes.data.data.users[0];
  if (foundUser.passwordHash) {
    throw new Error('[Check 16 Failed] Sensitive passwordHash exposed in eligible user search!');
  }
  console.log(`[Check 16] Search Eligible Users: Status 200, Sensitive fields omitted, Found: "${foundUser.name}"`);

  // [Check 17] Admin Global Volunteer Removal
  const adminRemoveRes = await requestJson(`${API_BASE}/events/${event2._id}/volunteers/${candidateStudent._id}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });

  if (adminRemoveRes.status !== 200) {
    throw new Error(`[Check 17 Failed] Admin removal failed: ${JSON.stringify(adminRemoveRes.data)}`);
  }
  console.log('[Check 17] Admin Removes Volunteer Globally: Status 200 OK');

  // [Check 18] Inactive Authenticated User Blocked from Volunteer APIs
  await User.findByIdAndUpdate(candidateStudent._id, { isActive: false });
  const inactiveAccessRes = await requestJson(`${API_BASE}/volunteers/my-events`, {
    headers: { Cookie: studentCookie },
  });

  if (inactiveAccessRes.status !== 403 || inactiveAccessRes.data?.error?.code !== 'ACCOUNT_INACTIVE') {
    throw new Error(`[Check 18 Failed] Inactive user received ${inactiveAccessRes.status}, expected 403 ACCOUNT_INACTIVE`);
  }
  console.log('[Check 18] Deactivated Volunteer Blocked: Status 403 ACCOUNT_INACTIVE');

  // Reactivate student for clean state
  await User.findByIdAndUpdate(candidateStudent._id, { isActive: true });

  console.log('\n=== All Phase 7 Automated Verification Checks Passed Successfully! ===');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
