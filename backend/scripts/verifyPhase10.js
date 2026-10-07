const mongoose = require('mongoose');
const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Waitlist = require('../models/Waitlist');
const { Notification } = require('../models/Notification');
const notificationService = require('../services/notificationService');
const registrationService = require('../services/registrationService');
const waitlistService = require('../services/waitlistService');
const eventService = require('../services/eventService');
const { signToken } = require('../utils/jwt');

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

const runVerification = async () => {
  console.log('====================================================');
  console.log('PHASE 10 NOTIFICATIONS & ANNOUNCEMENTS VERIFICATION');
  console.log('====================================================\n');

  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.\n');

  try {
    // Clean up previous test notifications
    await Notification.deleteMany({ 'metadata.testSuite': 'phase10' });

    // Setup Test Users
    const suffix = Date.now();
    const defaultHash = await User.hashPassword('Pass@1234');
    const adminUser = await User.create({
      name: `Admin P10 ${suffix}`,
      email: `admin_p10_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'admin',
      isActive: true,
    });
    const adminToken = signToken({ id: adminUser._id, role: adminUser.role });

    const orgUserA = await User.create({
      name: `Org A P10 ${suffix}`,
      email: `org_a_p10_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });
    const orgTokenA = signToken({ id: orgUserA._id, role: orgUserA.role });

    const orgUserB = await User.create({
      name: `Org B P10 ${suffix}`,
      email: `org_b_p10_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'organizer',
      isActive: true,
    });
    const orgTokenB = signToken({ id: orgUserB._id, role: orgUserB.role });

    const student1 = await User.create({
      name: `Student 1 P10 ${suffix}`,
      email: `student1_p10_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const student1Token = signToken({ id: student1._id, role: student1.role });

    const student2 = await User.create({
      name: `Student 2 P10 ${suffix}`,
      email: `student2_p10_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: true,
    });
    const student2Token = signToken({ id: student2._id, role: student2.role });

    const inactiveStudent = await User.create({
      name: `Inactive Student P10 ${suffix}`,
      email: `inactive_p10_${suffix}@campus.edu`,
      passwordHash: defaultHash,
      role: 'student',
      isActive: false,
    });

    // Setup Club & Event
    const clubA = await Club.create({
      name: `Tech Club P10 ${suffix}`,
      description: 'Testing Notifications Club',
      category: 'Technical',
      organizers: [orgUserA._id],
    });

    const now = new Date();
    const startDateTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);
    const regDeadline = new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);

    const event = await Event.create({
      title: `Grand Hackathon P10 ${suffix}`,
      description: 'Annual hackathon event for testing notifications',
      category: 'Technical',
      club: clubA._id,
      createdBy: orgUserA._id,
      startDateTime,
      endDateTime,
      registrationDeadline: regDeadline,
      capacity: 1, // Only 1 seat so student 2 goes to waitlist
      registeredCount: 0,
      venue: 'Main Auditorium Hall A',
      status: 'published',
    });

    console.log('TEST 1: Inactive Recipient Guard');
    const inactiveNotif = await notificationService.createNotification({
      recipient: inactiveStudent._id,
      type: 'ORGANIZER_ANNOUNCEMENT',
      title: 'Test Inactive',
      message: 'Should not be delivered',
      metadata: { testSuite: 'phase10' },
    });
    assert(inactiveNotif === null, 'Notifications are not created for inactive recipients');

    console.log('\nTEST 2: Registration Confirmation Trigger');
    const reg1 = await registrationService.registerForEvent(event._id, student1);
    assert(reg1.registration.status === 'active', 'Student 1 registered successfully');

    // Verify student 1 received REGISTRATION_CONFIRMED notification
    const resUnread1 = await makeRequest('/notifications/unread-count', 'GET', null, student1Token);
    assert(resUnread1.status === 200, 'GET /notifications/unread-count returned 200');
    assert(resUnread1.data.data.count >= 1, 'Student 1 has at least 1 unread notification');

    const resList1 = await makeRequest('/notifications', 'GET', null, student1Token);
    assert(resList1.status === 200, 'GET /notifications returned 200');
    assert(resList1.data.data.notifications.length >= 1, 'Notifications list returned items');
    const regConfNotif = resList1.data.data.notifications.find((n) => n.type === 'REGISTRATION_CONFIRMED');
    assert(regConfNotif !== undefined, 'Found REGISTRATION_CONFIRMED notification');
    assert(regConfNotif.isRead === false, 'Notification is marked unread initially');
    assert(regConfNotif.event._id.toString() === event._id.toString(), 'Notification references correct event');

    console.log('\nTEST 3: Dedup Protection');
    // Try to trigger the exact same registration notification again
    const dupNotif = await notificationService.notifyRegistrationConfirmed(student1._id, event);
    assert(
      dupNotif && dupNotif._id.toString() === regConfNotif._id.toString(),
      'Duplicate registration notification with identical dedupKey returned existing record without duplicating'
    );
    const countRegNotifs = await Notification.countDocuments({
      recipient: student1._id,
      type: 'REGISTRATION_CONFIRMED',
    });
    assert(countRegNotifs === 1, 'Only 1 REGISTRATION_CONFIRMED notification document exists in database');

    console.log('\nTEST 4: Waitlist Join & Promotion Trigger');
    // Student 2 joins waitlist (event is full, capacity 1, registered 1)
    const wlEntry = await waitlistService.joinWaitlist(event._id, student2);
    assert(wlEntry.waitlist.status === 'waiting', 'Student 2 placed on waitlist');

    // Cancel Student 1 registration -> triggers promotion of Student 2
    await registrationService.cancelRegistration(event._id, student1);

    // Student 1 should have received REGISTRATION_CANCELLED
    const resList1AfterCancel = await makeRequest('/notifications', 'GET', null, student1Token);
    const cancelNotif = resList1AfterCancel.data.data.notifications.find(
      (n) => n.type === 'REGISTRATION_CANCELLED'
    );
    assert(cancelNotif !== undefined, 'Student 1 received REGISTRATION_CANCELLED notification');

    // Student 2 should have received WAITLIST_PROMOTED
    const resList2 = await makeRequest('/notifications', 'GET', null, student2Token);
    const promoteNotif = resList2.data.data.notifications.find((n) => n.type === 'WAITLIST_PROMOTED');
    assert(promoteNotif !== undefined, 'Student 2 received WAITLIST_PROMOTED notification');
    assert(promoteNotif.isRead === false, 'Student 2 promotion notification is unread');

    console.log('\nTEST 5: Authorization Boundary for Notifications');
    // Student 2 tries to mark Student 1's notification as read
    const crossReadRes = await makeRequest(
      `/notifications/${regConfNotif._id}/read`,
      'PATCH',
      {},
      student2Token
    );
    assert(crossReadRes.status === 403, 'Cross-user mark-as-read is strictly forbidden (403)');

    console.log('\nTEST 6: Mark Single Notification As Read (Idempotent)');
    const markReadRes1 = await makeRequest(
      `/notifications/${regConfNotif._id}/read`,
      'PATCH',
      {},
      student1Token
    );
    assert(markReadRes1.status === 200, 'Student 1 marked own notification as read (200)');
    assert(markReadRes1.data.data.notification.isRead === true, 'isRead is true');
    assert(markReadRes1.data.data.notification.readAt !== null, 'readAt is set');

    // Mark it read again to verify idempotency
    const markReadRes2 = await makeRequest(
      `/notifications/${regConfNotif._id}/read`,
      'PATCH',
      {},
      student1Token
    );
    assert(markReadRes2.status === 200, 'Second mark-as-read call succeeded idempotently (200)');

    console.log('\nTEST 7: Mark All As Read');
    const readAllRes = await makeRequest('/notifications/read-all', 'PATCH', {}, student1Token);
    assert(readAllRes.status === 200, 'PATCH /notifications/read-all returned 200');

    const unreadCountAfterReadAll = await makeRequest(
      '/notifications/unread-count',
      'GET',
      null,
      student1Token
    );
    assert(unreadCountAfterReadAll.data.data.count === 0, 'Unread count is 0 after mark-all-read');

    console.log('\nTEST 8: Event Announcements (Access Control & Delivery)');
    // Organizer B (not managing Club A) tries to post announcement -> 403
    const unauthAnnounceRes = await makeRequest(
      `/events/${event._id}/announcements`,
      'POST',
      { title: 'Unauthorized', message: 'This should fail' },
      orgTokenB
    );
    assert(unauthAnnounceRes.status === 403, 'Non-managing organizer receives 403 on announcements');

    // Student tries to post announcement -> 403
    const studentAnnounceRes = await makeRequest(
      `/events/${event._id}/announcements`,
      'POST',
      { title: 'Student', message: 'This should fail' },
      student1Token
    );
    assert(studentAnnounceRes.status === 403, 'Student receives 403 on announcements');

    // Validation check: empty title or message -> 400
    const badAnnounceRes = await makeRequest(
      `/events/${event._id}/announcements`,
      'POST',
      { title: '', message: '' },
      orgTokenA
    );
    assert(badAnnounceRes.status === 400, 'Empty title/message is rejected (400)');

    // Organizer A posts valid announcement
    const announceRes = await makeRequest(
      `/events/${event._id}/announcements`,
      'POST',
      {
        title: 'Important Hackathon Guidelines',
        message: 'Please bring your college ID and laptops with chargers.',
      },
      orgTokenA
    );
    assert(announceRes.status === 201, 'Organizer A successfully published announcement (201)');
    assert(announceRes.data.data.announcement.recipientCount >= 1, 'Announcement delivered to audience');

    // Admin can also post announcement
    const adminAnnounceRes = await makeRequest(
      `/events/${event._id}/announcements`,
      'POST',
      {
        title: 'Campus Admin Note',
        message: 'All participants must park in Parking Lot 2.',
      },
      adminToken
    );
    assert(adminAnnounceRes.status === 201, 'Admin successfully published announcement (201)');

    // Student 2 (currently registered) should see the announcements
    const student2Notifs = await makeRequest('/notifications', 'GET', null, student2Token);
    const announcements = student2Notifs.data.data.notifications.filter(
      (n) => n.type === 'ORGANIZER_ANNOUNCEMENT'
    );
    assert(announcements.length >= 2, 'Student 2 received both organizer and admin announcements');

    console.log('\nTEST 9: Schedule & Venue Change Triggers');
    // Update venue of the event
    await eventService.updateEvent(event._id, { venue: 'Innovation Lab 301' }, orgUserA);

    const student2AfterVenue = await makeRequest('/notifications', 'GET', null, student2Token);
    const venueNotif = student2AfterVenue.data.data.notifications.find(
      (n) => n.type === 'EVENT_VENUE_CHANGED'
    );
    assert(venueNotif !== undefined, 'Student 2 received EVENT_VENUE_CHANGED notification');
    assert(venueNotif.message.includes('Innovation Lab 301'), 'Venue notification contains new venue');

    // Update date/time of the event
    const shiftedStart = new Date(startDateTime.getTime() + 24 * 60 * 60 * 1000);
    const shiftedEnd = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
    await eventService.updateEvent(
      event._id,
      {
        startDateTime: shiftedStart.toISOString(),
        endDateTime: shiftedEnd.toISOString(),
      },
      orgUserA
    );

    const student2AfterDate = await makeRequest('/notifications', 'GET', null, student2Token);
    const dateNotif = student2AfterDate.data.data.notifications.find(
      (n) => n.type === 'EVENT_DATE_CHANGED'
    );
    assert(dateNotif !== undefined, 'Student 2 received EVENT_DATE_CHANGED notification');

    console.log('\nTEST 10: Event Cancellation Trigger');
    await eventService.cancelEvent(event._id, 'Unforeseen campus maintenance', orgUserA);

    const student2AfterCancel = await makeRequest('/notifications', 'GET', null, student2Token);
    const evCancelNotif = student2AfterCancel.data.data.notifications.find(
      (n) => n.type === 'EVENT_CANCELLED'
    );
    assert(evCancelNotif !== undefined, 'Student 2 received EVENT_CANCELLED notification');
    assert(
      evCancelNotif.message.includes('Unforeseen campus maintenance'),
      'Cancellation notification includes reason'
    );

    console.log('\nTEST 11: Pagination and Filtering');
    const pagedRes = await makeRequest('/notifications?page=1&limit=2', 'GET', null, student2Token);
    assert(pagedRes.status === 200, 'GET /notifications with pagination returned 200');
    assert(pagedRes.data.data.notifications.length === 2, 'Limit 2 respected');
    assert(pagedRes.data.data.pagination.page === 1, 'Page 1 pagination object returned');
    assert(pagedRes.data.data.pagination.total >= 4, 'Total notifications accurately counted');

    const unreadFilterRes = await makeRequest(
      '/notifications?isRead=false',
      'GET',
      null,
      student2Token
    );
    assert(
      unreadFilterRes.data.data.notifications.every((n) => n.isRead === false),
      'isRead=false filter accurately filters only unread notifications'
    );

    console.log('\n====================================================');
    console.log('✅ ALL PHASE 10 VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } finally {
    await mongoose.disconnect();
  }
};

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION RUN FAILED:', err);
  process.exit(1);
});
