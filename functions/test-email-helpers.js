#!/usr/bin/env node

/**
 * Unit tests for email helper utilities (withRetry, buildBookingEmailHtml, escapeHtml)
 *
 * These tests validate the core logic of the new reliable email sending helpers
 * without requiring Firebase, Firestore, or real SMTP/SendGrid credentials.
 *
 * Usage:
 *   node functions/test-email-helpers.js
 */

console.log('🧪 Testing Email Helper Utilities\n');

// =======================
// Local copies of tested utilities (mirrors functions/index.js)
// =======================

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function withRetry(fn, maxAttempts = 3, baseDelayMs = 10) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const jitter = Math.random() * baseDelayMs;
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

const COMPANY_NAME = 'Fixnero';
const COMPANY_EMAIL = 'info@fixnero.fi';
const COMPANY_PHONE = '+358401935001';
const COMPANY_PHONE_DISPLAY = COMPANY_PHONE.replace('+358', '0');

function buildBookingEmailHtml(bookingData, formattedDate, formattedTime) {
  const escapedName = escapeHtml(bookingData.nimi);
  const escapedEmail = escapeHtml(bookingData.sahkoposti);
  const escapedPhone = escapeHtml(bookingData.puhelin);
  const escapedTotalPrice = escapeHtml(bookingData.totalPrice);
  const escapedVehicleType = escapeHtml(bookingData.vehicleType || 'Ei määritelty');
  const escapedMessage = escapeHtml(bookingData.message || '');

  const servicesText = (bookingData.services || [])
    .map(s => `  • ${escapeHtml(s.serviceName || '')} - ${escapeHtml(s.taskName || '')}${s.price ? ': ' + escapeHtml(s.price) : ''}`)
    .join('\n') || '  Palvelu ei määritelty';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #c41e3a;">Varausvahvistus</h2>
      <p>Hei ${escapedName || 'asiakas'},</p>
      <p>Olemme vastaanottaneet varauksesi. Tässä varauksen tiedot:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Varauksen tiedot</h3>
        <p><strong>Aika:</strong> ${formattedDate} klo ${formattedTime}</p>
        <p><strong>Asiakas:</strong> ${escapedName}</p>
        <p><strong>Puhelin:</strong> ${escapedPhone}</p>
        <p><strong>Sähköposti:</strong> ${escapedEmail}</p>
        <p><strong>Ajoneuvotyyppi:</strong> ${escapedVehicleType}</p>
        ${escapedMessage ? `<p><strong>Tilausviesti:</strong> ${escapedMessage}</p>` : ''}
      </div>
      <div style="background-color: #fff4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Valitut palvelut</h3>
        <p style="white-space: pre-line;">${servicesText}</p>
        <p><strong>Kokonaishinta:</strong> ${escapedTotalPrice || 'Hinta sovittaessa'}</p>
      </div>
      <p style="margin-top: 30px;">Ystävällisin terveisin,<br><strong>${COMPANY_NAME}</strong></p>
      <p style="font-size: 12px; color: #666;">Tämä on automaattinen vahvistusviesti.</p>
    </div>
  `;
}

// =======================
// Tests
// =======================

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// --- Test 1: escapeHtml ---
function testEscapeHtml() {
  console.log('📝 Test 1: escapeHtml - HTML special character escaping');
  console.log('-------------------------------------------------------');

  assert(escapeHtml('<script>') === '&lt;script&gt;', 'Escapes angle brackets');
  assert(escapeHtml('"quoted"') === '&quot;quoted&quot;', 'Escapes double quotes');
  assert(escapeHtml("it's") === 'it&#39;s', 'Escapes single quotes');
  assert(escapeHtml('a & b') === 'a &amp; b', 'Escapes ampersand');
  assert(escapeHtml('') === '', 'Returns empty string for empty input');
  assert(escapeHtml(null) === '', 'Returns empty string for null');
  assert(escapeHtml(undefined) === '', 'Returns empty string for undefined');
  assert(escapeHtml('safe text') === 'safe text', 'Leaves safe text unchanged');
  assert(
    escapeHtml('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;',
    'Escapes XSS attempt'
  );
  console.log('');
}

// --- Test 2: withRetry ---
async function testWithRetry() {
  console.log('📝 Test 2: withRetry - Exponential backoff retry logic');
  console.log('------------------------------------------------------');

  // Should succeed on first attempt
  let callCount = 0;
  const result = await withRetry(async () => {
    callCount++;
    return 'ok';
  });
  assert(result === 'ok', 'Returns result on first success');
  assert(callCount === 1, 'Calls fn exactly once when it succeeds immediately');

  // Should retry on failure and eventually succeed
  callCount = 0;
  const result2 = await withRetry(async () => {
    callCount++;
    if (callCount < 3) throw new Error('transient error');
    return 'success-after-retries';
  }, 3, 5);
  assert(result2 === 'success-after-retries', 'Returns result after retries');
  assert(callCount === 3, 'Retried correct number of times');

  // Should throw after exhausting max attempts
  callCount = 0;
  let caughtError = null;
  try {
    await withRetry(async () => {
      callCount++;
      throw new Error('permanent error');
    }, 3, 5);
  } catch (err) {
    caughtError = err;
  }
  assert(caughtError !== null, 'Throws after max attempts exhausted');
  assert(caughtError.message === 'permanent error', 'Re-throws the last error');
  assert(callCount === 3, 'Attempts exactly maxAttempts times');

  // Should respect maxAttempts = 1 (no retries)
  callCount = 0;
  let caught2 = null;
  try {
    await withRetry(async () => { callCount++; throw new Error('fail'); }, 1, 5);
  } catch (err) {
    caught2 = err;
  }
  assert(caught2 !== null && callCount === 1, 'With maxAttempts=1, fails immediately without retry');

  console.log('');
}

// --- Test 3: buildBookingEmailHtml ---
function testBuildBookingEmailHtml() {
  console.log('📝 Test 3: buildBookingEmailHtml - Email HTML generation');
  console.log('--------------------------------------------------------');

  const bookingData = {
    nimi: 'Matti Meikäläinen',
    sahkoposti: 'matti@example.com',
    puhelin: '040 123 4567',
    totalPrice: 'alkaen 50 €',
    vehicleType: 'Henkilöauto',
    message: '',
    services: [
      { serviceName: 'Pesupalvelut', taskName: 'Käsinpesu', price: 'alkaen 25 €' },
      { serviceName: 'Kiilloitus', taskName: 'Pintavaha' }
    ]
  };
  const html = buildBookingEmailHtml(bookingData, 'maanantai 1. tammikuuta 2026', '10:00');

  assert(html.includes('Matti Meikäläinen'), 'Contains customer name');
  assert(html.includes('matti@example.com'), 'Contains customer email');
  assert(html.includes('040 123 4567'), 'Contains phone number');
  assert(html.includes('alkaen 50 €'), 'Contains total price');
  assert(html.includes('Käsinpesu'), 'Contains service task name');
  assert(html.includes('Pintavaha'), 'Contains second service (no price)');
  assert(html.includes('maanantai 1. tammikuuta 2026'), 'Contains formatted date');
  assert(html.includes('10:00'), 'Contains formatted time');
  assert(html.includes('Varausvahvistus'), 'Contains booking confirmation header');
  assert(!html.includes('<script>'), 'Does not contain raw script tags');

  // XSS: customer data with HTML should be escaped
  const xssBooking = {
    nimi: '<script>alert("xss")</script>',
    sahkoposti: 'test@example.com',
    puhelin: '040 000 0000',
    totalPrice: '',
    services: []
  };
  const xssHtml = buildBookingEmailHtml(xssBooking, 'tiistai', '09:00');
  assert(!xssHtml.includes('<script>alert'), 'Escapes XSS in customer name');
  assert(xssHtml.includes('&lt;script&gt;'), 'XSS input is HTML-escaped in output');

  // XSS: malicious content in services array should be escaped
  const xssServicesBooking = {
    nimi: 'Safe Name',
    sahkoposti: 'safe@example.com',
    puhelin: '040 000 0000',
    totalPrice: '<b>free</b>',
    services: [
      { serviceName: '<img src=x onerror=alert(1)>', taskName: '"><svg/onload=alert(1)>', price: '<script>evil()</script>' }
    ]
  };
  const xssServicesHtml = buildBookingEmailHtml(xssServicesBooking, 'tiistai', '09:00');
  assert(!xssServicesHtml.includes('<img src=x'), 'Escapes XSS in service name');
  assert(!xssServicesHtml.includes('"><svg'), 'Escapes XSS in task name');
  assert(!xssServicesHtml.includes('<script>evil'), 'Escapes XSS in service price');
  assert(!xssServicesHtml.includes('<b>free</b>'), 'Escapes XSS in total price');

  // Optional message field rendered when message is present
  const bookingWithMsg = { ...bookingData, message: 'Tarvitsen erikoiskohtelua' };
  const htmlWithMsg = buildBookingEmailHtml(bookingWithMsg, 'tiistai', '09:00');
  assert(htmlWithMsg.includes('Tarvitsen erikoiskohtelua'), 'Includes optional message in booking info section');
  assert(htmlWithMsg.includes('Tilausviesti'), 'Contains Tilausviesti label when message present');

  // No message field when message is empty
  const htmlNoMsg = buildBookingEmailHtml(bookingData, 'tiistai', '09:00');
  assert(!htmlNoMsg.includes('Tilausviesti'), 'No Tilausviesti label when message absent');

  console.log('');
}

// --- Test 4: getEmailMethod logic ---
function testGetEmailMethodLogic() {
  console.log('📝 Test 4: getEmailMethod - Email method tracking logic');
  console.log('-------------------------------------------------------');

  // Mirror the function from index.js
  function getEmailMethod(mailDocId, emailSent) {
    if (mailDocId) return 'firebase-extension';
    if (emailSent) return 'nodemailer';
    return null;
  }

  assert(getEmailMethod('abc123', true) === 'firebase-extension', 'Returns firebase-extension when mailDocId set');
  assert(getEmailMethod(null, true) === 'nodemailer', 'Returns nodemailer when only emailSent=true');
  assert(getEmailMethod(null, false) === null, 'Returns null when nothing succeeded');
  assert(getEmailMethod(undefined, false) === null, 'Returns null for undefined mailDocId and emailSent=false');

  console.log('');
}

// --- Test 5: Idempotency check logic ---
async function testIdempotencyCheckLogic() {
  console.log('📝 Test 5: Idempotency check - Prevents duplicate email sends on retry');
  console.log('------------------------------------------------------------------------');

  // Simulate the idempotency check from onBookingCreated
  async function shouldSkipEmail(bookingId, fakeDb) {
    try {
      const doc = await fakeDb.get(bookingId);
      if (doc.exists && doc.data().emailSent === true) return true;
    } catch (_) {
      // Continue on error (same as production code)
    }
    return false;
  }

  // Case 1: emailSent already true → should skip
  const dbAlreadySent = {
    get: async (_id) => ({ exists: true, data: () => ({ emailSent: true }) })
  };
  assert(await shouldSkipEmail('booking1', dbAlreadySent), 'Skips send when emailSent is already true');

  // Case 2: emailSent is false → should proceed
  const dbNotSent = {
    get: async (_id) => ({ exists: true, data: () => ({ emailSent: false }) })
  };
  assert(!(await shouldSkipEmail('booking2', dbNotSent)), 'Proceeds when emailSent is false');

  // Case 3: emailSent field absent (new document) → should proceed
  const dbNewDoc = {
    get: async (_id) => ({ exists: true, data: () => ({}) })
  };
  assert(!(await shouldSkipEmail('booking3', dbNewDoc)), 'Proceeds when emailSent field is absent');

  // Case 4: document does not exist → should proceed
  const dbMissing = {
    get: async (_id) => ({ exists: false, data: () => null })
  };
  assert(!(await shouldSkipEmail('booking4', dbMissing)), 'Proceeds when booking document does not exist');

  // Case 5: Firestore read throws → should proceed (fail-open, not fail-closed)
  const dbError = {
    get: async (_id) => { throw new Error('Firestore unavailable'); }
  };
  assert(!(await shouldSkipEmail('booking5', dbError)), 'Proceeds (fail-open) when Firestore check throws');

  console.log('');
}

// --- Test 6: Mail collection idempotency (doc(bookingId).set vs .add) ---
async function testMailCollectionIdempotency() {
  console.log('📝 Test 6: Mail collection idempotency - doc(bookingId).set() prevents duplicate mail docs');
  console.log('-----------------------------------------------------------------------------------------');

  // Simulate the mail collection write using bookingId as document ID.
  // With doc(bookingId).set(), concurrent writes to the same ID overwrite each other
  // rather than producing two separate documents, ensuring at most one mail document
  // per booking is created.
  const mailStore = {};

  async function writeMailDoc(bookingId, doc) {
    // Simulates db.collection('mail').doc(bookingId).set(doc)
    const existed = Object.prototype.hasOwnProperty.call(mailStore, bookingId);
    mailStore[bookingId] = doc;
    return { existed };
  }

  // First write: creates the document
  const r1 = await writeMailDoc('booking-abc', { to: 'a@b.com', bookingId: 'booking-abc' });
  assert(!r1.existed, 'First write creates a new mail document');
  assert(Object.keys(mailStore).length === 1, 'Exactly one mail document after first write');

  // Second write (simulating a function retry): overwrites the same document
  const r2 = await writeMailDoc('booking-abc', { to: 'a@b.com', bookingId: 'booking-abc' });
  assert(r2.existed, 'Second write (retry) targets the same existing document');
  assert(Object.keys(mailStore).length === 1, 'Still exactly one mail document after retry write');

  // Different booking: gets its own document
  await writeMailDoc('booking-xyz', { to: 'c@d.com', bookingId: 'booking-xyz' });
  assert(Object.keys(mailStore).length === 2, 'Two different bookings produce two separate mail documents');

  console.log('');
}

// --- Run all tests ---
async function runAll() {
  testEscapeHtml();
  await testWithRetry();
  testBuildBookingEmailHtml();
  testGetEmailMethodLogic();
  await testIdempotencyCheckLogic();
  await testMailCollectionIdempotency();

  console.log('=====================================');
  console.log('Test Summary');
  console.log('=====================================');
  console.log(`Total:  ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Unexpected error running tests:', err);
  process.exit(1);
});
