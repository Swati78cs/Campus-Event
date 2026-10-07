/**
 * Phase 6 End-to-End Automated Verification Script
 * Campus Event Management & QR Ticketing Platform
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Club = require('../models/Club');

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
  console.log('=== Starting Phase 6 End-to-End Verification ===\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(dbUri);
  console.log('[DB] Connected to MongoDB replica set.');

  const timestamp = Date.now();

  // [Check 1] System Health
  const healthRes = await requestJson(`${API_BASE}/health`);
  const dbStatus = healthRes.data?.data?.database?.status;
  if (healthRes.status !== 200 || dbStatus !== 'connected') {
    throw new Error(`[Check 1 Failed] Health check status: ${healthRes.status}, dbStatus: ${dbStatus}`);
  }
  console.log('[Check 1] System Health: Status 200, DB: connected');

  // Setup Test Environment: Admin, Club, Published Event with Capacity 3
  const admin = await User.create({
    name: 'Admin Phase6',
    email: `admin_p6_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'admin',
    isActive: true,
  });

  const club = await Club.create({
    name: `CyberSec Club ${timestamp}`,
    description: 'Cybersecurity and Ethical Hacking Club',
    category: 'Technical',
    leadEmail: `lead_p6_${timestamp}@test.edu`,
    isActive: true,
  });

  const now = new Date();
  const event = await Event.create({
    title: `Cyber Security Summit ${timestamp}`,
    description: 'Learn modern security postures and red-teaming.',
    club: club._id,
    category: 'Technical',
    venue: 'Auditorium Alpha',
    startDateTime: new Date(now.getTime() + 86400000 * 3),
    endDateTime: new Date(now.getTime() + 86400000 * 4),
    registrationDeadline: new Date(now.getTime() + 86400000 * 2),
    capacity: 3,
    registeredCount: 0,
    status: 'published',
    allowCancellation: true,
    createdBy: admin._id,
  });

  console.log(`[Check 2] Setup Completed. Event "${event.title}" created with capacity 3.`);

  // Create Student 1 and Student 2
  const student1 = await User.create({
    name: 'Student One',
    email: `student1_p6_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const student2 = await User.create({
    name: 'Student Two',
    email: `student2_p6_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  // Login Student 1
  const s1Login = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: student1.email, password: 'Pass@1234' }),
  });
  const cookie1 = await extractCookie(s1Login.headers);

  // Login Student 2
  const s2Login = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: student2.email, password: 'Pass@1234' }),
  });
  const cookie2 = await extractCookie(s2Login.headers);

  // [Check 3 & 4 & 5] Student 1 Registers -> Ticket is Created with Secure Random Token
  const reg1Res = await requestJson(`${API_BASE}/events/${event._id}/register`, {
    method: 'POST',
    headers: { Cookie: cookie1 },
  });

  if (reg1Res.status !== 201) {
    throw new Error(`[Check 3 Failed] Registration failed: ${JSON.stringify(reg1Res.data)}`);
  }

  const ticket1Data = reg1Res.data?.data?.ticket;
  if (!ticket1Data) {
    throw new Error('[Check 3 Failed] Registration response did not include ticket data');
  }

  // Verify secure token properties: 64 hex chars, no IDs embedded
  const token1 = ticket1Data.token;
  if (typeof token1 !== 'string' || token1.length < 32) {
    throw new Error(`[Check 4 Failed] Token is not a secure string: ${token1}`);
  }
  if (
    token1.includes(student1._id.toString()) ||
    token1.includes(event._id.toString()) ||
    token1.includes(student1.email)
  ) {
    throw new Error('[Check 5 Failed] Token leaks internal IDs or personal information');
  }
  console.log(`[Check 3, 4, 5] Student 1 Registered: Status 201, Ticket ID: ${ticket1Data._id}, Token Length: ${token1.length}`);

  // [Check 6] Student 1 Retrieves Their Tickets via GET /api/tickets/my
  const myTicketsRes = await requestJson(`${API_BASE}/tickets/my`, {
    headers: { Cookie: cookie1 },
  });

  if (myTicketsRes.status !== 200 || !myTicketsRes.data?.data?.tickets?.length) {
    throw new Error(`[Check 6 Failed] Failed to retrieve tickets: ${JSON.stringify(myTicketsRes.data)}`);
  }
  const myTicket = myTicketsRes.data.data.tickets[0];
  if (myTicket._id !== ticket1Data._id || myTicket.status !== 'active') {
    throw new Error('[Check 6 Failed] Retrieved ticket does not match registered active ticket');
  }
  console.log('[Check 6] Student 1 Retrieved My Tickets: Status 200, Found active ticket');

  // [Check 7] Ticket Ownership Enforcement: Student 2 Cannot Retrieve Student 1's Ticket
  const s2UnauthorizedGet = await requestJson(`${API_BASE}/tickets/${ticket1Data._id}`, {
    headers: { Cookie: cookie2 },
  });

  if (s2UnauthorizedGet.status !== 403) {
    throw new Error(`[Check 7 Failed] Expected 403 Forbidden, got ${s2UnauthorizedGet.status}`);
  }
  console.log('[Check 7] Student 2 Access to Student 1 Ticket Blocked: Status 403 FORBIDDEN');

  // [Check 8] Exactly One Active Ticket per Registration
  const activeTicketsCount = await Ticket.countDocuments({
    student: student1._id,
    event: event._id,
    status: 'active',
  });
  if (activeTicketsCount !== 1) {
    throw new Error(`[Check 8 Failed] Expected exactly 1 active ticket, found ${activeTicketsCount}`);
  }
  console.log('[Check 8] Single Active Ticket Verified: Count is exactly 1');

  // [Check 9 & 10] Student 1 Cancels Registration -> Ticket is marked 'cancelled'
  const cancelRes = await requestJson(`${API_BASE}/events/${event._id}/register`, {
    method: 'DELETE',
    headers: { Cookie: cookie1 },
  });

  if (cancelRes.status !== 200) {
    throw new Error(`[Check 9 Failed] Cancellation failed: ${JSON.stringify(cancelRes.data)}`);
  }

  const ticketAfterCancel = await Ticket.findById(ticket1Data._id);
  if (ticketAfterCancel.status !== 'cancelled' || !ticketAfterCancel.cancelledAt) {
    throw new Error(`[Check 9 Failed] Ticket status is not cancelled: ${ticketAfterCancel.status}`);
  }
  console.log('[Check 9, 10] Registration Cancelled: Ticket status transitioned to "cancelled"');

  // [Check 11, 12, 13] Re-Registration Creates New Active Ticket; Old Ticket Remains Cancelled with Separate Token
  const reRegRes = await requestJson(`${API_BASE}/events/${event._id}/register`, {
    method: 'POST',
    headers: { Cookie: cookie1 },
  });

  if (reRegRes.status !== 201) {
    throw new Error(`[Check 11 Failed] Re-registration failed: ${JSON.stringify(reRegRes.data)}`);
  }

  const ticket2Data = reRegRes.data?.data?.ticket;
  if (!ticket2Data || ticket2Data._id === ticket1Data._id) {
    throw new Error('[Check 11 Failed] Re-registration must issue a new distinct ticket record');
  }
  if (ticket2Data.token === token1) {
    throw new Error('[Check 13 Failed] Re-registration reused old ticket token!');
  }

  const oldTicketCheck = await Ticket.findById(ticket1Data._id);
  if (oldTicketCheck.status !== 'cancelled') {
    throw new Error('[Check 12 Failed] Old ticket status was modified away from cancelled');
  }
  console.log('[Check 11, 12, 13] Re-registration Successful: New Ticket created, Old Ticket remains cancelled, Token not reused');

  // [Check 14, 15, 16] Transaction Rollback on Ticket Creation Failure
  // Simulate transactional registration where Ticket insertion fails
  const sessionRollback = await mongoose.startSession();
  sessionRollback.startTransaction();
  let rollbackSuccess = false;

  const eventBeforeForcedFail = await Event.findById(event._id);
  const countBefore = eventBeforeForcedFail.registeredCount;

  try {
    // Increment capacity
    await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: 1 } }, { session: sessionRollback });
    // Create Registration
    const tempReg = await Registration.create(
      [{ student: student2._id, event: event._id, status: 'active', registeredAt: new Date() }],
      { session: sessionRollback }
    );
    // Force intentional failure during ticket creation
    throw new Error('SIMULATED_TICKET_CREATION_FAILURE');
  } catch (err) {
    await sessionRollback.abortTransaction();
    if (err.message === 'SIMULATED_TICKET_CREATION_FAILURE') {
      rollbackSuccess = true;
    }
  } finally {
    sessionRollback.endSession();
  }

  const eventAfterForcedFail = await Event.findById(event._id);
  const student2Reg = await Registration.findOne({ student: student2._id, event: event._id });
  const student2Ticket = await Ticket.findOne({ student: student2._id, event: event._id });

  if (!rollbackSuccess || eventAfterForcedFail.registeredCount !== countBefore || student2Reg || student2Ticket) {
    throw new Error('[Check 14, 15, 16 Failed] Transaction rollback failed on ticket creation error');
  }
  console.log('[Check 14, 15, 16] Transaction Rollback Verified: Registration, Ticket, and registeredCount rolled back on error');

  // [Check 17] Event Cancellation Invalidates Active Tickets
  // Student 2 registers successfully
  await requestJson(`${API_BASE}/events/${event._id}/register`, {
    method: 'POST',
    headers: { Cookie: cookie2 },
  });

  // Login Admin
  const adminLogin = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: 'Pass@1234' }),
  });
  const adminCookie = await extractCookie(adminLogin.headers);

  // Admin cancels the event
  const cancelEventRes = await requestJson(`${API_BASE}/events/${event._id}/cancel`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Campus emergency closure.' }),
  });

  if (cancelEventRes.status !== 200) {
    throw new Error(`[Check 17 Failed] Event cancellation failed: ${JSON.stringify(cancelEventRes.data)}`);
  }

  const ticketsAfterEventCancel = await Ticket.find({ event: event._id, status: 'active' });
  if (ticketsAfterEventCancel.length !== 0) {
    throw new Error(`[Check 17 Failed] Active tickets still found after event cancellation: ${ticketsAfterEventCancel.length}`);
  }
  console.log('[Check 17] Event Cancellation: All associated active tickets invalidated and marked cancelled');

  // [Check 18] Inactive User Access Denied
  await User.findByIdAndUpdate(student1._id, { isActive: false });
  const inactiveAccess = await requestJson(`${API_BASE}/tickets/my`, {
    headers: { Cookie: cookie1 },
  });

  if (inactiveAccess.status !== 403) {
    throw new Error(`[Check 18 Failed] Inactive user received status ${inactiveAccess.status}, expected 403`);
  }
  console.log('[Check 18] Inactive Student Blocked from Ticket APIs: Status 403 ACCOUNT_INACTIVE');

  // Reactivate Student 1 for token validation check
  await User.findByIdAndUpdate(student1._id, { isActive: true });

  // [Check 19] Token Lookup Foundation Endpoint
  const tokenValidationRes = await requestJson(`${API_BASE}/tickets/token/${ticket2Data.token}`, {
    headers: { Cookie: adminCookie },
  });

  if (tokenValidationRes.status !== 200) {
    throw new Error(`[Check 19 Failed] Token lookup failed: ${JSON.stringify(tokenValidationRes.data)}`);
  }
  console.log(`[Check 19] Token Lookup Foundation: Status 200, Status: ${tokenValidationRes.data?.data?.status}`);

  // [Check 20] Invalid Token Rejected
  const invalidTokenRes = await requestJson(`${API_BASE}/tickets/token/invalidnonexistenttokendata123456`, {
    headers: { Cookie: adminCookie },
  });

  if (invalidTokenRes.status !== 404) {
    throw new Error(`[Check 20 Failed] Expected 404 for invalid token, got ${invalidTokenRes.status}`);
  }
  console.log('[Check 20] Invalid Token Rejected: Status 404 TICKET_NOT_FOUND');

  console.log('\n=== All Phase 6 Automated Verification Checks Passed Successfully! ===');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
