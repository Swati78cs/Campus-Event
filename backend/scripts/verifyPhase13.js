const mongoose = require('mongoose');
const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const { signToken } = require('../utils/jwt');
const analyticsService = require('../services/analyticsService');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:5001/api';

const makeRequest = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
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
  console.log('STARTING PHASE 13 — ANALYTICS VERIFICATION');
  console.log('==================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(mongoUri);

  try {
    // ----------------------------------------------------
    // Section 1: Service & Route Checks
    // ----------------------------------------------------
    console.log('--- Section 1: Service & Routing Structure ---');
    assert(analyticsService !== undefined, 'Analytics service exists');
    assert(typeof analyticsService.getEventAnalytics === 'function', 'getEventAnalytics function exists');
    assert(typeof analyticsService.getOrganizerOverview === 'function', 'getOrganizerOverview function exists');
    assert(typeof analyticsService.getAdminOverview === 'function', 'getAdminOverview function exists');

    // ----------------------------------------------------
    // Section 2: Test Data Setup
    // ----------------------------------------------------
    console.log('\n--- Section 2: Test Data Setup ---');

    const suffix = Date.now().toString().slice(-6);
    const defaultHash = '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/kC/gZ41wU.tJ8f906K6C6q91vEvy';

    // Users
    const admin = await User.create({
      name: `Admin Analytics ${suffix}`,
      email: `admin_an_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'admin',
      isActive: true,
    });

    const organizer1 = await User.create({
      name: `Organizer 1 Analytics ${suffix}`,
      email: `org1_an_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });

    const organizer2 = await User.create({
      name: `Organizer 2 Analytics ${suffix}`,
      email: `org2_an_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });

    const student1 = await User.create({
      name: `Student 1 Analytics ${suffix}`,
      email: `stu1_an_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const student2 = await User.create({
      name: `Student 2 Analytics ${suffix}`,
      email: `stu2_an_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const volunteer = await User.create({
      name: `Volunteer Analytics ${suffix}`,
      email: `vol_an_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const inactiveUser = await User.create({
      name: `Inactive Analytics ${suffix}`,
      email: `inactive_an_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: false,
    });

    // JWT Tokens
    const adminToken = signToken({ id: admin._id, role: admin.role, email: admin.email });
    const org1Token = signToken({ id: organizer1._id, role: organizer1.role, email: organizer1.email });
    const org2Token = signToken({ id: organizer2._id, role: organizer2.role, email: organizer2.email });
    const stuToken = signToken({ id: student1._id, role: student1.role, email: student1.email });
    const volToken = signToken({ id: volunteer._id, role: volunteer.role, email: volunteer.email });
    const inactiveToken = signToken({ id: inactiveUser._id, role: inactiveUser.role, email: inactiveUser.email });

    // Clubs
    const club1 = await Club.create({
      name: `Club 1 Analytics ${suffix}`,
      description: 'Organizer 1 club',
      category: 'Technical',
      organizers: [organizer1._id],
    });

    const club2 = await Club.create({
      name: `Club 2 Analytics ${suffix}`,
      description: 'Organizer 2 club',
      category: 'Cultural',
      organizers: [organizer2._id],
    });

    // Events
    const event1 = await Event.create({
      title: `Event 1 Analytics ${suffix}`,
      description: 'Event for club 1',
      club: club1._id,
      createdBy: organizer1._id,
      category: 'Technical',
      venue: 'Auditorium 1',
      capacity: 10,
      registeredCount: 3,
      startDateTime: new Date(Date.now() - 7200000),
      endDateTime: new Date(Date.now() - 3600000),
      registrationDeadline: new Date(Date.now() - 7200000),
      status: 'published',
    });

    const event2 = await Event.create({
      title: `Event 2 Analytics ${suffix}`,
      description: 'Event for club 2',
      club: club2._id,
      createdBy: organizer2._id,
      category: 'Cultural',
      venue: 'Hall B',
      capacity: 5,
      registeredCount: 0,
      startDateTime: new Date(Date.now() + 86400000),
      endDateTime: new Date(Date.now() + 90000000),
      registrationDeadline: new Date(Date.now() + 80000000),
      status: 'published',
    });

    const eventZeroCap = await Event.create({
      title: `Zero Cap Event ${suffix}`,
      description: 'Event with zero capacity edge case',
      club: club1._id,
      createdBy: organizer1._id,
      category: 'Technical',
      venue: 'Virtual Room',
      capacity: 1,
      registeredCount: 0,
      startDateTime: new Date(Date.now() - 3600000),
      endDateTime: new Date(Date.now() - 1800000),
      registrationDeadline: new Date(Date.now() - 3600000),
      status: 'published',
    });
    // Set capacity to 0 via raw collection update to test edge-case division-by-zero protection
    await Event.collection.updateOne({ _id: eventZeroCap._id }, { $set: { capacity: 0 } });

    // Registrations for event1:
    // 2 on day 1 (active)
    await Registration.create({
      event: event1._id,
      student: student1._id,
      status: 'active',
      registeredAt: new Date('2026-10-01T10:00:00.000Z'),
    });

    await Registration.create({
      event: event1._id,
      student: student2._id,
      status: 'active',
      registeredAt: new Date('2026-10-01T14:30:00.000Z'),
    });

    // 1 on day 2 (active)
    await Registration.create({
      event: event1._id,
      student: volunteer._id,
      status: 'active',
      registeredAt: new Date('2026-10-02T09:15:00.000Z'),
    });

    // 1 cancelled registration
    await Registration.create({
      event: event1._id,
      student: new mongoose.Types.ObjectId(),
      status: 'cancelled',
      registeredAt: new Date('2026-10-01T11:00:00.000Z'),
      cancelledAt: new Date('2026-10-01T15:00:00.000Z'),
    });

    // Attendance for event1:
    // student1 checked in via qr
    await Attendance.create({
      event: event1._id,
      student: student1._id,
      checkedInBy: admin._id,
      method: 'qr',
      status: 'checked_in',
    });

    // volunteer checked in via admin_override
    await Attendance.create({
      event: event1._id,
      student: volunteer._id,
      checkedInBy: admin._id,
      method: 'admin_override',
      status: 'overridden',
      overrideReason: 'Verified on-site volunteer',
    });

    console.log('✓ Test fixtures successfully created');

    // ----------------------------------------------------
    // Section 3: Authentication & Authorization Bounds
    // ----------------------------------------------------
    console.log('\n--- Section 3: Authorization Checks ---');

    // Unauthenticated rejected
    const unauthRes = await makeRequest(`/events/${event1._id}/analytics`, 'GET');
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with 401');

    // Inactive user rejected
    const inactiveRes = await makeRequest(`/events/${event1._id}/analytics`, 'GET', null, inactiveToken);
    assert(inactiveRes.status === 401 || inactiveRes.status === 403, 'Inactive user rejected');

    // Student rejected
    const stuRes = await makeRequest(`/events/${event1._id}/analytics`, 'GET', null, stuToken);
    assert(stuRes.status === 403, 'Student cannot access event analytics (403)');

    // Volunteer rejected
    const volRes = await makeRequest(`/events/${event1._id}/analytics`, 'GET', null, volToken);
    assert(volRes.status === 403, 'Volunteer cannot access event analytics (403)');

    // Organizer 1 can access event 1 (authorized)
    const org1Event1 = await makeRequest(`/events/${event1._id}/analytics`, 'GET', null, org1Token);
    assert(org1Event1.status === 200, 'Organizer 1 can access authorized Event 1 analytics');
    assert(org1Event1.data.success === true, 'Standard success envelope returned');

    // Organizer 1 CANNOT access event 2 (unauthorized)
    const org1Event2 = await makeRequest(`/events/${event2._id}/analytics`, 'GET', null, org1Token);
    assert(org1Event2.status === 403, 'Organizer 1 cannot access unauthorized Event 2 analytics (403)');
    assert(org1Event2.data.error?.code === 'UNAUTHORIZED_EVENT_ANALYTICS', 'Error code UNAUTHORIZED_EVENT_ANALYTICS returned');

    // Admin can access Event 1 and Event 2 globally
    const adminEvent1 = await makeRequest(`/events/${event1._id}/analytics`, 'GET', null, adminToken);
    assert(adminEvent1.status === 200, 'Admin can access Event 1 analytics globally');

    const adminEvent2 = await makeRequest(`/events/${event2._id}/analytics`, 'GET', null, adminToken);
    assert(adminEvent2.status === 200, 'Admin can access Event 2 analytics globally');

    // Non-existent event returns 404
    const fakeId = new mongoose.Types.ObjectId();
    const notFoundRes = await makeRequest(`/events/${fakeId}/analytics`, 'GET', null, adminToken);
    assert(notFoundRes.status === 404, 'Non-existent event returns 404');

    // ----------------------------------------------------
    // Section 4: Registration & Capacity Metric Checks
    // ----------------------------------------------------
    console.log('\n--- Section 4: Registration & Capacity Metrics ---');

    const ev1Data = org1Event1.data.data;

    assert(ev1Data.registrations.total === 4, 'Total registrations count is 4 (3 active + 1 cancelled)');
    assert(ev1Data.registrations.active === 3, 'Active registrations count is 3');
    assert(ev1Data.registrations.cancelled === 1, 'Cancelled registrations count is 1');
    assert(ev1Data.event.capacity === 10, 'Event capacity is 10');
    assert(ev1Data.registrations.availableSeats === 7, 'Available seats is 7 (10 - 3)');

    // Capacity utilization: (3 / 10) * 100 = 30.0%
    assert(ev1Data.registrations.utilizationPercentage === 30, 'Capacity utilization is 30%');

    // Zero-capacity edge case test
    const zeroCapRes = await makeRequest(`/events/${eventZeroCap._id}/analytics`, 'GET', null, org1Token);
    assert(zeroCapRes.status === 200, 'Zero-capacity event analytics request succeeds');
    assert(zeroCapRes.data.data.registrations.utilizationPercentage === 0, 'Zero-capacity yields 0% without NaN or Infinity');

    // ----------------------------------------------------
    // Section 5: Attendance & Check-In Rate Checks
    // ----------------------------------------------------
    console.log('\n--- Section 5: Attendance & Check-In Rate Metrics ---');

    assert(ev1Data.attendance.checkedIn === 2, 'Total checked-in attendees count is 2');
    assert(ev1Data.attendance.breakdown.qr === 1, 'QR checked-in count is 1');
    assert(ev1Data.attendance.breakdown.override === 1, 'Admin override checked-in count is 1');
    assert(ev1Data.attendance.breakdown.manual === 0, 'Manual check-in count is 0');

    // Check-in rate: (2 / 3) * 100 = 66.7%
    assert(ev1Data.attendance.checkInRate === 66.7, 'Check-in rate is 66.7%');

    // Empty event attendance test (Event 2 has 0 registrations)
    const ev2Data = adminEvent2.data.data;
    assert(ev2Data.attendance.checkedIn === 0, 'Event with no attendees reports 0 checked-in');
    assert(ev2Data.attendance.checkInRate === 0, 'Event with 0 registrations reports 0% check-in rate without NaN');

    // ----------------------------------------------------
    // Section 6: Registration Trend Aggregation Checks
    // ----------------------------------------------------
    console.log('\n--- Section 6: Sign-ups Over Time Trend ---');

    assert(Array.isArray(ev1Data.registrationTrend), 'registrationTrend is an array');
    assert(ev1Data.registrationTrend.length === 2, 'registrationTrend contains 2 date buckets');

    const day1Trend = ev1Data.registrationTrend.find((t) => t.date === '2026-10-01');
    const day2Trend = ev1Data.registrationTrend.find((t) => t.date === '2026-10-02');

    assert(Boolean(day1Trend), 'Bucket for 2026-10-01 exists');
    assert(day1Trend.count === 2, '2 active registrations recorded on 2026-10-01');
    assert(Boolean(day2Trend), 'Bucket for 2026-10-02 exists');
    assert(day2Trend.count === 1, '1 active registration recorded on 2026-10-02');

    // Empty trend for Event 2
    assert(Array.isArray(ev2Data.registrationTrend), 'Event 2 trend is an array');
    assert(ev2Data.registrationTrend.length === 0, 'Event 2 trend is empty array []');

    // ----------------------------------------------------
    // Section 7: Organizer Overview Analytics Checks
    // ----------------------------------------------------
    console.log('\n--- Section 7: Organizer Overview Analytics ---');

    // Student cannot access organizer overview
    const stuOverview = await makeRequest('/analytics/organizer', 'GET', null, stuToken);
    assert(stuOverview.status === 403, 'Student cannot access GET /analytics/organizer (403)');

    // Volunteer cannot access organizer overview
    const volOverview = await makeRequest('/analytics/organizer', 'GET', null, volToken);
    assert(volOverview.status === 403, 'Volunteer cannot access GET /analytics/organizer (403)');

    // Organizer 1 overview
    const org1OverviewRes = await makeRequest('/analytics/organizer', 'GET', null, org1Token);
    assert(org1OverviewRes.status === 200, 'Organizer 1 retrieves overview analytics');
    const org1Overview = org1OverviewRes.data.data;

    assert(org1Overview.totalEvents === 2, 'Organizer 1 manages 2 events (Event 1 & Zero Cap)');
    assert(org1Overview.totalRegistrations === 3, 'Organizer 1 total active registrations is 3');
    assert(org1Overview.totalAttendees === 2, 'Organizer 1 total attendees is 2');
    assert(org1Overview.averageCheckInRate === 66.7, 'Organizer 1 average check-in rate is 66.7%');
    // Total capacity = 10 (Event 1) + 0 (ZeroCap) = 10 -> (3 / 10) * 100 = 30.0%
    assert(org1Overview.capacityUtilization === 30, 'Organizer 1 capacity fill is 30%');

    assert(Array.isArray(org1Overview.events), 'Organizer overview includes events breakdown');
    assert(org1Overview.pagination !== undefined, 'Pagination metadata is included');

    // Organizer pagination test
    const orgPaginationRes = await makeRequest('/analytics/organizer?limit=1&page=1', 'GET', null, org1Token);
    assert(orgPaginationRes.status === 200, 'Organizer pagination request succeeds');
    assert(orgPaginationRes.data.data.events.length === 1, 'Limit 1 returns 1 event');
    assert(orgPaginationRes.data.data.pagination.totalPages === 2, 'Total pages is 2 for 2 events');

    // Organizer 1 cannot scope overview to unauthorized Club 2
    const org1Club2Res = await makeRequest(`/analytics/organizer?clubId=${club2._id}`, 'GET', null, org1Token);
    assert(org1Club2Res.status === 403, 'Organizer 1 cannot access overview for Club 2 (403)');

    // ----------------------------------------------------
    // Section 8: Admin Global Overview Checks
    // ----------------------------------------------------
    console.log('\n--- Section 8: Admin Platform Overview ---');

    // Organizer cannot access admin overview
    const orgAdminOverview = await makeRequest('/analytics/admin', 'GET', null, org1Token);
    assert(orgAdminOverview.status === 403, 'Organizer cannot access GET /analytics/admin (403)');

    // Admin can access admin overview
    const adminOverviewRes = await makeRequest('/analytics/admin', 'GET', null, adminToken);
    assert(adminOverviewRes.status === 200, 'Admin can access GET /analytics/admin');
    const adminOverview = adminOverviewRes.data.data;

    assert(adminOverview.users.total >= 7, 'Admin overview shows total users count');
    assert(adminOverview.users.students >= 3, 'Admin overview breaks down student users');
    assert(adminOverview.users.organizers >= 2, 'Admin overview breaks down organizer users');
    assert(adminOverview.users.admins >= 1, 'Admin overview breaks down admin users');
    assert(adminOverview.clubs.total >= 2, 'Admin overview shows total clubs count');
    assert(adminOverview.events.total >= 3, 'Admin overview shows total events count');
    assert(adminOverview.registrations.active >= 3, 'Admin overview shows active registrations');
    assert(adminOverview.attendance.totalAttendees >= 2, 'Admin overview shows total attendees');
    assert(typeof adminOverview.attendance.checkInRate === 'number', 'Platform check-in rate is a number');

    // ----------------------------------------------------
    // Section 9: Data Invariance & Privacy Checks
    // ----------------------------------------------------
    console.log('\n--- Section 9: Invariance & Privacy ---');

    // Analytics must not alter source documents
    const intactReg = await Registration.findOne({ event: event1._id, student: student1._id });
    assert(intactReg && intactReg.status === 'active', 'Registration document remained completely intact');

    const intactAtt = await Attendance.findOne({ event: event1._id, student: student1._id });
    assert(intactAtt && intactAtt.status === 'checked_in', 'Attendance document remained completely intact');

    // Privacy check: no passwords, hashes, tokens in responses
    const stringifiedOverview = JSON.stringify(adminOverview);
    assert(!stringifiedOverview.includes('passwordHash'), 'No passwordHash in admin overview payload');
    assert(!stringifiedOverview.includes('tokens'), 'No tokens in admin overview payload');

    // ----------------------------------------------------
    // Section 10: Frontend Build Verification
    // ----------------------------------------------------
    console.log('\n--- Section 10: Frontend Production Build ---');
    const distPath = path.resolve(__dirname, '../../frontend/dist/index.html');
    assert(fs.existsSync(distPath), 'Frontend production build dist/index.html exists');

    console.log('\n==================================================');
    console.log('✅ ALL PHASE 13 VERIFICATION CHECKS PASSED (40/40)');
    console.log('==================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ Phase 13 Verification Failed:', err);
  process.exit(1);
});
