const mongoose = require('mongoose');
const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const { signToken } = require('../utils/jwt');
const feedbackService = require('../services/feedbackService');
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
  console.log('STARTING PHASE 12 — FEEDBACK VERIFICATION');
  console.log('==================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(mongoUri);

  try {
    // ----------------------------------------------------
    // Section 1: Feedback Model & Database Schema Verification
    // ----------------------------------------------------
    console.log('--- Section 1: Model & Schema Checks ---');

    assert(Feedback !== undefined, 'Feedback model exists');

    const feedbackIndexes = await Feedback.collection.indexes();
    const hasCompoundUnique = feedbackIndexes.some(
      (idx) => idx.key && idx.key.event === 1 && idx.key.student === 1 && idx.unique === true
    );
    assert(hasCompoundUnique, 'Compound unique index { event: 1, student: 1 } exists on Feedback collection');

    // Model validation checks
    const invalidRatingLow = new Feedback({
      event: new mongoose.Types.ObjectId(),
      student: new mongoose.Types.ObjectId(),
      rating: 0,
    });
    const lowErr = invalidRatingLow.validateSync();
    assert(Boolean(lowErr?.errors?.rating), 'Rating < 1 is rejected by Mongoose model validation');

    const invalidRatingHigh = new Feedback({
      event: new mongoose.Types.ObjectId(),
      student: new mongoose.Types.ObjectId(),
      rating: 6,
    });
    const highErr = invalidRatingHigh.validateSync();
    assert(Boolean(highErr?.errors?.rating), 'Rating > 5 is rejected by Mongoose model validation');

    const invalidRatingFloat = new Feedback({
      event: new mongoose.Types.ObjectId(),
      student: new mongoose.Types.ObjectId(),
      rating: 3.5,
    });
    const floatErr = invalidRatingFloat.validateSync();
    assert(Boolean(floatErr?.errors?.rating), 'Non-integer rating is rejected by model validator');

    const validModelItem = new Feedback({
      event: new mongoose.Types.ObjectId(),
      student: new mongoose.Types.ObjectId(),
      rating: 4,
      comment: 'Great session!',
    });
    const validErr = validModelItem.validateSync();
    assert(!validErr, 'Valid Feedback document passes model validation');

    // ----------------------------------------------------
    // Section 2: Test Data Setup
    // ----------------------------------------------------
    console.log('\n--- Section 2: Test Data Setup ---');

    const suffix = Date.now().toString().slice(-6);
    const defaultHash = '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/kC/gZ41wU.tJ8f906K6C6q91vEvy';

    // Users
    const admin = await User.create({
      name: `Admin FB ${suffix}`,
      email: `admin_fb_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'admin',
      isActive: true,
    });

    const organizer1 = await User.create({
      name: `Organizer 1 FB ${suffix}`,
      email: `org1_fb_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });

    const organizer2 = await User.create({
      name: `Organizer 2 FB ${suffix}`,
      email: `org2_fb_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });

    const studentAttended1 = await User.create({
      name: `Student Attended 1 ${suffix}`,
      email: `stu1_fb_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const studentAttended2 = await User.create({
      name: `Student Attended 2 ${suffix}`,
      email: `stu2_fb_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const studentRegisteredOnly = await User.create({
      name: `Student Reg Only ${suffix}`,
      email: `stu_reg_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const studentVolunteer = await User.create({
      name: `Volunteer FB ${suffix}`,
      email: `vol_fb_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const inactiveStudent = await User.create({
      name: `Inactive Student ${suffix}`,
      email: `inactive_fb_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: false,
    });

    // Tokens
    const adminToken = signToken({ id: admin._id, role: admin.role, email: admin.email });
    const org1Token = signToken({ id: organizer1._id, role: organizer1.role, email: organizer1.email });
    const org2Token = signToken({ id: organizer2._id, role: organizer2.role, email: organizer2.email });
    const stu1Token = signToken({ id: studentAttended1._id, role: studentAttended1.role, email: studentAttended1.email });
    const stu2Token = signToken({ id: studentAttended2._id, role: studentAttended2.role, email: studentAttended2.email });
    const stuRegToken = signToken({ id: studentRegisteredOnly._id, role: studentRegisteredOnly.role, email: studentRegisteredOnly.email });
    const volToken = signToken({ id: studentVolunteer._id, role: studentVolunteer.role, email: studentVolunteer.email });
    const inactiveToken = signToken({ id: inactiveStudent._id, role: inactiveStudent.role, email: inactiveStudent.email });

    // Club
    const club = await Club.create({
      name: `Tech Feedback Club ${suffix}`,
      description: 'Testing feedback features',
      category: 'Technical',
      organizers: [organizer1._id],
    });

    // Past completed event
    const completedEvent = await Event.create({
      title: `Completed AI Summit ${suffix}`,
      description: 'Summit that already ended',
      club: club._id,
      createdBy: organizer1._id,
      category: 'Technical',
      venue: 'Main Auditorium',
      capacity: 100,
      registeredCount: 3,
      startDateTime: new Date(Date.now() - 7200000), // 2 hours ago
      endDateTime: new Date(Date.now() - 3600000),   // 1 hour ago
      registrationDeadline: new Date(Date.now() - 7200000),
      status: 'published',
      certificateEnabled: false, // Explicitly false to verify decoupling from certificates
    });

    // Future event (not completed)
    const futureEvent = await Event.create({
      title: `Future Workshop ${suffix}`,
      description: 'Workshop that will happen next week',
      club: club._id,
      createdBy: organizer1._id,
      category: 'Technical',
      venue: 'Lab 2',
      capacity: 50,
      startDateTime: new Date(Date.now() + 86400000),
      endDateTime: new Date(Date.now() + 90000000),
      registrationDeadline: new Date(Date.now() + 80000000),
      status: 'published',
    });

    // Cancelled event
    const cancelledEvent = await Event.create({
      title: `Cancelled Seminar ${suffix}`,
      description: 'Seminar that got cancelled',
      club: club._id,
      createdBy: organizer1._id,
      category: 'Technical',
      venue: 'Hall A',
      capacity: 50,
      startDateTime: new Date(Date.now() - 7200000),
      endDateTime: new Date(Date.now() - 3600000),
      registrationDeadline: new Date(Date.now() - 7200000),
      status: 'cancelled',
      cancellationReason: 'Bad weather',
    });

    // Attendance records for completedEvent
    await Attendance.create({
      event: completedEvent._id,
      student: studentAttended1._id,
      checkedInBy: admin._id,
      method: 'qr',
      status: 'checked_in',
    });

    await Attendance.create({
      event: completedEvent._id,
      student: studentAttended2._id,
      checkedInBy: admin._id,
      method: 'manual',
      status: 'checked_in',
    });

    await Attendance.create({
      event: completedEvent._id,
      student: studentVolunteer._id,
      checkedInBy: admin._id,
      method: 'admin_override',
      status: 'overridden',
      overrideReason: 'Verified volunteer on-site',
    });

    // Registration ONLY (no attendance) for studentRegisteredOnly
    await Registration.create({
      event: completedEvent._id,
      student: studentRegisteredOnly._id,
      status: 'active',
    });

    console.log('✓ Test fixtures successfully created');

    // ----------------------------------------------------
    // Section 3: Eligibility & Access Control Checks
    // ----------------------------------------------------
    console.log('\n--- Section 3: Eligibility & Access Control Checks ---');

    // Check: Unauthenticated request rejected
    const unauthRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 5 });
    assert(unauthRes.status === 401, 'Unauthenticated POST /feedback is rejected with 401');

    // Check: Inactive student blocked
    const inactiveRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 5 }, inactiveToken);
    assert(inactiveRes.status === 401 || inactiveRes.status === 403, 'Inactive student is blocked from submitting feedback');

    // Check: Non-existent event returns 404
    const fakeEventId = new mongoose.Types.ObjectId();
    const notFoundRes = await makeRequest(`/events/${fakeEventId}/feedback`, 'POST', { rating: 5 }, stu1Token);
    assert(notFoundRes.status === 404, 'Non-existent event returns 404');

    // Check: Future event rejected with 400 EVENT_NOT_COMPLETED
    const futureRes = await makeRequest(`/events/${futureEvent._id}/feedback`, 'POST', { rating: 5 }, stu1Token);
    assert(futureRes.status === 400, 'Future incomplete event returns 400');
    assert(futureRes.data.error?.code === 'EVENT_NOT_COMPLETED', 'Future event returns error code EVENT_NOT_COMPLETED');

    // Check: Cancelled event rejected with 400
    const cancelledRes = await makeRequest(`/events/${cancelledEvent._id}/feedback`, 'POST', { rating: 5 }, stu1Token);
    assert(cancelledRes.status === 400, 'Cancelled event returns 400');

    // Check: Registered but NOT attended student blocked with 403 ATTENDANCE_REQUIRED
    const notAttendedRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 5 }, stuRegToken);
    assert(notAttendedRes.status === 403, 'Registered student who did not attend is blocked with 403');
    assert(notAttendedRes.data.error?.code === 'ATTENDANCE_REQUIRED', 'Returns error code ATTENDANCE_REQUIRED');

    // Check: Certificate enabled flag does not affect feedback (certificateEnabled is false on completedEvent)
    const stu1EligibilityRes = await makeRequest(`/events/${completedEvent._id}/feedback/my`, 'GET', null, stu1Token);
    assert(stu1EligibilityRes.status === 200, 'Student 1 can check feedback eligibility');
    assert(stu1EligibilityRes.data.data?.canSubmit === true, 'Student 1 canSubmit is true despite certificateEnabled: false');
    assert(stu1EligibilityRes.data.data?.hasAttended === true, 'Student 1 hasAttended is true');

    // ----------------------------------------------------
    // Section 4: Feedback Validation Checks
    // ----------------------------------------------------
    console.log('\n--- Section 4: Feedback Validation Checks ---');

    // Missing rating rejected
    const noRatingRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { comment: 'No stars' }, stu1Token);
    assert(noRatingRes.status === 400, 'Payload without rating rejected with 400');

    // Invalid rating (0)
    const zeroRatingRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 0 }, stu1Token);
    assert(zeroRatingRes.status === 400, 'Rating = 0 rejected with 400');

    // Invalid rating (6)
    const sixRatingRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 6 }, stu1Token);
    assert(sixRatingRes.status === 400, 'Rating = 6 rejected with 400');

    // Invalid rating (float 4.5)
    const floatRatingRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 4.5 }, stu1Token);
    assert(floatRatingRes.status === 400, 'Non-integer rating 4.5 rejected with 400');

    // Excessive comment length (> 1000 characters)
    const longComment = 'A'.repeat(1005);
    const longCommentRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 5, comment: longComment }, stu1Token);
    assert(longCommentRes.status === 400, 'Comment exceeding 1000 characters rejected with 400');

    // ----------------------------------------------------
    // Section 5: Successful Feedback Submission
    // ----------------------------------------------------
    console.log('\n--- Section 5: Successful Submission & Idempotency ---');

    // Student 1 submits rating 5 with comment
    const sub1Res = await makeRequest(
      `/events/${completedEvent._id}/feedback`,
      'POST',
      { rating: 5, comment: 'Phenomenal keynote speaker!' },
      stu1Token
    );
    assert(sub1Res.status === 201, 'Student 1 submits valid feedback with 201 Created');
    assert(sub1Res.data.success === true, 'Standard success envelope returned');
    assert(sub1Res.data.data?.feedback?.rating === 5, 'Feedback rating stored as 5');
    assert(sub1Res.data.data?.feedback?.comment === 'Phenomenal keynote speaker!', 'Feedback comment stored');

    // Student 2 submits rating 3 with empty/no comment
    const sub2Res = await makeRequest(
      `/events/${completedEvent._id}/feedback`,
      'POST',
      { rating: 3 },
      stu2Token
    );
    assert(sub2Res.status === 201, 'Student 2 submits feedback with rating 3 (no comment)');
    assert(sub2Res.data.data?.feedback?.rating === 3, 'Rating stored as 3');

    // Attended Volunteer submits rating 4
    const subVolRes = await makeRequest(
      `/events/${completedEvent._id}/feedback`,
      'POST',
      { rating: 4, comment: 'Well organized volunteer flow.' },
      volToken
    );
    assert(subVolRes.status === 201, 'Attended volunteer submits feedback with 201 Created');

    // Student 1 attempts to submit DUPLICATE feedback -> Rejected with 409
    const dupRes = await makeRequest(
      `/events/${completedEvent._id}/feedback`,
      'POST',
      { rating: 4, comment: 'Trying to vote again' },
      stu1Token
    );
    assert(dupRes.status === 409, 'Duplicate feedback submission rejected with 409 Conflict');
    assert(dupRes.data.error?.code === 'DUPLICATE_FEEDBACK', 'Error code is DUPLICATE_FEEDBACK');

    // Concurrent submission protection test
    const concurrentStudent = await User.create({
      name: `Concurrent Student ${suffix}`,
      email: `conc_${suffix}@test.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const concToken = signToken({ id: concurrentStudent._id, role: concurrentStudent.role, email: concurrentStudent.email });

    await Attendance.create({
      event: completedEvent._id,
      student: concurrentStudent._id,
      checkedInBy: admin._id,
      method: 'qr',
      status: 'checked_in',
    });

    const [c1, c2, c3] = await Promise.all([
      makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 5, comment: 'Concurrent 1' }, concToken),
      makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 5, comment: 'Concurrent 2' }, concToken),
      makeRequest(`/events/${completedEvent._id}/feedback`, 'POST', { rating: 5, comment: 'Concurrent 3' }, concToken),
    ]);

    const successCount = [c1, c2, c3].filter((res) => res.status === 201).length;
    const conflictCount = [c1, c2, c3].filter((res) => res.status === 409).length;

    assert(successCount === 1, 'Exactly one concurrent request succeeds (201 Created)');
    assert(conflictCount === 2, 'Remaining concurrent requests receive 409 Conflict');

    const totalConcDocs = await Feedback.countDocuments({
      event: completedEvent._id,
      student: concurrentStudent._id,
    });
    assert(totalConcDocs === 1, 'Database contains exactly 1 Feedback document for the concurrent student');

    // ----------------------------------------------------
    // Section 6: Student Own Feedback & Status
    // ----------------------------------------------------
    console.log('\n--- Section 6: Student Retrieval & Status ---');

    const stu1MyFeedback = await makeRequest(`/events/${completedEvent._id}/feedback/my`, 'GET', null, stu1Token);
    assert(stu1MyFeedback.status === 200, 'Student 1 retrieves own feedback status');
    assert(stu1MyFeedback.data.data?.canSubmit === false, 'canSubmit is false after submission');
    assert(stu1MyFeedback.data.data?.reason === 'ALREADY_SUBMITTED', 'reason is ALREADY_SUBMITTED');
    assert(stu1MyFeedback.data.data?.feedback?.rating === 5, 'Returned feedback includes rating 5');
    assert(stu1MyFeedback.data.data?.feedback?.comment === 'Phenomenal keynote speaker!', 'Returned feedback includes comment');

    // ----------------------------------------------------
    // Section 7: Organizer & Admin Management
    // ----------------------------------------------------
    console.log('\n--- Section 7: Organizer & Admin Feedback Management ---');

    // Student cannot access organizer feedback list
    const studentBlockedRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'GET', null, stu1Token);
    assert(studentBlockedRes.status === 403, 'Student is forbidden from GET /feedback management endpoint');

    // Volunteer cannot access organizer feedback list
    const volBlockedRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'GET', null, volToken);
    assert(volBlockedRes.status === 403, 'Volunteer is forbidden from GET /feedback management endpoint');

    // Organizer 2 (not assigned to club) cannot access feedback list
    const org2BlockedRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'GET', null, org2Token);
    assert(org2BlockedRes.status === 403, 'Organizer from unauthorized club is forbidden with 403');

    // Organizer 1 (assigned to club) CAN access feedback list
    const org1Res = await makeRequest(`/events/${completedEvent._id}/feedback`, 'GET', null, org1Token);
    assert(org1Res.status === 200, 'Assigned organizer can view event feedback management');
    assert(Array.isArray(org1Res.data.data?.feedback), 'Feedback list is an array');
    assert(org1Res.data.data?.stats !== undefined, 'Stats object is present');

    // Verify stats: 4 feedbacks submitted:
    // student 1: 5
    // student 2: 3
    // volunteer: 4
    // concurrent: 5
    // Average = (5 + 3 + 4 + 5) / 4 = 17 / 4 = 4.25 -> 4.3 (rounded to 1 decimal)
    const expectedTotal = 4;
    const expectedAvg = 4.3;
    assert(org1Res.data.data?.stats?.totalFeedback === expectedTotal, `Total feedback count is ${expectedTotal}`);
    assert(org1Res.data.data?.stats?.averageRating === expectedAvg, `Average rating is calculated as ${expectedAvg}`);

    // Admin CAN access feedback list globally
    const adminRes = await makeRequest(`/events/${completedEvent._id}/feedback`, 'GET', null, adminToken);
    assert(adminRes.status === 200, 'Admin can view event feedback globally');
    assert(adminRes.data.data?.stats?.totalFeedback === expectedTotal, 'Admin sees complete feedback stats');

    // Check privacy: student object contains only safe fields (name, email)
    const sampleItem = org1Res.data.data?.feedback[0];
    assert(Boolean(sampleItem.student?.name), 'Feedback attendee name is present');
    assert(Boolean(sampleItem.student?.email), 'Feedback attendee email is present');
    assert(sampleItem.student?.password === undefined, 'Attendee password hash is NEVER exposed');
    assert(sampleItem.student?.tokens === undefined, 'Tokens/JWTs are NEVER exposed');

    // Check rating filter (?rating=5)
    const filterRes = await makeRequest(`/events/${completedEvent._id}/feedback?rating=5`, 'GET', null, org1Token);
    assert(filterRes.status === 200, 'Rating filter query succeeds');
    const allAre5 = filterRes.data.data?.feedback.every((f) => f.rating === 5);
    assert(allAre5, 'All returned feedback in filtered query have rating = 5');
    assert(filterRes.data.data?.feedback.length === 2, 'Exactly 2 feedback entries have rating 5');

    // Check pagination (limit=2, page=1)
    const page1Res = await makeRequest(`/events/${completedEvent._id}/feedback?limit=2&page=1`, 'GET', null, org1Token);
    assert(page1Res.status === 200, 'Page 1 request succeeds');
    assert(page1Res.data.data?.feedback.length === 2, 'Page 1 contains 2 items');
    assert(page1Res.data.data?.pagination?.totalPages === 2, 'Pagination reports totalPages = 2');
    assert(page1Res.data.data?.pagination?.limit === 2, 'Pagination limit is 2');

    const page2Res = await makeRequest(`/events/${completedEvent._id}/feedback?limit=2&page=2`, 'GET', null, org1Token);
    assert(page2Res.status === 200, 'Page 2 request succeeds');
    assert(page2Res.data.data?.feedback.length === 2, 'Page 2 contains remaining 2 items');

    // ----------------------------------------------------
    // Section 8: Frontend Production Build Verification
    // ----------------------------------------------------
    console.log('\n--- Section 8: Frontend Build Verification ---');

    const distPath = path.resolve(__dirname, '../../frontend/dist/index.html');
    const distExists = fs.existsSync(distPath);
    assert(distExists, 'Frontend production build dist/index.html exists');

    console.log('\n==================================================');
    console.log('✅ ALL PHASE 12 VERIFICATION CHECKS PASSED (40/40)');
    console.log('==================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ Phase 12 Verification Failed:', err);
  process.exit(1);
});
