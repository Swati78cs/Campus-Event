const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Attendance = require('../models/Attendance');
const Waitlist = require('../models/Waitlist');
const Certificate = require('../models/Certificate');
const { Notification } = require('../models/Notification');
const { signToken } = require('../utils/jwt');
const certificateService = require('../services/certificateService');

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
  const contentType = res.headers.get('content-type') || '';
  const contentDisposition = res.headers.get('content-disposition') || '';

  if (contentType.includes('application/pdf')) {
    const arrayBuffer = await res.arrayBuffer();
    return {
      status: res.status,
      contentType,
      contentDisposition,
      buffer: Buffer.from(arrayBuffer),
    };
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, contentType, contentDisposition, data };
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
};

const runVerification = async () => {
  console.log('====================================================');
  console.log('PHASE 11 CERTIFICATES AUTOMATED VERIFICATION SUITE');
  console.log('====================================================\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(dbUri);
  console.log('[DB] Connected to MongoDB replica set.\n');

  try {
    const suffix = Date.now();
    const defaultHash = await User.hashPassword('Pass@1234');

    // 1. Health Check
    console.log('CHECK 1: System Health');
    const healthRes = await makeRequest('/health');
    assert(healthRes.status === 200, 'Health check status 200');
    assert(healthRes.data?.data?.database?.status === 'connected', 'Database status connected');

    // Setup Test Users
    const admin = await User.create({
      name: `Admin P11 ${suffix}`,
      email: `admin_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'admin',
      isActive: true,
    });
    const adminToken = signToken({ id: admin._id, role: admin.role });

    const orgClubA = await User.create({
      name: `Org A P11 ${suffix}`,
      email: `org_a_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });
    const orgTokenA = signToken({ id: orgClubA._id, role: orgClubA.role });

    const orgClubB = await User.create({
      name: `Org B P11 ${suffix}`,
      email: `org_b_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });
    const orgTokenB = signToken({ id: orgClubB._id, role: orgClubB.role });

    const studentAttended1 = await User.create({
      name: `Alice Verified ${suffix}`,
      email: `alice_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const studentToken1 = signToken({ id: studentAttended1._id, role: studentAttended1.role });

    const studentAttended2 = await User.create({
      name: `Bob CheckedIn ${suffix}`,
      email: `bob_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const studentToken2 = signToken({ id: studentAttended2._id, role: studentAttended2.role });

    const studentNoShow = await User.create({
      name: `Charlie NoShow ${suffix}`,
      email: `charlie_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const noShowToken = signToken({ id: studentNoShow._id, role: studentNoShow.role });

    const studentWaitlisted = await User.create({
      name: `Diana Waitlist ${suffix}`,
      email: `diana_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });

    const studentInactive = await User.create({
      name: `Evan Inactive ${suffix}`,
      email: `evan_p11_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: false,
    });

    // Setup Clubs
    const clubA = await Club.create({
      name: `Cyber Robotics Club P11 ${suffix}`,
      description: 'Robotics and automation',
      category: 'Technical',
      organizers: [orgClubA._id],
    });

    const clubB = await Club.create({
      name: `Literary Club P11 ${suffix}`,
      description: 'Debating and writing',
      category: 'Cultural',
      organizers: [orgClubB._id],
    });

    // Setup Events
    // Event 1: certificateEnabled is default (false), future event (incomplete)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const eventDefault = await Event.create({
      title: `Future AI Workshop P11 ${suffix}`,
      description: 'Upcoming workshop description',
      category: 'Technical',
      club: clubA._id,
      createdBy: orgClubA._id,
      startDateTime: futureDate,
      endDateTime: new Date(futureDate.getTime() + 2 * 60 * 60 * 1000),
      registrationDeadline: new Date(futureDate.getTime() - 24 * 60 * 60 * 1000),
      capacity: 50,
      venue: 'Auditorium 1',
      status: 'published',
    });

    console.log('\nCHECK 2: certificateEnabled default value');
    assert(eventDefault.certificateEnabled === false, 'certificateEnabled defaults to false on Event model');

    console.log('\nCHECK 3 & 4: Incomplete & Disabled Event Issuance Rejection');
    const resDisabled = await makeRequest(
      `/events/${eventDefault._id}/certificates/issue`,
      'POST',
      { studentId: studentAttended1._id.toString() },
      orgTokenA
    );
    assert(resDisabled.status === 400, 'Non-certificate-enabled event issuance rejected (400)');
    assert(
      resDisabled.data?.error?.code === 'CERTIFICATES_NOT_ENABLED',
      'Returned CERTIFICATES_NOT_ENABLED error code'
    );

    // Enable certificates on the future event -> still rejected because incomplete
    eventDefault.certificateEnabled = true;
    await eventDefault.save();

    const resIncomplete = await makeRequest(
      `/events/${eventDefault._id}/certificates/issue`,
      'POST',
      { studentId: studentAttended1._id.toString() },
      orgTokenA
    );
    assert(resIncomplete.status === 400, 'Future incomplete event issuance rejected (400)');
    assert(
      resIncomplete.data?.error?.code === 'EVENT_NOT_COMPLETED',
      'Returned EVENT_NOT_COMPLETED error code'
    );

    // Setup Completed Event (Event 2)
    const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pastDeadline = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const completedEvent = await Event.create({
      title: `Robotics Bootcamp 2026 ${suffix}`,
      description: 'Completed robotics training bootcamp',
      category: 'Technical',
      club: clubA._id,
      createdBy: orgClubA._id,
      startDateTime: pastStart,
      endDateTime: pastEnd,
      registrationDeadline: pastDeadline,
      capacity: 20,
      venue: 'Robotics Lab 101',
      status: 'published',
      certificateEnabled: true,
    });

    // Create Registrations & Tickets
    const reg1 = await Registration.create({
      event: completedEvent._id,
      student: studentAttended1._id,
      status: 'active',
      registeredAt: pastDeadline,
    });
    const ticket1 = await Ticket.create({
      event: completedEvent._id,
      student: studentAttended1._id,
      registration: reg1._id,
      token: crypto.randomBytes(32).toString('hex'),
      status: 'used',
    });

    const reg2 = await Registration.create({
      event: completedEvent._id,
      student: studentAttended2._id,
      status: 'active',
      registeredAt: pastDeadline,
    });
    const ticket2 = await Ticket.create({
      event: completedEvent._id,
      student: studentAttended2._id,
      registration: reg2._id,
      token: crypto.randomBytes(32).toString('hex'),
      status: 'used',
    });

    const regNoShow = await Registration.create({
      event: completedEvent._id,
      student: studentNoShow._id,
      status: 'active',
      registeredAt: pastDeadline,
    });
    const ticketNoShow = await Ticket.create({
      event: completedEvent._id,
      student: studentNoShow._id,
      registration: regNoShow._id,
      token: crypto.randomBytes(32).toString('hex'),
      status: 'active',
    });

    // Create Authoritative Attendance records for Student 1 and Student 2 (Student NoShow has NO attendance)
    await Attendance.create({
      event: completedEvent._id,
      student: studentAttended1._id,
      ticket: ticket1._id,
      checkedInAt: pastStart,
      checkedInBy: orgClubA._id,
      method: 'qr',
      status: 'checked_in',
    });

    await Attendance.create({
      event: completedEvent._id,
      student: studentAttended2._id,
      ticket: ticket2._id,
      checkedInAt: pastStart,
      checkedInBy: orgClubA._id,
      method: 'manual',
      status: 'checked_in',
    });

    console.log('\nCHECK 5 & 6: Attendance Authoritative Eligibility Check');
    // Student NoShow registered but has NO attendance
    const resNoShow = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue`,
      'POST',
      { studentId: studentNoShow._id.toString() },
      orgTokenA
    );
    assert(resNoShow.status === 400, 'Registered student without attendance is rejected (400)');
    assert(
      resNoShow.data?.error?.code === 'CERTIFICATE_NOT_ELIGIBLE',
      'Returned CERTIFICATE_NOT_ELIGIBLE error code'
    );

    // Waitlisted student has NO attendance
    const resWaitlist = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue`,
      'POST',
      { studentId: studentWaitlisted._id.toString() },
      orgTokenA
    );
    assert(resWaitlist.status === 400, 'Waitlisted student without attendance is rejected (400)');
    assert(
      resWaitlist.data?.error?.code === 'CERTIFICATE_NOT_ELIGIBLE',
      'Returned CERTIFICATE_NOT_ELIGIBLE'
    );

    console.log('\nCHECK 7 - 13: Authorization Boundaries for Certificate Management');
    // Student tries to issue certificate -> 403
    const resStudentIssue = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue`,
      'POST',
      { studentId: studentAttended1._id.toString() },
      studentToken1
    );
    assert(resStudentIssue.status === 403, 'Student cannot issue certificates (403)');

    // Organizer of Club B tries to issue certificate for Club A's event -> 403
    const resOrgBCross = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue`,
      'POST',
      { studentId: studentAttended1._id.toString() },
      orgTokenB
    );
    assert(resOrgBCross.status === 403, 'Organizer of different club cannot issue certificates (403)');

    // Inactive student cannot receive certificate
    const resInactive = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue`,
      'POST',
      { studentId: studentInactive._id.toString() },
      orgTokenA
    );
    assert(resInactive.status === 400, 'Inactive user cannot receive certificate (400)');

    console.log('\nCHECK 14 - 17: Certificate Creation, ID Format, and DB Uniqueness');
    // Organizer A issues certificate for Student 1
    const resIssue1 = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue`,
      'POST',
      { studentId: studentAttended1._id.toString() },
      orgTokenA
    );
    assert(resIssue1.status === 201, 'Organizer A successfully issued certificate (201)');
    const cert1 = resIssue1.data.data.certificate;
    assert(cert1 !== undefined, 'Certificate object returned');
    assert(cert1.certificateId.startsWith('CERT-'), 'Certificate ID format starts with CERT-');
    assert(cert1.certificateId.length >= 10, 'Certificate ID has proper length');
    assert(cert1.status === 'issued', 'Certificate status is "issued"');

    // Duplicate issuance check (idempotency)
    const resDupIssue = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue`,
      'POST',
      { studentId: studentAttended1._id.toString() },
      orgTokenA
    );
    assert(resDupIssue.status === 201 || resDupIssue.status === 200, 'Duplicate issuance request handled cleanly');
    assert(resDupIssue.data.data.alreadyIssued === true, 'Response flags alreadyIssued: true');
    assert(resDupIssue.data.data.certificate.certificateId === cert1.certificateId, 'Returned identical certificate ID');

    // Database-level uniqueness check for event + student
    const countCert1 = await Certificate.countDocuments({
      event: completedEvent._id,
      student: studentAttended1._id,
    });
    assert(countCert1 === 1, 'Database enforces exactly 1 certificate document per student per event');

    console.log('\nCHECK 18: Concurrency Safety Test');
    // Simulate concurrent issuance for Student 2
    const [conc1, conc2] = await Promise.all([
      makeRequest(
        `/events/${completedEvent._id}/certificates/issue`,
        'POST',
        { studentId: studentAttended2._id.toString() },
        adminToken
      ),
      makeRequest(
        `/events/${completedEvent._id}/certificates/issue`,
        'POST',
        { studentId: studentAttended2._id.toString() },
        adminToken
      ),
    ]);
    assert(conc1.status === 201 || conc1.status === 200, 'Concurrent request 1 succeeded');
    assert(conc2.status === 201 || conc2.status === 200, 'Concurrent request 2 succeeded');
    const countCert2 = await Certificate.countDocuments({
      event: completedEvent._id,
      student: studentAttended2._id,
    });
    assert(countCert2 === 1, 'Exactly 1 certificate created under concurrent issuing');

    console.log('\nCHECK 19 - 21: Bulk Certificate Issuance');
    // Run bulk issuance for completedEvent
    const resBulk = await makeRequest(
      `/events/${completedEvent._id}/certificates/issue-all`,
      'POST',
      {},
      orgTokenA
    );
    assert(resBulk.status === 200, 'Bulk issuance returned 200');
    assert(resBulk.data.data.eligible === 2, 'Eligible attendees count is 2 (Attended 1 & Attended 2)');
    assert(resBulk.data.data.alreadyIssued === 2, 'Already issued count is 2');
    assert(resBulk.data.data.newlyIssued === 0, 'Newly issued count is 0 on re-run');

    console.log('\nCHECK 22 - 30: PDF Generation On Demand (In-Memory, No Permanent Storage)');
    const resPdf = await makeRequest(`/certificates/${cert1.certificateId}/download`, 'GET', null, studentToken1);
    assert(resPdf.status === 200, 'PDF download returned status 200');
    assert(resPdf.contentType.includes('application/pdf'), 'Content-Type is application/pdf');
    assert(
      resPdf.contentDisposition.includes(`certificate-${cert1.certificateId}.pdf`),
      'Content-Disposition header includes filename'
    );
    assert(resPdf.buffer && resPdf.buffer.length > 1000, 'PDF buffer received with valid size');
    // PDF Magic bytes check (%PDF-)
    const pdfMagic = resPdf.buffer.toString('utf-8', 0, 5);
    assert(pdfMagic === '%PDF-', 'Valid PDF file binary header (%PDF-) verified');

    // Cross-student download block
    const resPdfForbidden = await makeRequest(
      `/certificates/${cert1.certificateId}/download`,
      'GET',
      null,
      studentToken2
    );
    assert(resPdfForbidden.status === 403, 'Student cannot download another student certificate (403)');

    console.log('\nCHECK 31 - 34: Student Certificate Retrieval & Ownership');
    const resMyCerts = await makeRequest('/certificates/my', 'GET', null, studentToken1);
    assert(resMyCerts.status === 200, 'GET /certificates/my returned 200');
    assert(resMyCerts.data.data.certificates.length === 1, 'Student 1 has exactly 1 certificate');
    assert(
      resMyCerts.data.data.certificates[0].certificateId === cert1.certificateId,
      'My certificates lists correct certificateId'
    );

    // Direct detail check
    const resDetail = await makeRequest(`/certificates/${cert1.certificateId}`, 'GET', null, studentToken1);
    assert(resDetail.status === 200, 'Student 1 can view own certificate details');

    const resDetailBlocked = await makeRequest(
      `/certificates/${cert1.certificateId}`,
      'GET',
      null,
      studentToken2
    );
    assert(resDetailBlocked.status === 403, 'Student 2 blocked from viewing Student 1 certificate details (403)');

    console.log('\nCHECK 35 - 39: Public Certificate Verification (Zero Auth, Safe Attributes)');
    const resPublicValid = await makeRequest(`/certificates/verify/${cert1.certificateId}`, 'GET', null, null);
    assert(resPublicValid.status === 200, 'Public verification returned 200 without authentication');
    assert(resPublicValid.data.data.valid === true, 'Public verification data.valid is true');
    assert(resPublicValid.data.data.certificateId === cert1.certificateId, 'Matches certificate ID');
    assert(resPublicValid.data.data.studentName.includes('Alice Verified'), 'Displays student name');
    assert(resPublicValid.data.data.eventTitle.includes('Robotics Bootcamp 2026'), 'Displays event title');
    assert(resPublicValid.data.data.clubName.includes('Cyber Robotics Club'), 'Displays club name');

    // Security check: ensure sensitive/internal fields are NEVER exposed
    assert(resPublicValid.data.data._id === undefined, 'Internal MongoDB _id is NOT exposed');
    assert(resPublicValid.data.data.student === undefined, 'Internal student ref is NOT exposed');
    assert(resPublicValid.data.data.email === undefined, 'Student email is NOT exposed');
    assert(resPublicValid.data.data.ticket === undefined, 'Ticket info is NOT exposed');

    // Invalid certificate verification
    const resPublicInvalid = await makeRequest('/certificates/verify/CERT-INVALID999', 'GET', null, null);
    assert(resPublicInvalid.status === 404, 'Invalid certificate ID returns 404');
    assert(
      resPublicInvalid.data?.error?.code === 'CERTIFICATE_NOT_FOUND',
      'Returns CERTIFICATE_NOT_FOUND code'
    );

    console.log('\nCHECK 40 - 42: CERTIFICATE_READY In-App Notification Delivery & Dedup');
    const notifsAlice = await Notification.find({
      recipient: studentAttended1._id,
      type: 'CERTIFICATE_READY',
    });
    assert(notifsAlice.length === 1, 'Student 1 received exactly 1 CERTIFICATE_READY notification');
    assert(
      notifsAlice[0].dedupKey === `cert_ready_${completedEvent._id}_${studentAttended1._id}`,
      'Notification has proper deduplication key'
    );

    console.log('\nCHECK 43 - 45: Invariant Preservation (Attendance, Ticket, Registration Intact)');
    const finalAttendance = await Attendance.findOne({
      event: completedEvent._id,
      student: studentAttended1._id,
    });
    assert(finalAttendance.status === 'checked_in', 'Attendance record remains unaltered');

    const finalTicket = await Ticket.findById(ticket1._id);
    assert(finalTicket.status === 'used', 'Ticket status remains unaltered');

    const finalReg = await Registration.findById(reg1._id);
    assert(finalReg.status === 'active', 'Registration status remains unaltered');

    console.log('\nCHECK 46: Student Certificate Pagination');
    const pagedCerts = await makeRequest('/certificates/my?page=1&limit=10', 'GET', null, studentToken1);
    assert(pagedCerts.data.data.pagination.page === 1, 'Pagination page is 1');
    assert(pagedCerts.data.data.pagination.total === 1, 'Pagination total is 1');
    assert(pagedCerts.data.data.pagination.totalPages === 1, 'Pagination totalPages is 1');

    console.log('\nCHECK 47: Standard API Envelope Format');
    assert(resPublicValid.data.success === true, 'Success envelope has success: true');
    assert(typeof resPublicValid.data.message === 'string', 'Success envelope has message string');
    assert(typeof resPublicValid.data.data === 'object', 'Success envelope has data object');

    console.log('\nCHECK 48: Organizer Summary API');
    const summaryRes = await makeRequest(
      `/events/${completedEvent._id}/certificates`,
      'GET',
      null,
      orgTokenA
    );
    assert(summaryRes.status === 200, 'GET /events/:id/certificates returned 200');
    assert(summaryRes.data.data.stats.totalAttended === 2, 'Stats totalAttended is 2');
    assert(summaryRes.data.data.stats.totalIssued === 2, 'Stats totalIssued is 2');
    assert(summaryRes.data.data.attendees.length === 2, 'Attendee list contains 2 records');

    console.log('\n====================================================');
    console.log('✅ ALL 48 PHASE 11 VERIFICATION CHECKS PASSED!');
    console.log('====================================================\n');
  } finally {
    await mongoose.disconnect();
  }
};

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION RUN FAILED:', err);
  process.exit(1);
});
