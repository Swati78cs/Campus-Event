/**
 * Phase 4 End-to-End Verification Test Runner
 * Validates public event discovery, search, filtering (category, club, date),
 * pagination, public event details, security projections, and role boundaries.
 */

const BASE_URL = 'http://localhost:5001/api';

async function runPhase4Verification() {
  console.log('=== Starting Phase 4 End-to-End Verification ===\n');

  // Check 1: Health Check (Phase 0 Regression)
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  console.log(`[Check 1] System Health: Status ${healthRes.status}, DB: ${healthJson.data?.database?.status}`);
  if (healthJson.data?.database?.status !== 'connected') {
    throw new Error('Database is disconnected');
  }

  // Setup: Admin Login for seeding clubs and events
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'AdminPass123!' }),
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0];

  // Setup: Create 2 distinct clubs
  const club1Res = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: `AI & Robotics Society ${Date.now()}`,
      category: 'Technical',
      description: 'Artificial intelligence research and robotics prototyping.',
    }),
  });
  const club1 = (await club1Res.json()).data.club;

  const club2Res = await fetch(`${BASE_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: `Fine Arts & Music Club ${Date.now()}`,
      category: 'Cultural',
      description: 'Campus creative arts, painting, and orchestral music.',
    }),
  });
  const club2 = (await club2Res.json()).data.club;

  // Setup: Create 4 distinct events with varying statuses, categories, dates, and text
  const now = Date.now();
  const futureStart1 = new Date(now + 86400000 * 3).toISOString(); // +3 days
  const futureEnd1 = new Date(now + 86400000 * 3 + 3600000 * 4).toISOString();
  const deadline1 = new Date(now + 86400000 * 2).toISOString();

  const futureStart2 = new Date(now + 86400000 * 7).toISOString(); // +7 days
  const futureEnd2 = new Date(now + 86400000 * 7 + 3600000 * 4).toISOString();
  const deadline2 = new Date(now + 86400000 * 6).toISOString();

  // Event A: Published Technical Event for Club 1
  const evARes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      title: 'Neural Network Hackathon 2026',
      description: 'Hands-on deep learning workshop and competitive hackathon on computer vision models.',
      clubId: club1._id,
      category: 'Technical',
      startDateTime: futureStart1,
      endDateTime: futureEnd1,
      venue: 'Turing Computing Center, Lab A',
      capacity: 80,
      registrationDeadline: deadline1,
    }),
  });
  const evA = (await evARes.json()).data.event;
  // Publish Event A
  await fetch(`${BASE_URL}/events/${evA._id}/publish`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });

  // Event B: Published Cultural Event for Club 2
  const evBRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      title: 'Acoustic Guitar Showcase',
      description: 'Live musical evening featuring student acoustic guitarists and vocalists.',
      clubId: club2._id,
      category: 'Cultural',
      startDateTime: futureStart2,
      endDateTime: futureEnd2,
      venue: 'Open Air Amphitheatre',
      capacity: 250,
      registrationDeadline: deadline2,
    }),
  });
  const evB = (await evBRes.json()).data.event;
  // Publish Event B
  await fetch(`${BASE_URL}/events/${evB._id}/publish`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });

  // Event C: Draft Event (MUST NOT be discoverable publicly)
  const evCRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      title: 'Secret Draft Quantum Summit',
      description: 'Internal planning for quantum computing workshop.',
      clubId: club1._id,
      category: 'Technical',
      startDateTime: futureStart1,
      endDateTime: futureEnd1,
      venue: 'Room 404',
      capacity: 30,
      registrationDeadline: deadline1,
    }),
  });
  const evC = (await evCRes.json()).data.event; // Left as draft

  // Event D: Cancelled Event (MUST NOT be discoverable publicly)
  const evDRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      title: 'Cancelled Painting Exhibition',
      description: 'Annual fine arts painting display.',
      clubId: club2._id,
      category: 'Cultural',
      startDateTime: futureStart1,
      endDateTime: futureEnd1,
      venue: 'Gallery Hall',
      capacity: 100,
      registrationDeadline: deadline1,
    }),
  });
  const evD = (await evDRes.json()).data.event;
  await fetch(`${BASE_URL}/events/${evD._id}/publish`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
  });
  await fetch(`${BASE_URL}/events/${evD._id}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ reason: 'Gallery renovation work underway.' }),
  });

  console.log(`[Setup Completed] Created Event A (Published), Event B (Published), Event C (Draft), Event D (Cancelled)`);

  // Check 2: Public User Can Fetch Published Discoverable Events
  const pubRes = await fetch(`${BASE_URL}/events`);
  const pubJson = await pubRes.json();
  const pubEvents = pubJson.data?.events || [];
  console.log(`[Check 2] Public Fetch Events: Status ${pubRes.status}, Total Found: ${pubEvents.length}`);
  if (pubRes.status !== 200 || !pubJson.success) {
    throw new Error('Public discovery failed');
  }

  // Check 3: Draft Events Are NOT Returned in Discovery
  const hasDraft = pubEvents.some((e) => e._id === evC._id || e.status === 'draft');
  console.log(`[Check 3] Draft Events Excluded: ${!hasDraft}`);
  if (hasDraft) throw new Error('Security/Logic violation: Draft event found in discovery!');

  // Check 4: Cancelled Events Are NOT Returned in Discovery
  const hasCancelled = pubEvents.some((e) => e._id === evD._id || e.status === 'cancelled');
  console.log(`[Check 4] Cancelled Events Excluded: ${!hasCancelled}`);
  if (hasCancelled) throw new Error('Logic violation: Cancelled event found in discovery!');

  // Check 5: Search by Title (Case-Insensitive)
  const searchTitleRes = await fetch(`${BASE_URL}/events?search=NEURAL`);
  const searchTitleJson = await searchTitleRes.json();
  const foundTitle = searchTitleJson.data?.events?.some((e) => e._id === evA._id);
  console.log(`[Check 5] Search by Title ("NEURAL"): Found: ${foundTitle}, Total: ${searchTitleJson.data?.events?.length}`);
  if (!foundTitle) throw new Error('Search by title failed');

  // Check 6: Search by Description (Case-Insensitive)
  const searchDescRes = await fetch(`${BASE_URL}/events?search=acoustic+guitarists`);
  const searchDescJson = await searchDescRes.json();
  const foundDesc = searchDescJson.data?.events?.some((e) => e._id === evB._id);
  console.log(`[Check 6] Search by Description ("acoustic guitarists"): Found: ${foundDesc}`);
  if (!foundDesc) throw new Error('Search by description failed');

  // Check 7: Category Filter
  const catTechRes = await fetch(`${BASE_URL}/events?category=Technical`);
  const catTechJson = await catTechRes.json();
  const allTech = catTechJson.data?.events?.every((e) => e.category === 'Technical');
  console.log(`[Check 7] Category Filter ("Technical"): All match: ${allTech}, Count: ${catTechJson.data?.events?.length}`);
  if (!allTech) throw new Error('Category filter failed');

  // Check 8: Club Filter
  const clubFilterRes = await fetch(`${BASE_URL}/events?clubId=${club2._id}`);
  const clubFilterJson = await clubFilterRes.json();
  const allClub2 = clubFilterJson.data?.events?.every((e) => e.club?._id === club2._id || e.club === club2._id);
  console.log(`[Check 8] Club Filter: All match Club 2: ${allClub2}, Count: ${clubFilterJson.data?.events?.length}`);
  if (!allClub2) throw new Error('Club filter failed');

  // Check 9: Combined Search + Category + Club Filters
  const comboRes = await fetch(`${BASE_URL}/events?search=Hackathon&category=Technical&clubId=${club1._id}&dateFilter=upcoming`);
  const comboJson = await comboRes.json();
  const comboMatch = comboJson.data?.events?.length === 1 && comboJson.data?.events[0]._id === evA._id;
  console.log(`[Check 9] Combined Filters (Search + Category + Club): Exact Match: ${comboMatch}`);
  if (!comboMatch) throw new Error('Combined filters failed');

  // Check 10: Pagination Default Page Size (Limit = 20)
  console.log(`[Check 10] Pagination Structure: Limit: ${pubJson.data?.pagination?.limit}, Page: ${pubJson.data?.pagination?.page}, Total: ${pubJson.data?.pagination?.total}`);
  if (pubJson.data?.pagination?.limit !== 20) throw new Error('Default page size is not 20');

  // Check 11: Invalid Pagination Rejected with 400 Validation Error
  const invalidPageRes = await fetch(`${BASE_URL}/events?page=-5`);
  const invalidPageJson = await invalidPageRes.json();
  console.log(`[Check 11] Invalid Pagination Rejection: Status ${invalidPageRes.status}, Code: ${invalidPageJson.error?.code}`);
  if (invalidPageRes.status !== 400) throw new Error('Invalid page should return 400');

  // Check 12: Public Event Details by ID
  const detailRes = await fetch(`${BASE_URL}/events/${evA._id}`);
  const detailJson = await detailRes.json();
  console.log(`[Check 12] Public Event Details: Status ${detailRes.status}, Title: "${detailJson.data?.event?.title}"`);
  if (detailRes.status !== 200 || detailJson.data?.event?._id !== evA._id) {
    throw new Error('Public event details fetch failed');
  }

  // Check 13: Draft Event Details Blocked for Public
  const draftDetailRes = await fetch(`${BASE_URL}/events/${evC._id}`);
  const draftDetailJson = await draftDetailRes.json();
  console.log(`[Check 13] Public Draft Details Blocked: Status ${draftDetailRes.status} (Expected 404), Code: ${draftDetailJson.error?.code}`);
  if (draftDetailRes.status !== 404) throw new Error('Draft event details should not be publicly accessible');

  // Check 14: Cancelled Event Details Blocked from Public Discovery
  const cancelDetailRes = await fetch(`${BASE_URL}/events/${evD._id}`);
  const cancelDetailJson = await cancelDetailRes.json();
  console.log(`[Check 14] Cancelled Event Details Blocked from Public: Status ${cancelDetailRes.status} (Expected 404), Code: ${cancelDetailJson.error?.code}`);
  if (cancelDetailRes.status !== 404) throw new Error('Cancelled event details should not be publicly accessible');

  // Check 15: Sensitive Fields Omitted in Public Responses
  const hasSensitive = detailJson.data?.event?.cancelledBy !== undefined ||
    detailJson.data?.event?.createdBy?.email !== undefined ||
    detailJson.data?.event?.createdBy?.passwordHash !== undefined;
  console.log(`[Check 15] Sensitive Fields Stripped: ${!hasSensitive}`);
  if (hasSensitive) throw new Error('Sensitive fields returned in public event response!');

  // Check 16: Protected Organizer Management Endpoints Reject Unauthenticated Users
  const unauthManageRes = await fetch(`${BASE_URL}/events/manage/list`);
  console.log(`[Check 16] Unauthenticated Management Access Rejected: Status ${unauthManageRes.status} (Expected 401)`);
  if (unauthManageRes.status !== 401) throw new Error('Protected management endpoint not guarded');

  console.log('\n=== All 16 Phase 4 Verification Checks Passed Successfully! ===');
}

runPhase4Verification().catch((err) => {
  console.error('Phase 4 verification failed:', err);
  process.exit(1);
});
