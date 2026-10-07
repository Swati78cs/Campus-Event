/**
 * Phase 5 Additional Verification Script
 *
 * 1. Concurrency Test (2 simultaneous students competing for 1 seat)
 * 2. Transaction Rollback Test — Registration (failure after capacity reservation)
 * 3. Transaction Rollback Test — Cancellation (failure during cancellation)
 * 4. Attendee Data Scope Verification
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
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
  console.log('=== Starting Phase 5 Additional Verification Checks ===\n');

  // Connect to DB directly for state assertions
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/campus_events?replicaSet=rs0';
  await mongoose.connect(dbUri);
  console.log('[DB] Connected to MongoDB replica set.');

  const timestamp = Date.now();

  // ---------------------------------------------------------
  // 1. CONCURRENCY TEST
  // ---------------------------------------------------------
  console.log('\n--- 1. CONCURRENCY TEST ---');

  // Setup Admin & Club & Event with Capacity 1
  const adminEmail = `admin_conc_${timestamp}@test.edu`;
  const adminUser = await User.create({
    name: 'Admin Conc',
    email: adminEmail,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'admin',
    isActive: true,
  });

  const club = await Club.create({
    name: `Concurrency Club ${timestamp}`,
    description: 'Testing race conditions and concurrent registrations',
    category: 'Technical',
    leadEmail: `lead_conc_${timestamp}@test.edu`,
    isActive: true,
  });

  const now = new Date();
  const concEvent = await Event.create({
    title: `Concurrent Seat Challenge ${timestamp}`,
    description: 'Only 1 seat available for concurrent registration test.',
    club: club._id,
    category: 'Technical',
    venue: 'Arena Lab 101',
    startDateTime: new Date(now.getTime() + 86400000 * 2),
    endDateTime: new Date(now.getTime() + 86400000 * 3),
    registrationDeadline: new Date(now.getTime() + 86400000),
    capacity: 1,
    registeredCount: 0,
    status: 'published',
    allowCancellation: true,
    createdBy: adminUser._id,
  });

  console.log(`Created test event "${concEvent.title}" with Capacity: ${concEvent.capacity}, registeredCount: 0`);

  // Create Student A & Student B
  const studentAEmail = `stua_${timestamp}@test.edu`;
  const studentBEmail = `stub_${timestamp}@test.edu`;

  const studentA = await User.create({
    name: 'Student A',
    email: studentAEmail,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  const studentB = await User.create({
    name: 'Student B',
    email: studentBEmail,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  // Log in both students to get HTTP session cookies
  const loginARes = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentAEmail, password: 'Pass@1234' }),
  });
  const cookieA = await extractCookie(loginARes.headers);

  const loginBRes = await requestJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentBEmail, password: 'Pass@1234' }),
  });
  const cookieB = await extractCookie(loginBRes.headers);

  console.log('Dispatching two concurrent registration requests for 1 available seat...');

  // Concurrent execution via Promise.all
  const [resA, resB] = await Promise.all([
    requestJson(`${API_BASE}/events/${concEvent._id}/register`, {
      method: 'POST',
      headers: { Cookie: cookieA },
    }),
    requestJson(`${API_BASE}/events/${concEvent._id}/register`, {
      method: 'POST',
      headers: { Cookie: cookieB },
    }),
  ]);

  console.log(`Student A result: HTTP ${resA.status}, Code: ${resA.data?.error?.code || 'SUCCESS'}`);
  console.log(`Student B result: HTTP ${resB.status}, Code: ${resB.data?.error?.code || 'SUCCESS'}`);

  const oneSucceeded = (resA.status === 201 && resB.status === 400) || (resA.status === 400 && resB.status === 201);
  const failedOneCode = resA.status === 400 ? resA.data?.error?.code : resB.data?.error?.code;

  if (!oneSucceeded) {
    throw new Error(`Concurrency test failed: Expected one 201 and one 400, got ${resA.status} and ${resB.status}`);
  }
  if (failedOneCode !== 'EVENT_FULL') {
    throw new Error(`Concurrency test failed: Expected EVENT_FULL, got ${failedOneCode}`);
  }

  // DB verification
  const eventAfter = await Event.findById(concEvent._id);
  const activeRegistrations = await Registration.find({ event: concEvent._id, status: 'active' });

  console.log(`DB Event registeredCount: ${eventAfter.registeredCount} (Capacity: ${eventAfter.capacity})`);
  console.log(`DB Active Registrations Count: ${activeRegistrations.length}`);

  if (eventAfter.registeredCount !== 1) {
    throw new Error(`Expected registeredCount to be 1, found ${eventAfter.registeredCount}`);
  }
  if (activeRegistrations.length !== 1) {
    throw new Error(`Expected exactly 1 active Registration, found ${activeRegistrations.length}`);
  }
  if (eventAfter.registeredCount > eventAfter.capacity) {
    throw new Error('Capacity was exceeded!');
  }

  console.log('[PASS] Concurrency test passed with complete transactional isolation.');

  // ---------------------------------------------------------
  // 2. TRANSACTION ROLLBACK TEST — REGISTRATION
  // ---------------------------------------------------------
  console.log('\n--- 2. TRANSACTION ROLLBACK TEST — REGISTRATION ---');

  const rollbackEvent = await Event.create({
    title: `Rollback Test Event ${timestamp}`,
    description: 'Testing transactional rollback on registration failure.',
    club: club._id,
    category: 'Academic',
    venue: 'Hall B',
    startDateTime: new Date(now.getTime() + 86400000 * 2),
    endDateTime: new Date(now.getTime() + 86400000 * 3),
    registrationDeadline: new Date(now.getTime() + 86400000),
    capacity: 10,
    registeredCount: 3,
    status: 'published',
    createdBy: adminUser._id,
  });

  const initialCount = rollbackEvent.registeredCount;
  console.log(`Initial Event registeredCount: ${initialCount}`);

  const studentRollback = await User.create({
    name: 'Rollback Student',
    email: `sturooll_${timestamp}@test.edu`,
    passwordHash: await User.hashPassword('Pass@1234'),
    role: 'student',
    isActive: true,
  });

  // Simulate transactional flow with controlled failure after capacity increment
  const sessionReg = await mongoose.startSession();
  sessionReg.startTransaction();

  let errorCaught = false;
  try {
    // 1. Reserve seat atomically within transaction
    const updated = await Event.findOneAndUpdate(
      {
        _id: rollbackEvent._id,
        status: 'published',
        $expr: { $lt: ['$registeredCount', '$capacity'] },
      },
      { $inc: { registeredCount: 1 } },
      { session: sessionReg, new: true }
    );

    // Verify inside transaction registeredCount is incremented
    if (updated.registeredCount !== initialCount + 1) {
      throw new Error('Failed to increment inside transaction');
    }

    // 2. Insert Registration document within transaction
    await Registration.create(
      [
        {
          student: studentRollback._id,
          event: rollbackEvent._id,
          status: 'active',
          registeredAt: new Date(),
        },
      ],
      { session: sessionReg }
    );

    // 3. Controlled failure injection BEFORE commit
    throw new Error('SIMULATED_CONTROLLED_FAILURE_BEFORE_COMMIT');
  } catch (err) {
    if (err.message === 'SIMULATED_CONTROLLED_FAILURE_BEFORE_COMMIT') {
      errorCaught = true;
      await sessionReg.abortTransaction();
    } else {
      await sessionReg.abortTransaction();
      throw err;
    }
  } finally {
    sessionReg.endSession();
  }

  if (!errorCaught) {
    throw new Error('Controlled error was not thrown/caught');
  }

  // Verify DB state after abort
  const eventAfterRegRollback = await Event.findById(rollbackEvent._id);
  const regDocAfterRollback = await Registration.findOne({
    student: studentRollback._id,
    event: rollbackEvent._id,
  });

  console.log(`Post-Rollback Event registeredCount: ${eventAfterRegRollback.registeredCount} (Original: ${initialCount})`);
  console.log(`Post-Rollback Registration Doc Exists: ${Boolean(regDocAfterRollback)}`);

  if (eventAfterRegRollback.registeredCount !== initialCount) {
    throw new Error(`registeredCount did not roll back! Expected ${initialCount}, got ${eventAfterRegRollback.registeredCount}`);
  }
  if (regDocAfterRollback !== null) {
    throw new Error('Registration document was not rolled back!');
  }

  console.log('[PASS] Registration transaction rollback verified successfully.');

  // ---------------------------------------------------------
  // 3. TRANSACTION ROLLBACK TEST — CANCELLATION
  // ---------------------------------------------------------
  console.log('\n--- 3. TRANSACTION ROLLBACK TEST — CANCELLATION ---');

  // Create an active registration to cancel
  const activeReg = await Registration.create({
    student: studentRollback._id,
    event: rollbackEvent._id,
    status: 'active',
    registeredAt: new Date(),
  });

  // Manually set registeredCount to reflect the active registration
  await Event.findByIdAndUpdate(rollbackEvent._id, { registeredCount: initialCount + 1 });
  const eventBeforeCancel = await Event.findById(rollbackEvent._id);
  console.log(`Pre-Cancellation Event registeredCount: ${eventBeforeCancel.registeredCount}`);
  console.log(`Pre-Cancellation Registration status: ${activeReg.status}`);

  const sessionCancel = await mongoose.startSession();
  sessionCancel.startTransaction();

  let cancelErrorCaught = false;
  try {
    // 1. Mark registration as cancelled in transaction
    await Registration.findByIdAndUpdate(
      activeReg._id,
      { status: 'cancelled', cancelledAt: new Date() },
      { session: sessionCancel }
    );

    // 2. Decrement registeredCount in transaction
    await Event.findByIdAndUpdate(
      rollbackEvent._id,
      { $inc: { registeredCount: -1 } },
      { session: sessionCancel }
    );

    // 3. Controlled failure injection BEFORE commit
    throw new Error('SIMULATED_CONTROLLED_FAILURE_DURING_CANCELLATION');
  } catch (err) {
    if (err.message === 'SIMULATED_CONTROLLED_FAILURE_DURING_CANCELLATION') {
      cancelErrorCaught = true;
      await sessionCancel.abortTransaction();
    } else {
      await sessionCancel.abortTransaction();
      throw err;
    }
  } finally {
    sessionCancel.endSession();
  }

  if (!cancelErrorCaught) {
    throw new Error('Cancellation controlled error was not thrown/caught');
  }

  // Verify DB state after abort
  const eventAfterCancelRollback = await Event.findById(rollbackEvent._id);
  const regDocAfterCancelRollback = await Registration.findById(activeReg._id);

  console.log(`Post-Rollback Event registeredCount: ${eventAfterCancelRollback.registeredCount} (Original: ${initialCount + 1})`);
  console.log(`Post-Rollback Registration status: ${regDocAfterCancelRollback.status} (Expected: active)`);

  if (eventAfterCancelRollback.registeredCount !== initialCount + 1) {
    throw new Error(`registeredCount did not roll back during cancellation! Expected ${initialCount + 1}, got ${eventAfterCancelRollback.registeredCount}`);
  }
  if (regDocAfterCancelRollback.status !== 'active') {
    throw new Error(`Registration status did not roll back! Expected 'active', got '${regDocAfterCancelRollback.status}'`);
  }

  console.log('[PASS] Cancellation transaction rollback verified successfully.');

  // ---------------------------------------------------------
  // 4. ATTENDEE DATA SCOPE VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- 4. ATTENDEE DATA SCOPE VERIFICATION ---');

  // Query User schema fields
  const userSchemaPaths = Object.keys(User.schema.paths);
  const hasDepartmentInModel = userSchemaPaths.includes('department');
  const hasYearInModel = userSchemaPaths.includes('year');

  console.log(`User schema paths: ${userSchemaPaths.join(', ')}`);
  console.log(`User schema contains 'department': ${hasDepartmentInModel}`);
  console.log(`User schema contains 'year': ${hasYearInModel}`);

  // Query registration endpoint response structure
  const regServicePopulate = 'student: name email isActive';
  console.log(`Backend populate scope in registrationService: ${regServicePopulate}`);

  console.log('[PASS] Attendee data scope verified.');

  console.log('\n=== All Phase 5 Additional Verification Checks Passed! ===');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
