/**
 * Phase 8 End-to-End Automated Verification Script
 * Campus Event Management & QR Ticketing Platform
 * QR Attendance & Check-In Verification Suite
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const VolunteerAssignment = require('../models/VolunteerAssignment');
const Attendance = require('../models/Attendance');

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
  console.log('=== Starting Phase 8 End-to-End Verification ===\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(dbUri);
  console.log('[DB] Connected to MongoDB replica set.');

  const timestamp = Date.now();

  // [Check 1] System Health
  const healthRes = await requestJson(`${API_BASE}/health`);
  if (healthRes.status !== 200 || healthRes.data?.data?.database?.status !== 'connected') {
    throw new Error(`[Check 1 Failed] Health check status: ${healthRes.status}`);
  }
  console.log('[Check 1 Passed] System Health: Status 200, DB: connected');

  // Setup Users
  const admin = await User.create({
    name: 'Admin P8',
    email: `admin_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'admin',
    isActive: true,
  });

  const orgClubA = await User.create({
    name: 'Organizer Club A',
    email: `org_a_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'organizer',
    isActive: true,
  });

  const orgClubB = await User.create({
    name: 'Organizer Club B',
    email: `org_b_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'organizer',
    isActive: true,
  });

  const volStudent = await User.create({
    name: 'Volunteer Student',
    email: `vol_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const otherStudent = await User.create({
    name: 'Other Student',
    email: `other_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const inactiveStudent = await User.create({
    name: 'Inactive Student',
    email: `inactive_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: false,
  });

  const attendeeStudent1 = await User.create({
    name: 'Attendee One',
    email: `attendee1_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const attendeeStudent2 = await User.create({
    name: 'Attendee Two',
    email: `attendee2_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const attendeeStudent3 = await User.create({
    name: 'Attendee Three',
    email: `attendee3_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  // Setup Clubs
  const clubA = await Club.create({
    name: `AI Club ${timestamp}`,
    description: 'Artificial Intelligence and ML',
    category: 'Technical',
    leadEmail: `lead_a_p8_${timestamp}@test.edu`,
    organizers: [orgClubA._id],
    isActive: true,
  });

  const clubB = await Club.create({
    name: `Music Club ${timestamp}`,
    description: 'Music & Audio Arts',
    category: 'Cultural',
    leadEmail: `lead_b_p8_${timestamp}@test.edu`,
    organizers: [orgClubB._id],
    isActive: true,
  });

  // Setup Events
  // Active event currently in check-in window (started 1 hour ago, ends in 2 hours)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);
  const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const pastEnd = new Date(now.getTime() - 46 * 60 * 60 * 1000);

  const activeEvent = await Event.create({
    title: `AI Symposium ${timestamp}`,
    description: 'Annual AI summit and conference',
    category: 'Technical',
    venue: 'Auditorium A',
    startDateTime: oneHourAgo,
    endDateTime: twoHoursLater,
    registrationDeadline: twoHoursLater,
    capacity: 100,
    registeredCount: 3,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
  });

  const futureEvent = await Event.create({
    title: `Future AI Workshop ${timestamp}`,
    description: 'Workshop next week',
    category: 'Technical',
    venue: 'Hall B',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: futureStart,
    capacity: 50,
    registeredCount: 1,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
  });

  const pastEvent = await Event.create({
    title: `Past AI Meetup ${timestamp}`,
    description: 'Meetup held yesterday',
    category: 'Technical',
    venue: 'Room 101',
    startDateTime: pastStart,
    endDateTime: pastEnd,
    registrationDeadline: pastStart,
    capacity: 50,
    registeredCount: 1,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
  });

  const draftEvent = await Event.create({
    title: `Draft AI Meetup ${timestamp}`,
    description: 'Draft not published',
    category: 'Technical',
    venue: 'Room 102',
    startDateTime: oneHourAgo,
    endDateTime: twoHoursLater,
    registrationDeadline: twoHoursLater,
    capacity: 50,
    registeredCount: 0,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'draft',
  });

  const eventClubB = await Event.create({
    title: `Music Fest ${timestamp}`,
    description: 'Annual music event',
    category: 'Cultural',
    venue: 'Amphitheater',
    startDateTime: oneHourAgo,
    endDateTime: twoHoursLater,
    registrationDeadline: twoHoursLater,
    capacity: 100,
    registeredCount: 1,
    club: clubB._id,
    createdBy: orgClubB._id,
    status: 'published',
  });

  // Assign Volunteer to activeEvent
  await VolunteerAssignment.create({
    event: activeEvent._id,
    user: volStudent._id,
    assignedBy: orgClubA._id,
    status: 'active',
  });

  // Setup Registrations and Tickets for activeEvent
  const reg1 = await Registration.create({
    event: activeEvent._id,
    student: attendeeStudent1._id,
    status: 'active',
  });
  const ticket1 = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: activeEvent._id,
    student: attendeeStudent1._id,
    registration: reg1._id,
    status: 'active',
  });

  const reg2 = await Registration.create({
    event: activeEvent._id,
    student: attendeeStudent2._id,
    status: 'active',
  });
  const ticket2 = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: activeEvent._id,
    student: attendeeStudent2._id,
    registration: reg2._id,
    status: 'active',
  });

  const reg3 = await Registration.create({
    event: activeEvent._id,
    student: attendeeStudent3._id,
    status: 'active',
  });
  const ticket3 = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: activeEvent._id,
    student: attendeeStudent3._id,
    registration: reg3._id,
    status: 'active',
  });

  // Cancelled Registration / Ticket on activeEvent
  const cancelledStudent = await User.create({
    name: 'Cancelled Student',
    email: `canc_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });
  const cancelledReg = await Registration.create({
    event: activeEvent._id,
    student: cancelledStudent._id,
    status: 'cancelled',
    cancelledAt: new Date(),
  });
  const cancelledTicket = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: activeEvent._id,
    student: cancelledStudent._id,
    registration: cancelledReg._id,
    status: 'cancelled',
    cancelledAt: new Date(),
  });

  // Ticket for eventClubB
  const regClubB = await Registration.create({
    event: eventClubB._id,
    student: attendeeStudent1._id,
    status: 'active',
  });
  const ticketClubB = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: eventClubB._id,
    student: attendeeStudent1._id,
    registration: regClubB._id,
    status: 'active',
  });

  // Login cookies
  async function login(email) {
    const res = await requestJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Pass@1234' }),
    });
    if (res.status !== 200) throw new Error(`Login failed for ${email}`);
    return await extractCookie(res.headers);
  }

  const adminCookie = await login(admin.email);
  const orgClubACookie = await login(orgClubA.email);
  const orgClubBCookie = await login(orgClubB.email);
  const volCookie = await login(volStudent.email);
  const otherStudentCookie = await login(otherStudent.email);

  // [Check 2] Unauthenticated access rejected
  const unauthRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: ticket1.token }),
  });
  if (unauthRes.status !== 401) {
    throw new Error(`[Check 2 Failed] Expected 401 unauthenticated, got ${unauthRes.status}`);
  }
  console.log('[Check 2 Passed] Unauthenticated check-in rejected with 401');

  // [Check 3] Non-assigned student rejected with 403 UNAUTHORIZED_CHECK_IN
  const nonAssignedRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: otherStudentCookie },
    body: JSON.stringify({ token: ticket1.token }),
  });
  if (nonAssignedRes.status !== 403 || nonAssignedRes.data?.error?.code !== 'UNAUTHORIZED_CHECK_IN') {
    throw new Error(`[Check 3 Failed] Expected 403 UNAUTHORIZED_CHECK_IN, got ${nonAssignedRes.status}`);
  }
  console.log('[Check 3 Passed] Non-assigned student rejected with 403 UNAUTHORIZED_CHECK_IN');

  // [Check 4] Organizer from Club B rejected with 403 UNAUTHORIZED_CHECK_IN
  const orgBRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: orgClubBCookie },
    body: JSON.stringify({ token: ticket1.token }),
  });
  if (orgBRes.status !== 403 || orgBRes.data?.error?.code !== 'UNAUTHORIZED_CHECK_IN') {
    throw new Error(`[Check 4 Failed] Expected 403 UNAUTHORIZED_CHECK_IN for other club organizer, got ${orgBRes.status}`);
  }
  console.log('[Check 4 Passed] Organizer from another club rejected with 403');

  // [Check 5] Invalid ticket token rejected with 400 INVALID_TICKET
  const invalidTokenRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ token: 'nonexistent_token_12345678901234567890' }),
  });
  if (invalidTokenRes.status !== 400 || invalidTokenRes.data?.error?.code !== 'INVALID_TICKET') {
    throw new Error(`[Check 5 Failed] Expected 400 INVALID_TICKET, got ${invalidTokenRes.status}`);
  }
  console.log('[Check 5 Passed] Invalid ticket token rejected with 400 INVALID_TICKET');

  // [Check 6] Ticket for different event rejected with 400 TICKET_EVENT_MISMATCH
  const mismatchRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ token: ticketClubB.token }),
  });
  if (mismatchRes.status !== 400 || mismatchRes.data?.error?.code !== 'TICKET_EVENT_MISMATCH') {
    throw new Error(`[Check 6 Failed] Expected 400 TICKET_EVENT_MISMATCH, got ${mismatchRes.status}`);
  }
  console.log('[Check 6 Passed] Ticket for different event rejected with 400 TICKET_EVENT_MISMATCH');

  // [Check 7] Cancelled ticket rejected with 400 TICKET_CANCELLED
  const cancelledRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ token: cancelledTicket.token }),
  });
  if (cancelledRes.status !== 400) {
    throw new Error(`[Check 7 Failed] Expected 400 for cancelled ticket, got ${cancelledRes.status}`);
  }
  console.log('[Check 7 Passed] Cancelled ticket rejected with 400');

  // [Check 8] Check-in before startDateTime rejected with 400 CHECK_IN_NOT_STARTED
  const futureReg = await Registration.create({
    event: futureEvent._id,
    student: attendeeStudent1._id,
    status: 'active',
  });
  const futureTicket = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: futureEvent._id,
    student: attendeeStudent1._id,
    registration: futureReg._id,
    status: 'active',
  });
  const futureRes = await requestJson(`${API_BASE}/events/${futureEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ token: futureTicket.token }),
  });
  if (futureRes.status !== 400 || futureRes.data?.error?.code !== 'CHECK_IN_NOT_STARTED') {
    throw new Error(`[Check 8 Failed] Expected 400 CHECK_IN_NOT_STARTED, got ${futureRes.status} (${futureRes.data?.error?.code})`);
  }
  console.log('[Check 8 Passed] Check-in before startDateTime rejected with 400 CHECK_IN_NOT_STARTED');

  // [Check 9] Check-in after endDateTime rejected with 400 CHECK_IN_CLOSED
  const pastReg = await Registration.create({
    event: pastEvent._id,
    student: attendeeStudent1._id,
    status: 'active',
  });
  const pastTicket = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: pastEvent._id,
    student: attendeeStudent1._id,
    registration: pastReg._id,
    status: 'active',
  });
  const pastRes = await requestJson(`${API_BASE}/events/${pastEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ token: pastTicket.token }),
  });
  if (pastRes.status !== 400 || pastRes.data?.error?.code !== 'CHECK_IN_CLOSED') {
    throw new Error(`[Check 9 Failed] Expected 400 CHECK_IN_CLOSED, got ${pastRes.status} (${pastRes.data?.error?.code})`);
  }
  console.log('[Check 9 Passed] Check-in after endDateTime rejected with 400 CHECK_IN_CLOSED');

  // [Check 10] Check-in on draft event rejected with 400 EVENT_NOT_ACTIVE
  const draftRes = await requestJson(`${API_BASE}/events/${draftEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ token: ticket1.token }),
  });
  if (draftRes.status !== 400 || draftRes.data?.error?.code !== 'EVENT_NOT_ACTIVE') {
    throw new Error(`[Check 10 Failed] Expected 400 EVENT_NOT_ACTIVE, got ${draftRes.status} (${draftRes.data?.error?.code})`);
  }
  console.log('[Check 10 Passed] Check-in on draft event rejected with 400 EVENT_NOT_ACTIVE');

  // [Check 11] Volunteer performs successful QR check-in
  const volCheckInRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ token: ticket1.token }),
  });
  if (volCheckInRes.status !== 200 || !volCheckInRes.data?.success) {
    throw new Error(`[Check 11 Failed] Expected 200 check-in, got ${volCheckInRes.status}: ${JSON.stringify(volCheckInRes.data)}`);
  }
  const att1 = volCheckInRes.data.data.attendance;
  if (att1.method !== 'qr' || att1.status !== 'checked_in') {
    throw new Error(`[Check 11 Failed] Attendance method/status mismatch: ${JSON.stringify(att1)}`);
  }
  console.log('[Check 11 Passed] Assigned volunteer checked in student via QR: method qr, status checked_in');

  // [Check 12] Ticket status is updated to 'used' in database
  const dbTicket1 = await Ticket.findById(ticket1._id);
  if (dbTicket1.status !== 'used') {
    throw new Error(`[Check 12 Failed] Ticket status expected 'used', got ${dbTicket1.status}`);
  }
  console.log('[Check 12 Passed] Ticket status updated to "used" atomically');

  // [Check 13] Duplicate QR check-in rejected with 400 ALREADY_CHECKED_IN and returns existing attendance
  const dupCheckInRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ token: ticket1.token }),
  });
  if (dupCheckInRes.status !== 400 || dupCheckInRes.data?.error?.code !== 'ALREADY_CHECKED_IN') {
    throw new Error(`[Check 13 Failed] Expected 400 ALREADY_CHECKED_IN, got ${dupCheckInRes.status}`);
  }
  if (!dupCheckInRes.data?.error?.details?.existingAttendance) {
    throw new Error(`[Check 13 Failed] Expected existingAttendance in details: ${JSON.stringify(dupCheckInRes.data)}`);
  }
  console.log('[Check 13 Passed] Duplicate check-in rejected with 400 ALREADY_CHECKED_IN and returned existing attendance');

  // [Check 14] Organizer from Club A checks in student 2 via QR
  const orgCheckInRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: orgClubACookie },
    body: JSON.stringify({ token: ticket2.token }),
  });
  if (orgCheckInRes.status !== 200 || !orgCheckInRes.data?.success) {
    throw new Error(`[Check 14 Failed] Organizer QR check-in failed, got ${orgCheckInRes.status}`);
  }
  console.log('[Check 14 Passed] Club Organizer successfully checked in attendee 2 via QR');

  // [Check 15] Concurrent check-in protection test
  // Create student 4 with valid registration and ticket
  const attendeeStudent4 = await User.create({
    name: 'Attendee Four Concurrent',
    email: `attendee4_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });
  const reg4 = await Registration.create({
    event: activeEvent._id,
    student: attendeeStudent4._id,
    status: 'active',
  });
  const ticket4 = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: activeEvent._id,
    student: attendeeStudent4._id,
    registration: reg4._id,
    status: 'active',
  });

  const [concurrent1, concurrent2] = await Promise.all([
    requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: volCookie },
      body: JSON.stringify({ token: ticket4.token }),
    }),
    requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: orgClubACookie },
      body: JSON.stringify({ token: ticket4.token }),
    }),
  ]);

  const successCount = (concurrent1.status === 200 ? 1 : 0) + (concurrent2.status === 200 ? 1 : 0);
  const failureCount = (concurrent1.status === 400 ? 1 : 0) + (concurrent2.status === 400 ? 1 : 0);
  if (successCount !== 1 || failureCount !== 1) {
    throw new Error(`[Check 15 Failed] Concurrent check-in race condition failure: success=${successCount}, fail=${failureCount}`);
  }
  const attendancesFor4 = await Attendance.find({ event: activeEvent._id, student: attendeeStudent4._id });
  if (attendancesFor4.length !== 1) {
    throw new Error(`[Check 15 Failed] Expected exactly 1 Attendance document, found ${attendancesFor4.length}`);
  }
  console.log('[Check 15 Passed] Concurrent check-in: exactly 1 succeeded, 1 rejected, exactly 1 Attendance recorded');

  // [Check 16] Manual check-in by Student ID succeeds for authorized volunteer
  const attendeeStudent5 = await User.create({
    name: 'Attendee Five Manual',
    email: `attendee5_p8_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });
  const reg5 = await Registration.create({
    event: activeEvent._id,
    student: attendeeStudent5._id,
    status: 'active',
  });
  const ticket5 = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: activeEvent._id,
    student: attendeeStudent5._id,
    registration: reg5._id,
    status: 'active',
  });

  const manualCheckInRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ studentId: attendeeStudent5._id.toString() }),
  });
  if (manualCheckInRes.status !== 200 || manualCheckInRes.data?.data?.attendance?.method !== 'manual') {
    throw new Error(`[Check 16 Failed] Manual check-in failed, got ${manualCheckInRes.status}`);
  }
  console.log('[Check 16 Passed] Manual check-in succeeded: method manual, status checked_in');

  // [Check 17] Manual check-in for unregistered student rejected with 404 REGISTRATION_NOT_FOUND
  const manualUnregRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ studentId: otherStudent._id.toString() }),
  });
  if (manualUnregRes.status !== 404 || manualUnregRes.data?.error?.code !== 'REGISTRATION_NOT_FOUND') {
    throw new Error(`[Check 17 Failed] Expected 404 REGISTRATION_NOT_FOUND, got ${manualUnregRes.status}`);
  }
  console.log('[Check 17 Passed] Manual check-in for unregistered student rejected with 404 REGISTRATION_NOT_FOUND');

  // [Check 18] Manual duplicate check-in rejected with 400 ALREADY_CHECKED_IN
  const manualDupRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: volCookie },
    body: JSON.stringify({ studentId: attendeeStudent5._id.toString() }),
  });
  if (manualDupRes.status !== 400 || manualDupRes.data?.error?.code !== 'ALREADY_CHECKED_IN') {
    throw new Error(`[Check 18 Failed] Expected 400 ALREADY_CHECKED_IN, got ${manualDupRes.status}`);
  }
  console.log('[Check 18 Passed] Manual duplicate check-in rejected with 400 ALREADY_CHECKED_IN');

  // [Check 19] Non-admin cannot perform admin override (403 FORBIDDEN)
  const nonAdminOverrideRes = await requestJson(
    `${API_BASE}/events/${activeEvent._id}/attendance/${attendeeStudent3._id}/override`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: volCookie },
      body: JSON.stringify({ overrideReason: 'Student phone battery died' }),
    }
  );
  if (nonAdminOverrideRes.status !== 403) {
    throw new Error(`[Check 19 Failed] Expected 403 for non-admin override, got ${nonAdminOverrideRes.status}`);
  }
  console.log('[Check 19 Passed] Non-admin attempting admin override rejected with 403 FORBIDDEN');

  // [Check 20] Admin override without reason rejected (400 INVALID_OVERRIDE_REASON)
  const emptyReasonRes = await requestJson(
    `${API_BASE}/events/${activeEvent._id}/attendance/${attendeeStudent3._id}/override`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ overrideReason: '  ' }),
    }
  );
  if (emptyReasonRes.status !== 400) {
    throw new Error(`[Check 20 Failed] Expected 400 for empty reason override, got ${emptyReasonRes.status}`);
  }
  console.log('[Check 20 Passed] Admin override with blank reason rejected with 400');

  // [Check 21] Admin override succeeds with valid reason
  const overrideRes = await requestJson(
    `${API_BASE}/events/${activeEvent._id}/attendance/${attendeeStudent3._id}/override`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ overrideReason: 'Student phone damaged at gate, verified physical ID' }),
    }
  );
  if (overrideRes.status !== 200 || !overrideRes.data?.success) {
    throw new Error(`[Check 21 Failed] Admin override failed, got ${overrideRes.status}`);
  }
  const overrideAtt = overrideRes.data.data.attendance;
  if (
    overrideAtt.method !== 'admin_override' ||
    overrideAtt.status !== 'overridden' ||
    overrideAtt.overrideReason !== 'Student phone damaged at gate, verified physical ID'
  ) {
    throw new Error(`[Check 21 Failed] Override attributes mismatch: ${JSON.stringify(overrideAtt)}`);
  }
  const dbTicket3 = await Ticket.findById(ticket3._id);
  if (dbTicket3.status !== 'used') {
    throw new Error(`[Check 21 Failed] Ticket 3 should be marked used by override, got ${dbTicket3.status}`);
  }
  console.log('[Check 21 Passed] Admin override successful: method admin_override, status overridden, reason preserved, ticket marked used');

  // [Check 22] Search registered attendees returns matches and check-in statuses
  const searchAttendeesRes = await requestJson(
    `${API_BASE}/events/${activeEvent._id}/attendance/search?search=${encodeURIComponent(attendeeStudent1.name)}`,
    {
      method: 'GET',
      headers: { Cookie: volCookie },
    }
  );
  if (searchAttendeesRes.status !== 200 || !searchAttendeesRes.data?.data?.attendees) {
    throw new Error(`[Check 22 Failed] Search attendees failed, got ${searchAttendeesRes.status}`);
  }
  const attendeesList = searchAttendeesRes.data.data.attendees;
  if (attendeesList.length === 0 || !attendeesList[0].isCheckedIn) {
    throw new Error(`[Check 22 Failed] Attendee 1 should be checked in: ${JSON.stringify(attendeesList)}`);
  }
  console.log('[Check 22 Passed] Search registered attendees returned attendee with isCheckedIn: true');

  // [Check 23] Attendance list endpoint returns paginated records and filters
  const listRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance?page=1&limit=10`, {
    method: 'GET',
    headers: { Cookie: volCookie },
  });
  if (listRes.status !== 200 || !listRes.data?.data?.records) {
    throw new Error(`[Check 23 Failed] Attendance list failed, got ${listRes.status}`);
  }
  const { records, stats } = listRes.data.data;
  if (records.length < 4 || stats.totalCheckedIn < 4) {
    throw new Error(`[Check 23 Failed] Expected at least 4 attendance records, got ${records.length}`);
  }
  console.log(`[Check 23 Passed] Attendance list returned ${records.length} records, totalCheckedIn: ${stats.totalCheckedIn}`);

  // [Check 24] Attendance stats endpoint returns breakdown and rates
  const statsRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/stats`, {
    method: 'GET',
    headers: { Cookie: volCookie },
  });
  if (statsRes.status !== 200 || !statsRes.data?.data) {
    throw new Error(`[Check 24 Failed] Attendance stats failed, got ${statsRes.status}`);
  }
  const statData = statsRes.data.data;
  if (
    typeof statData.totalCheckedIn !== 'number' ||
    typeof statData.checkInRate !== 'number' ||
    !statData.byMethod ||
    statData.byMethod.qr < 2 ||
    statData.byMethod.manual < 1 ||
    statData.byMethod.admin_override < 1
  ) {
    throw new Error(`[Check 24 Failed] Stats breakdown mismatch: ${JSON.stringify(statData)}`);
  }
  console.log(`[Check 24 Passed] Attendance stats: totalCheckedIn=${statData.totalCheckedIn}, rate=${statData.checkInRate}%, QR=${statData.byMethod.qr}, manual=${statData.byMethod.manual}, override=${statData.byMethod.admin_override}`);

  // [Check 25] Non-assigned volunteer or student cannot view attendance list or stats
  const forbidListRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance`, {
    method: 'GET',
    headers: { Cookie: otherStudentCookie },
  });
  if (forbidListRes.status !== 403) {
    throw new Error(`[Check 25 Failed] Expected 403 for unauthorized attendance list, got ${forbidListRes.status}`);
  }
  const forbidStatsRes = await requestJson(`${API_BASE}/events/${activeEvent._id}/attendance/stats`, {
    method: 'GET',
    headers: { Cookie: otherStudentCookie },
  });
  if (forbidStatsRes.status !== 403) {
    throw new Error(`[Check 25 Failed] Expected 403 for unauthorized attendance stats, got ${forbidStatsRes.status}`);
  }
  console.log('[Check 25 Passed] Unauthorized users strictly forbidden from accessing attendance list and stats');

  console.log('\n======================================================');
  console.log(' ALL 25 PHASE 8 BACKEND VERIFICATION CHECKS PASSED! ');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err.message);
  process.exit(1);
});
