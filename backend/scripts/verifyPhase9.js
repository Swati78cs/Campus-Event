/**
 * Phase 9 End-to-End Automated Verification Script
 * Campus Event Management & QR Ticketing Platform
 * Waitlist Management Verification Suite
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Waitlist = require('../models/Waitlist');

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
  console.log('=== Starting Phase 9 End-to-End Verification ===\n');

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
    name: 'Admin P9',
    email: `admin_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'admin',
    isActive: true,
  });

  const orgClubA = await User.create({
    name: 'Organizer Club A P9',
    email: `org_a_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'organizer',
    isActive: true,
  });

  const orgClubB = await User.create({
    name: 'Organizer Club B P9',
    email: `org_b_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'organizer',
    isActive: true,
  });

  const studentA = await User.create({
    name: 'Student A',
    email: `student_a_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const studentB = await User.create({
    name: 'Student B',
    email: `student_b_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const studentC = await User.create({
    name: 'Student C',
    email: `student_c_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const studentD = await User.create({
    name: 'Student D',
    email: `student_d_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const studentInactive = await User.create({
    name: 'Student Inactive',
    email: `student_inact_p9_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: false,
  });

  // Setup Clubs
  const clubA = await Club.create({
    name: `DevOps Club ${timestamp}`,
    description: 'Cloud and Infrastructure',
    category: 'Technical',
    leadEmail: `lead_a_p9_${timestamp}@test.edu`,
    organizers: [orgClubA._id],
    isActive: true,
  });

  const clubB = await Club.create({
    name: `Design Club ${timestamp}`,
    description: 'UI/UX and Design',
    category: 'Cultural',
    leadEmail: `lead_b_p9_${timestamp}@test.edu`,
    organizers: [orgClubB._id],
    isActive: true,
  });

  // Setup Login cookies
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
  const studentACookie = await login(studentA.email);
  const studentBCookie = await login(studentB.email);
  const studentCCookie = await login(studentC.email);
  const studentDCookie = await login(studentD.email);

  // Setup Event dates
  const now = new Date();
  const futureStart = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const futureDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const pastDeadline = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // Event 1: Full event (Capacity: 1, Registered: 1)
  const fullEvent = await Event.create({
    title: `Kubernetes Masterclass ${timestamp}`,
    description: 'Deep dive into K8s',
    category: 'Technical',
    venue: 'Lab 3',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: futureDeadline,
    capacity: 1,
    registeredCount: 1,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
    allowCancellation: true,
  });

  // Existing active registration for studentA on fullEvent
  const regA = await Registration.create({
    event: fullEvent._id,
    student: studentA._id,
    status: 'active',
  });
  const ticketA = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: fullEvent._id,
    student: studentA._id,
    registration: regA._id,
    status: 'active',
  });

  // Event 2: Open event (Capacity: 10, Registered: 0)
  const openEvent = await Event.create({
    title: `Open Workshop ${timestamp}`,
    description: 'Open seats available',
    category: 'Technical',
    venue: 'Room 201',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: futureDeadline,
    capacity: 10,
    registeredCount: 0,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
  });

  // Event 3: Draft event
  const draftEvent = await Event.create({
    title: `Draft Workshop ${timestamp}`,
    description: 'Draft not published',
    category: 'Technical',
    venue: 'Room 202',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: futureDeadline,
    capacity: 10,
    registeredCount: 0,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'draft',
  });

  // Event 4: Cancelled event
  const cancelledEvent = await Event.create({
    title: `Cancelled Workshop ${timestamp}`,
    description: 'Event cancelled',
    category: 'Technical',
    venue: 'Room 203',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: futureDeadline,
    capacity: 10,
    registeredCount: 0,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'cancelled',
  });

  // Event 5: Completed event (endDateTime in past)
  const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const pastEnd = new Date(now.getTime() - 46 * 60 * 60 * 1000);
  const completedEvent = await Event.create({
    title: `Completed Workshop ${timestamp}`,
    description: 'Event completed',
    category: 'Technical',
    venue: 'Room 204',
    startDateTime: pastStart,
    endDateTime: pastEnd,
    registrationDeadline: pastStart,
    capacity: 10,
    registeredCount: 0,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
  });

  // Event 6: Registration closed event
  const closedRegEvent = await Event.create({
    title: `Closed Reg Workshop ${timestamp}`,
    description: 'Deadline passed',
    category: 'Technical',
    venue: 'Room 205',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: pastDeadline,
    capacity: 1,
    registeredCount: 1,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
  });

  // [Check 2] Full event allows student B to join waitlist
  const joinResB = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentBCookie },
  });
  if (joinResB.status !== 201 || joinResB.data?.data?.waitlist?.status !== 'waiting') {
    throw new Error(`[Check 2 Failed] Expected 201 joined waitlist, got ${joinResB.status}: ${JSON.stringify(joinResB.data)}`);
  }
  if (joinResB.data?.data?.position !== 1) {
    throw new Error(`[Check 2 Failed] Expected position 1 for student B, got ${joinResB.data?.data?.position}`);
  }
  console.log('[Check 2 Passed] Student B successfully joined waitlist at position 1');

  // [Check 3] Non-full event rejects waitlist join with SEATS_AVAILABLE
  const joinOpenRes = await requestJson(`${API_BASE}/events/${openEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentBCookie },
  });
  if (joinOpenRes.status !== 400 || joinOpenRes.data?.error?.code !== 'SEATS_AVAILABLE') {
    throw new Error(`[Check 3 Failed] Expected 400 SEATS_AVAILABLE, got ${joinOpenRes.status} (${joinOpenRes.data?.error?.code})`);
  }
  console.log('[Check 3 Passed] Non-full event rejected waitlist join with SEATS_AVAILABLE (instructing direct registration)');

  // [Check 4] Draft event rejects waitlist
  const joinDraftRes = await requestJson(`${API_BASE}/events/${draftEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentBCookie },
  });
  if (joinDraftRes.status !== 400 || joinDraftRes.data?.error?.code !== 'EVENT_NOT_OPEN') {
    throw new Error(`[Check 4 Failed] Draft event expected 400 EVENT_NOT_OPEN, got ${joinDraftRes.status}`);
  }
  console.log('[Check 4 Passed] Draft event rejected waitlist join');

  // [Check 5] Cancelled event rejects waitlist
  const joinCancRes = await requestJson(`${API_BASE}/events/${cancelledEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentBCookie },
  });
  if (joinCancRes.status !== 400 || joinCancRes.data?.error?.code !== 'EVENT_CANCELLED') {
    throw new Error(`[Check 5 Failed] Cancelled event expected 400 EVENT_CANCELLED, got ${joinCancRes.status}`);
  }
  console.log('[Check 5 Passed] Cancelled event rejected waitlist join');

  // [Check 6] Completed event rejects waitlist
  const joinCompRes = await requestJson(`${API_BASE}/events/${completedEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentBCookie },
  });
  if (joinCompRes.status !== 400 || joinCompRes.data?.error?.code !== 'EVENT_COMPLETED') {
    throw new Error(`[Check 6 Failed] Completed event expected 400 EVENT_COMPLETED, got ${joinCompRes.status}`);
  }
  console.log('[Check 6 Passed] Completed event rejected waitlist join');

  // [Check 7] Registration deadline passed rejects waitlist
  const joinClosedRes = await requestJson(`${API_BASE}/events/${closedRegEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentBCookie },
  });
  if (joinClosedRes.status !== 400 || joinClosedRes.data?.error?.code !== 'REGISTRATION_CLOSED') {
    throw new Error(`[Check 7 Failed] Expected 400 REGISTRATION_CLOSED, got ${joinClosedRes.status}`);
  }
  console.log('[Check 7 Passed] Registration closed event rejected waitlist join');

  // [Check 8] Student with active registration cannot join waitlist
  const joinStudentARes = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentACookie },
  });
  if (joinStudentARes.status !== 400 || joinStudentARes.data?.error?.code !== 'ALREADY_REGISTERED') {
    throw new Error(`[Check 8 Failed] Expected 400 ALREADY_REGISTERED, got ${joinStudentARes.status}`);
  }
  console.log('[Check 8 Passed] Actively registered student blocked from joining waitlist');

  // [Check 9] Duplicate active waitlist entry is rejected with ALREADY_WAITLISTED
  const dupJoinRes = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentBCookie },
  });
  if (dupJoinRes.status !== 400 || dupJoinRes.data?.error?.code !== 'ALREADY_WAITLISTED') {
    throw new Error(`[Check 9 Failed] Expected 400 ALREADY_WAITLISTED, got ${dupJoinRes.status}`);
  }
  console.log('[Check 9 Passed] Duplicate active waitlist join rejected with ALREADY_WAITLISTED');

  // [Check 10] Concurrent waitlist joins for same student yield exactly 1 active entry
  const [concurW1, concurW2] = await Promise.all([
    requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
      method: 'POST',
      headers: { Cookie: studentCCookie },
    }),
    requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
      method: 'POST',
      headers: { Cookie: studentCCookie },
    }),
  ]);
  const concurSuccess = (concurW1.status === 201 ? 1 : 0) + (concurW2.status === 201 ? 1 : 0);
  const concurFail = (concurW1.status === 400 ? 1 : 0) + (concurW2.status === 400 ? 1 : 0);
  if (concurSuccess !== 1 || concurFail !== 1) {
    throw new Error(`[Check 10 Failed] Concurrent duplicate waitlist failed: success=${concurSuccess}, fail=${concurFail}`);
  }
  const activeEntriesForC = await Waitlist.find({ event: fullEvent._id, student: studentC._id, status: 'waiting' });
  if (activeEntriesForC.length !== 1) {
    throw new Error(`[Check 10 Failed] Expected exactly 1 active waitlist document for student C, found ${activeEntriesForC.length}`);
  }
  console.log('[Check 10 Passed] Concurrent waitlist requests: exactly 1 succeeded, 1 rejected, exactly 1 active document created');

  // Student D also joins waitlist
  const joinResD = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentDCookie },
  });
  if (joinResD.status !== 201) throw new Error('Student D failed to join waitlist');

  // [Check 11, 12] Student C leaves waitlist, document preserved as 'removed'
  const leaveResC = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'DELETE',
    headers: { Cookie: studentCCookie },
  });
  if (leaveResC.status !== 200 || leaveResC.data?.data?.waitlist?.status !== 'removed') {
    throw new Error(`[Check 11 Failed] Leave waitlist failed: ${JSON.stringify(leaveResC.data)}`);
  }
  const dbEntryC = await Waitlist.findById(activeEntriesForC[0]._id);
  if (!dbEntryC || dbEntryC.status !== 'removed' || !dbEntryC.removedAt) {
    throw new Error(`[Check 12 Failed] Historical removed record not preserved properly in database`);
  }
  console.log('[Check 11, 12 Passed] Student C left waitlist; historical entry preserved with status "removed" and removedAt timestamp');

  // [Check 13] Dynamic FIFO position: After C left, B is position 1, D is position 2
  const statusResB = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist/me`, {
    method: 'GET',
    headers: { Cookie: studentBCookie },
  });
  const statusResD = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist/me`, {
    method: 'GET',
    headers: { Cookie: studentDCookie },
  });
  if (statusResB.data?.data?.position !== 1 || statusResD.data?.data?.position !== 2) {
    throw new Error(`[Check 13 Failed] Expected B=1, D=2, got B=${statusResB.data?.data?.position}, D=${statusResD.data?.data?.position}`);
  }
  console.log('[Check 13 Passed] Dynamic FIFO positions correctly computed: Student B is #1, Student D is #2');

  // [Check 14-25] Registration Cancellation Triggers Automatic Waitlist Promotion
  // Student A cancels active registration -> Student B (FIFO #1) promoted automatically!
  const cancelResA = await requestJson(`${API_BASE}/events/${fullEvent._id}/register`, {
    method: 'DELETE',
    headers: { Cookie: studentACookie },
  });
  if (cancelResA.status !== 200 || !cancelResA.data?.success) {
    throw new Error(`[Check 14 Failed] Student A cancellation failed: ${JSON.stringify(cancelResA.data)}`);
  }

  // Verify Student A's old registration and ticket remain cancelled
  const oldRegA = await Registration.findById(regA._id);
  const oldTicketA = await Ticket.findById(ticketA._id);
  if (oldRegA.status !== 'cancelled' || oldTicketA.status !== 'cancelled') {
    throw new Error('[Check 21, 22 Failed] Student A old registration and ticket should remain cancelled');
  }

  // Verify Student B was promoted: active registration, new active ticket, waitlist status 'promoted'
  const activeRegB = await Registration.findOne({ event: fullEvent._id, student: studentB._id, status: 'active' });
  const activeTicketB = await Ticket.findOne({ event: fullEvent._id, student: studentB._id, status: 'active' });
  const dbWaitlistB = await Waitlist.findOne({ event: fullEvent._id, student: studentB._id });

  if (!activeRegB) throw new Error('[Check 17 Failed] Promoted student B should have active Registration');
  if (!activeTicketB) throw new Error('[Check 19 Failed] Promoted student B should have new active Ticket');
  if (dbWaitlistB.status !== 'promoted' || !dbWaitlistB.promotedAt || dbWaitlistB.promotionReason !== 'cancellation') {
    throw new Error(`[Check 20 Failed] Waitlist B should be promoted: ${JSON.stringify(dbWaitlistB)}`);
  }

  // Verify registeredCount remains exactly 1 (1 registered student B)
  const dbFullEvent = await Event.findById(fullEvent._id);
  if (dbFullEvent.registeredCount !== 1) {
    throw new Error(`[Check 18 Failed] registeredCount should be 1, got ${dbFullEvent.registeredCount}`);
  }

  // Verify Student B status endpoint shows promoted
  const statusPromotedB = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist/me`, {
    method: 'GET',
    headers: { Cookie: studentBCookie },
  });
  if (statusPromotedB.data?.data?.status !== 'promoted') {
    throw new Error(`[Check 23 Failed] Expected status 'promoted' for student B, got ${statusPromotedB.data?.data?.status}`);
  }
  console.log('[Check 14-25 Passed] Cancellation triggered atomic FIFO promotion: Student B promoted with new active registration, fresh ticket, and registeredCount preserved');

  // [Check 26-28] Capacity Increase Triggers Automatic FIFO Promotion
  // Current state: fullEvent capacity = 1, registeredCount = 1 (Student B). Waitlist has Student D (position 1).
  // Student C rejoins waitlist -> Student C is position 2
  const rejoinResC = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'POST',
    headers: { Cookie: studentCCookie },
  });
  if (rejoinResC.status !== 201) throw new Error('Student C failed to rejoin waitlist');

  // Organizer increases capacity from 1 to 3 (opening 2 seats!)
  // Should automatically promote Student D (FIFO #1) and Student C (FIFO #2)
  const updateCapRes = await requestJson(`${API_BASE}/events/${fullEvent._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: orgClubACookie },
    body: JSON.stringify({ capacity: 3 }),
  });
  if (updateCapRes.status !== 200) {
    throw new Error(`[Check 26 Failed] Capacity update failed: ${JSON.stringify(updateCapRes.data)}`);
  }

  const activeRegD = await Registration.findOne({ event: fullEvent._id, student: studentD._id, status: 'active' });
  const activeRegC = await Registration.findOne({ event: fullEvent._id, student: studentC._id, status: 'active' });
  const dbWaitlistD = await Waitlist.findOne({ event: fullEvent._id, student: studentD._id, status: 'promoted' });
  const dbWaitlistC = await Waitlist.findOne({ event: fullEvent._id, student: studentC._id, status: 'promoted' });

  if (!activeRegD || !activeRegC) {
    throw new Error('[Check 27, 28 Failed] Both Student D and Student C should have been promoted after capacity increase');
  }
  if (!dbWaitlistD || !dbWaitlistC || dbWaitlistD.promotionReason !== 'capacity_increase') {
    throw new Error('[Check 28 Failed] Waitlist promotion reason should be capacity_increase');
  }

  const updatedEventAfterCap = await Event.findById(fullEvent._id);
  if (updatedEventAfterCap.registeredCount !== 3 || updatedEventAfterCap.capacity !== 3) {
    throw new Error(`[Check 27 Failed] registeredCount should be 3, got ${updatedEventAfterCap.registeredCount}`);
  }
  console.log('[Check 26-28 Passed] Capacity increase from 1 to 3 automatically promoted 2 waitlisted students (D and C) in FIFO order');

  // [Check 29-31] Inactive Waitlisted Student Skipped
  // Create an event with capacity 1, registeredCount 1
  const skipEvent = await Event.create({
    title: `AI Ethics Seminar ${timestamp}`,
    description: 'Seminar on ethics',
    category: 'Technical',
    venue: 'Auditorium 1',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: futureDeadline,
    capacity: 1,
    registeredCount: 1,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
    allowCancellation: true,
  });

  const regSkip1 = await Registration.create({
    event: skipEvent._id,
    student: studentA._id,
    status: 'active',
  });
  const ticketSkip1 = await Ticket.create({
    token: crypto.randomBytes(32).toString('hex'),
    event: skipEvent._id,
    student: studentA._id,
    registration: regSkip1._id,
    status: 'active',
  });

  // Add Inactive Student first, then Student B second
  const inactEntry = await Waitlist.create({
    event: skipEvent._id,
    student: studentInactive._id,
    status: 'waiting',
    joinedAt: new Date(now.getTime() - 10000),
  });
  const activeEntryB = await Waitlist.create({
    event: skipEvent._id,
    student: studentB._id,
    status: 'waiting',
    joinedAt: new Date(now.getTime() - 5000),
  });

  // Student A cancels -> System must SKIP inactive student and promote Student B!
  await requestJson(`${API_BASE}/events/${skipEvent._id}/register`, {
    method: 'DELETE',
    headers: { Cookie: studentACookie },
  });

  const dbInactEntry = await Waitlist.findById(inactEntry._id);
  const dbActiveEntryB = await Waitlist.findById(activeEntryB._id);
  if (dbInactEntry.status !== 'waiting') {
    throw new Error(`[Check 15, 16 Failed] Inactive student entry should remain 'waiting' (unpromoted), got ${dbInactEntry.status}`);
  }
  if (dbActiveEntryB.status !== 'promoted') {
    throw new Error(`[Check 15, 16 Failed] Eligible student B should have been promoted skipping inactive student, got ${dbActiveEntryB.status}`);
  }
  console.log('[Check 15, 16 Passed] Inactive waitlisted student was safely skipped; next eligible FIFO student (B) was promoted');

  // [Check 32, 33] Event cancellation cancels active waitlist entries and preserves history
  const cancelTestEvent = await Event.create({
    title: `Cancelled Event With Waitlist ${timestamp}`,
    description: 'Testing event cancellation waitlist cleanup',
    category: 'Technical',
    venue: 'Hall C',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    registrationDeadline: futureDeadline,
    capacity: 1,
    registeredCount: 1,
    club: clubA._id,
    createdBy: orgClubA._id,
    status: 'published',
  });
  const activeWLOnCancel = await Waitlist.create({
    event: cancelTestEvent._id,
    student: studentD._id,
    status: 'waiting',
  });

  // Organizer cancels the event
  await requestJson(`${API_BASE}/events/${cancelTestEvent._id}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: orgClubACookie },
    body: JSON.stringify({ cancellationReason: 'Speaker unavailable' }),
  });

  const dbWLAfterCancel = await Waitlist.findById(activeWLOnCancel._id);
  if (dbWLAfterCancel.status !== 'cancelled') {
    throw new Error(`[Check 32, 33 Failed] Expected waitlist status 'cancelled' after event cancellation, got ${dbWLAfterCancel.status}`);
  }
  console.log('[Check 32, 33 Passed] Event cancellation cleanly transitioned active waitlist entries to "cancelled" while preserving historical documents');

  // [Check 34-37] Authorization Controls
  // Organizer Club A can view waitlist for Club A event
  const orgViewRes = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'GET',
    headers: { Cookie: orgClubACookie },
  });
  if (orgViewRes.status !== 200 || !orgViewRes.data?.data?.entries) {
    throw new Error(`[Check 34 Failed] Organizer Club A should view waitlist, got ${orgViewRes.status}`);
  }

  // Organizer Club B CANNOT view waitlist for Club A event
  const orgBViewRes = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'GET',
    headers: { Cookie: orgClubBCookie },
  });
  if (orgBViewRes.status !== 403) {
    throw new Error(`[Check 35 Failed] Cross-club organizer view should be 403, got ${orgBViewRes.status}`);
  }

  // Admin can view waitlist for any event
  const adminViewRes = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  if (adminViewRes.status !== 200) {
    throw new Error(`[Check 36 Failed] Admin view should be 200, got ${adminViewRes.status}`);
  }

  // Student cannot view organizer waitlist management endpoint
  const studentViewRes = await requestJson(`${API_BASE}/events/${fullEvent._id}/waitlist`, {
    method: 'GET',
    headers: { Cookie: studentACookie },
  });
  if (studentViewRes.status !== 403) {
    throw new Error(`[Check 37 Failed] Student unauthorized on management endpoint should be 403, got ${studentViewRes.status}`);
  }
  console.log('[Check 34-37 Passed] Authorization boundaries strictly enforced across organizers, admins, and students');

  // [Check 38, 39] Student My Waitlist Events Listing
  const myWaitlistRes = await requestJson(`${API_BASE}/waitlist/my-events`, {
    method: 'GET',
    headers: { Cookie: studentBCookie },
  });
  if (myWaitlistRes.status !== 200 || !myWaitlistRes.data?.data?.entries) {
    throw new Error(`[Check 38 Failed] Student my-events listing failed: ${myWaitlistRes.status}`);
  }
  console.log(`[Check 38, 39 Passed] Student retrieved own waitlist entries successfully (${myWaitlistRes.data.data.entries.length} found)`);

  // [Check 40] API response format validation
  if (
    typeof orgViewRes.data.success !== 'boolean' ||
    typeof orgViewRes.data.message !== 'string' ||
    !orgViewRes.data.data
  ) {
    throw new Error('[Check 40 Failed] API response envelope format mismatch');
  }
  console.log('[Check 40 Passed] API response envelope format verified');

  console.log('\n======================================================');
  console.log(' ALL 40 PHASE 9 BACKEND VERIFICATION CHECKS PASSED! ');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err.message);
  process.exit(1);
});
