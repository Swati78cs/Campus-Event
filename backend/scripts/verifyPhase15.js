const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const { signToken } = require('../utils/jwt');
const { cleanObject } = require('../middleware/mongoSanitize');
const { env } = require('../config/env');

const API_BASE = 'http://127.0.0.1:5001/api';

const makeRequest = async (endpoint, method = 'GET', body = null, token = null, headersExtra = {}) => {
  const headers = { 'Content-Type': 'application/json', ...headersExtra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
};

async function runVerification() {
  console.log('\n==================================================');
  console.log('STARTING PHASE 15 — SECURITY & RELIABILITY HARDENING VERIFICATION');
  console.log('==================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(mongoUri);

  try {
    // ----------------------------------------------------
    // Section 1: Setup Test Fixtures
    // ----------------------------------------------------
    console.log('--- Setting up Test Fixtures ---');
    const suffix = Date.now().toString().slice(-6);
    const defaultHash = '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/kC/gZ41wU.tJ8f906K6C6q91vEvy';

    let admin = await User.findOne({ role: 'admin' });
    assert(admin !== null, 'Admin user found');
    const adminToken = signToken({ id: admin._id, role: admin.role });

    const student = await User.create({
      name: `Sec Student ${suffix}`,
      email: `sec_stu_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const studentToken = signToken({ id: student._id, role: student.role });

    const inactiveUser = await User.create({
      name: `Inactive User ${suffix}`,
      email: `sec_inactive_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: false,
    });
    const inactiveToken = signToken({ id: inactiveUser._id, role: inactiveUser.role });

    const organizer1 = await User.create({
      name: `Sec Organizer 1 ${suffix}`,
      email: `sec_org1_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });
    const org1Token = signToken({ id: organizer1._id, role: organizer1.role });

    const organizer2 = await User.create({
      name: `Sec Organizer 2 ${suffix}`,
      email: `sec_org2_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });
    const org2Token = signToken({ id: organizer2._id, role: organizer2.role });

    const club1 = await Club.create({
      name: `Security Club 1 ${suffix}`,
      category: 'Technical',
      description: 'Test club 1 for security checks',
      leadOrganizerId: organizer1._id,
      organizers: [organizer1._id],
      status: 'active',
    });

    const club2 = await Club.create({
      name: `Security Club 2 ${suffix}`,
      category: 'Technical',
      description: 'Test club 2 for security checks',
      leadOrganizerId: organizer2._id,
      organizers: [organizer2._id],
      status: 'active',
    });

    const event1 = await Event.create({
      title: `Hardened Event 1 ${suffix}`,
      description: 'Initial event description for security tests.',
      club: club1._id,
      createdBy: organizer1._id,
      category: 'Technical',
      venue: 'Security Lab 101',
      capacity: 1,
      startDateTime: new Date(Date.now() + 86400000 * 2),
      endDateTime: new Date(Date.now() + 86400000 * 3),
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'published',
    });

    console.log('Test fixtures created successfully.\n');

    // ----------------------------------------------------
    // Test 1: Unauthenticated Access
    // ----------------------------------------------------
    console.log('--- Authentication & Token Security ---');
    const unauthRes = await makeRequest('/auth/me', 'GET');
    assert(unauthRes.status === 401, '1. Unauthenticated request to protected endpoint returns 401');
    assert(unauthRes.data?.error?.code === 'UNAUTHORIZED', '1b. Error code is UNAUTHORIZED');

    // ----------------------------------------------------
    // Test 2: Invalid JWT
    // ----------------------------------------------------
    const invalidTokenRes = await makeRequest('/auth/me', 'GET', null, 'malformed.jwt.token');
    assert(invalidTokenRes.status === 401, '2. Malformed JWT rejected with 401');
    assert(invalidTokenRes.data?.error?.code === 'INVALID_TOKEN', '2b. Error code is INVALID_TOKEN');

    // ----------------------------------------------------
    // Test 3: Expired JWT
    // ----------------------------------------------------
    const expiredToken = jwt.sign({ id: student._id, role: 'student' }, env.JWT_SECRET, { expiresIn: '0s' });
    const expiredRes = await makeRequest('/auth/me', 'GET', null, expiredToken);
    assert(expiredRes.status === 401, '3. Expired JWT rejected with 401');
    assert(expiredRes.data?.error?.code === 'TOKEN_EXPIRED', '3b. Error code is TOKEN_EXPIRED');

    // ----------------------------------------------------
    // Test 4: Inactive User Immediate Revocation
    // ----------------------------------------------------
    const inactiveRes = await makeRequest('/auth/me', 'GET', null, inactiveToken);
    assert(inactiveRes.status === 403, '4. Inactive user immediately rejected with 403');
    assert(inactiveRes.data?.error?.code === 'ACCOUNT_INACTIVE', '4b. Error code is ACCOUNT_INACTIVE');

    // ----------------------------------------------------
    // Test 5: Student Authorization Boundaries
    // ----------------------------------------------------
    console.log('\n--- Authorization & RBAC Boundaries ---');
    const studentCreateEvent = await makeRequest('/events', 'POST', {
      title: 'Hacked Event',
      clubId: club1._id.toString(),
    }, studentToken);
    assert(studentCreateEvent.status === 403, '5. Student blocked from creating events (403)');
    assert(studentCreateEvent.data?.error?.code === 'FORBIDDEN', '5b. Error code is FORBIDDEN');

    // ----------------------------------------------------
    // Test 6: Organizer Authorization Boundaries
    // ----------------------------------------------------
    const orgAdminAccess = await makeRequest('/analytics/admin', 'GET', null, org1Token);
    assert(orgAdminAccess.status === 403, '6. Organizer blocked from global admin analytics (403)');

    // ----------------------------------------------------
    // Test 7: Organizer Club Ownership Enforcement
    // ----------------------------------------------------
    const orgCrossEdit = await makeRequest(`/events/${event1._id}`, 'PUT', {
      title: 'Cross Club Tamper',
    }, org2Token);
    assert(orgCrossEdit.status === 403, '7. Organizer 2 blocked from editing Organizer 1 event (403)');

    // ----------------------------------------------------
    // Test 8: Admin Global Privileges
    // ----------------------------------------------------
    const adminAnalytics = await makeRequest('/analytics/admin', 'GET', null, adminToken);
    assert(adminAnalytics.status === 200, '8. Admin successfully granted access to admin overview (200)');

    // ----------------------------------------------------
    // Test 9: Invalid ObjectIds Handled Gracefully
    // ----------------------------------------------------
    console.log('\n--- Input Validation & Malformed Payloads ---');
    const invalidIdRes = await makeRequest('/events/not-a-valid-id', 'GET');
    assert(invalidIdRes.status === 400, '9. Malformed ObjectId returned 400 Bad Request');
    assert(invalidIdRes.data?.error?.code === 'INVALID_ID' || invalidIdRes.data?.error?.code === 'VALIDATION_ERROR', '9b. Clean error code returned for invalid id');

    // ----------------------------------------------------
    // Test 10: Invalid Request Bodies Handled Gracefully
    // ----------------------------------------------------
    const invalidBodyRes = await makeRequest('/auth/login', 'POST', '{ malformed json }', null, { 'Content-Type': 'application/json' });
    assert(invalidBodyRes.status === 400, '10. Malformed JSON body rejected with 400');

    // ----------------------------------------------------
    // Test 11: Invalid Enum Values
    // ----------------------------------------------------
    const invalidEnumRes = await makeRequest('/events', 'POST', {
      title: 'Valid Title Here',
      category: 'NonExistentCategory',
      clubId: club1._id.toString(),
    }, org1Token);
    assert(invalidEnumRes.status === 400, '11. Invalid enum category rejected with 400');

    // ----------------------------------------------------
    // Test 12: Oversized Input
    // ----------------------------------------------------
    const oversizedTitleRes = await makeRequest('/events', 'POST', {
      title: 'A'.repeat(150),
      clubId: club1._id.toString(),
      category: 'Technical',
    }, org1Token);
    assert(oversizedTitleRes.status === 400, '12. Oversized title rejected with 400');

    // ----------------------------------------------------
    // Test 13: Unsafe Mongo-Style Input Sanitization
    // ----------------------------------------------------
    console.log('\n--- NoSQL Injection & Operator Sanitization ---');
    const maliciousPayload = {
      email: 'student@campus.edu',
      password: 'password',
      $where: 'sleep(5000)',
      nested: {
        $gt: '',
        safeProp: 'clean',
      },
    };
    const sanitized = cleanObject(maliciousPayload);
    assert(!('$where' in sanitized), '13a. $where operator stripped by mongoSanitize');
    assert(!('$gt' in sanitized.nested), '13b. Nested $gt operator stripped by mongoSanitize');
    assert(sanitized.nested.safeProp === 'clean', '13c. Legitimate properties preserved');

    // ----------------------------------------------------
    // Test 14: Sensitive Response Fields Omission
    // ----------------------------------------------------
    console.log('\n--- Sensitive Data & Secret Protection ---');
    const meRes = await makeRequest('/auth/me', 'GET', null, studentToken);
    assert(meRes.data?.data?.user?.passwordHash === undefined, '14a. passwordHash strictly omitted from user profile');
    assert(meRes.data?.data?.user?.__v === undefined, '14b. Internal __v omitted from user profile');

    // ----------------------------------------------------
    // Test 15: Password Hash Exposure Check on Login
    // ----------------------------------------------------
    const loginRes = await makeRequest('/auth/login', 'POST', {
      email: `sec_stu_${suffix}@campus.edu`,
      password: 'Password123!',
    });
    // Even if credentials mismatch or match, passwordHash must NEVER be exposed
    const loginStr = JSON.stringify(loginRes);
    assert(!loginStr.includes('$2a$10$'), '15. passwordHash pattern never present in login response');

    // ----------------------------------------------------
    // Test 16: JWT/Cookie Exposure Check
    // ----------------------------------------------------
    assert(meRes.data?.data?.user?.token === undefined, '16. Raw token not embedded in user data object');

    // ----------------------------------------------------
    // Test 17: GEMINI_API_KEY Exposure Check
    // ----------------------------------------------------
    const aiRes = await makeRequest('/ai/event-description', 'POST', {
      title: 'Secure Event Title',
      clubId: club1._id.toString(),
    }, org1Token);
    const aiResStr = JSON.stringify(aiRes);
    assert(!aiResStr.includes('AIzaSy'), '17. GEMINI_API_KEY pattern never present in AI responses');

    // ----------------------------------------------------
    // Test 18: Error-Response Stack Trace & Secret Isolation
    // ----------------------------------------------------
    assert(!JSON.stringify(unauthRes.data).includes('C:\\'), '18a. Internal file paths not in client error response');
    assert(!JSON.stringify(invalidIdRes.data).includes('stack'), '18b. Error response does not expose stack trace');

    // ----------------------------------------------------
    // Test 19: CORS Configuration & Security Headers
    // ----------------------------------------------------
    console.log('\n--- CORS & Security Headers ---');
    const healthRes = await makeRequest('/health', 'GET', null, null, {
      Origin: 'http://malicious-attacker-domain.com',
    });
    assert(
      healthRes.headers.get('access-control-allow-origin') === null,
      '19a. Malicious origin denied Access-Control-Allow-Origin header'
    );
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', '19b. X-Content-Type-Options: nosniff present');
    assert(healthRes.headers.get('x-frame-options') === 'DENY', '19c. X-Frame-Options: DENY present');
    assert(healthRes.headers.get('x-powered-by') === null, '19d. X-Powered-By header successfully hidden');

    // ----------------------------------------------------
    // Test 20: QR Check-in Authorization
    // ----------------------------------------------------
    console.log('\n--- Domain Security Checks (QR, Registration, Waitlist, etc.) ---');
    const studentCheckInRes = await makeRequest(`/events/${event1._id}/attendance/qr`, 'POST', {
      token: 'a'.repeat(64),
    }, studentToken);
    assert(studentCheckInRes.status === 403, '20. Unauthorized student blocked from QR check-in (403)');

    // ----------------------------------------------------
    // Test 21: Duplicate Check-in Protection
    // ----------------------------------------------------
    // Registration 1 for student
    const regRes = await makeRequest(`/registrations/${event1._id}/register`, 'POST', null, studentToken);
    assert(regRes.status === 201, 'Student registered successfully');
    const studentTicket = await Ticket.findOne({ event: event1._id, student: student._id });
    assert(studentTicket !== null, 'Student ticket exists');

    // Manually mark event as occurring today so check-in is permitted
    event1.startDateTime = new Date(Date.now() - 3600000);
    event1.endDateTime = new Date(Date.now() + 3600000);
    await event1.save();

    const checkIn1 = await makeRequest(`/events/${event1._id}/attendance/qr`, 'POST', {
      token: studentTicket.token,
    }, org1Token);
    assert(checkIn1.status === 200, 'Initial QR check-in succeeded');

    const checkIn2 = await makeRequest(`/events/${event1._id}/attendance/qr`, 'POST', {
      token: studentTicket.token,
    }, org1Token);
    assert(checkIn2.status === 400, '21. Duplicate QR check-in rejected with 400');
    assert(checkIn2.data?.error?.code === 'ALREADY_CHECKED_IN', '21b. Error code is ALREADY_CHECKED_IN');

    // ----------------------------------------------------
    // Test 22: Registration Capacity Protection
    // ----------------------------------------------------
    const student2 = await User.create({
      name: `Sec Student 2 ${suffix}`,
      email: `sec_stu2_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const student2Token = signToken({ id: student2._id, role: student2.role });

    const fullRegRes = await makeRequest(`/registrations/${event1._id}/register`, 'POST', null, student2Token);
    assert(fullRegRes.status === 400, '22. Registration rejected when event is full (400)');
    assert(fullRegRes.data?.error?.code === 'EVENT_FULL', '22b. Error code is EVENT_FULL');

    // ----------------------------------------------------
    // Test 23: Waitlist Consistency
    // ----------------------------------------------------
    // Create an event with available seats (capacity 10)
    const openEvent = await Event.create({
      title: `Open Event ${suffix}`,
      description: 'Open event for waitlist consistency testing.',
      club: club1._id,
      createdBy: organizer1._id,
      category: 'Technical',
      venue: 'Room 202',
      capacity: 10,
      startDateTime: new Date(Date.now() + 86400000 * 2),
      endDateTime: new Date(Date.now() + 86400000 * 3),
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'published',
    });

    const waitlistOpenRes = await makeRequest(`/events/${openEvent._id}/waitlist`, 'POST', null, student2Token);
    assert(waitlistOpenRes.status === 400, '23. Cannot join waitlist when seats are open (400)');
    assert(waitlistOpenRes.data?.error?.code === 'SEATS_AVAILABLE', '23b. Error code is SEATS_AVAILABLE');

    // ----------------------------------------------------
    // Test 24: Certificate Authorization
    // ----------------------------------------------------
    const studentCertIssue = await makeRequest(`/events/${event1._id}/certificates/issue`, 'POST', {
      studentId: student._id.toString(),
    }, studentToken);
    assert(studentCertIssue.status === 403, '24. Student cannot issue certificates (403)');

    // ----------------------------------------------------
    // Test 25: Feedback Attendance Requirement
    // ----------------------------------------------------
    openEvent.startDateTime = new Date(Date.now() - 7200000);
    openEvent.endDateTime = new Date(Date.now() - 3600000);
    await openEvent.save();

    const unattendedFeedback = await makeRequest(`/events/${openEvent._id}/feedback`, 'POST', {
      rating: 5,
      comment: 'Did not attend',
    }, student2Token);
    assert(unattendedFeedback.status === 403, '25. Unattended student blocked from submitting feedback (403)');
    assert(unattendedFeedback.data?.error?.code === 'ATTENDANCE_REQUIRED', '25b. Error code is ATTENDANCE_REQUIRED');

    // ----------------------------------------------------
    // Test 26: Analytics Authorization
    // ----------------------------------------------------
    const studentAnalytics = await makeRequest('/analytics/organizer', 'GET', null, studentToken);
    assert(studentAnalytics.status === 403, '26. Student blocked from organizer analytics (403)');

    // ----------------------------------------------------
    // Test 27: AI Endpoint Authorization
    // ----------------------------------------------------
    const studentAI = await makeRequest('/ai/event-description', 'POST', {
      title: 'Student Attempt',
      clubId: club1._id.toString(),
    }, studentToken);
    assert(studentAI.status === 403, '27. Student blocked from Gemini AI description generation (403)');

    // ----------------------------------------------------
    // Test 28: AI Secret Isolation
    // ----------------------------------------------------
    const aiHeadersCheck = await makeRequest('/ai/event-description', 'POST', {
      title: 'Valid Title',
      clubId: club1._id.toString(),
    }, org1Token);
    assert(!aiHeadersCheck.headers.get('x-api-key'), '28a. No API key in response headers');
    assert(aiHeadersCheck.data?.data?.apiKey === undefined, '28b. No API key in response payload');

    // ----------------------------------------------------
    // Test 29: AI Failure Fallback
    // ----------------------------------------------------
    assert(
      (aiHeadersCheck.status === 503 && aiHeadersCheck.data?.error?.code === 'AI_CONFIG_ERROR') || aiHeadersCheck.status === 200,
      '29. AI unconfigured or failure returns standard fallback error envelope (503)'
    );

    // ----------------------------------------------------
    // Test 30: Existing API Compatibility & Health
    // ----------------------------------------------------
    console.log('\n--- System Compatibility & Standard Envelopes ---');
    const healthFinal = await makeRequest('/health', 'GET');
    assert(healthFinal.status === 200, '30a. Health endpoint returns 200 OK');
    assert(healthFinal.data?.success === true, '30b. Standard success envelope preserved');
    assert(healthFinal.data?.data?.status === 'healthy', '30c. Health payload healthy');

    console.log('\n==================================================');
    console.log('✅ ALL 30 PHASE 15 SECURITY & RELIABILITY VERIFICATION CHECKS PASSED!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
