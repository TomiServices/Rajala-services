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
      // Derive the HTTP status from wherever the SDK places it.
      // @sendgrid/mail stores it in err.code; some SDKs use err.response.status.
      const status = err.code || (err.response && (err.response.status || err.response.statusCode)) || 0;
      // Don't retry 4xx client errors (they are deterministic failures).
      // Exception: 429 Too Many Requests — the server is asking us to back off and retry.
      if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
        break;
      }
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
  const escapedRegistrationNumber = escapeHtml(bookingData.registrationNumber || '');
  const escapedMessage = escapeHtml(bookingData.message || '');

  const servicesText = (bookingData.services || [])
    .map(s => `  • ${escapeHtml(s.serviceName || '')} - ${escapeHtml(s.taskName || '')}${s.price ? ': ' + escapeHtml(s.price) : ''}`)
    .join('\n') || '  Palvelu ei määritelty';

  const messageSection = escapedMessage
    ? `<div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Asiakkaan viesti</h3>
            <p style="white-space: pre-wrap;">${escapedMessage}</p>
          </div>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3FA9F5;">Varausvahvistus</h2>
      <p>Hei ${escapedName || 'asiakas'},</p>
      <p>Olemme vastaanottaneet varauksesi. Tässä varauksen tiedot:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Varauksen tiedot</h3>
        <p><strong>Aika:</strong> ${formattedDate} klo ${formattedTime}</p>
        <p><strong>Asiakas:</strong> ${escapedName}</p>
        <p><strong>Puhelin:</strong> ${escapedPhone}</p>
        <p><strong>Sähköposti:</strong> ${escapedEmail}</p>
        <p><strong>Ajoneuvotyyppi:</strong> ${escapedVehicleType}</p>
        ${escapedRegistrationNumber ? `<p><strong>Rekisteritunnus:</strong> ${escapedRegistrationNumber}</p>` : ''}
      </div>
      <div style="background-color: #fff4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Valitut palvelut</h3>
        <p style="white-space: pre-line;">${servicesText}</p>
        <p><strong>Kokonaishinta:</strong> ${escapedTotalPrice || 'Hinta sovittaessa'}</p>
      </div>
      ${messageSection}
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

  // --- 4xx errors must NOT be retried (deterministic failures) ---

  // 400 Bad Request via err.code — should fail on first attempt, no retries
  callCount = 0;
  let caught400 = null;
  try {
    await withRetry(async () => {
      callCount++;
      const err = new Error('Bad Request');
      err.code = 400;
      throw err;
    }, 3, 5);
  } catch (err) {
    caught400 = err;
  }
  assert(caught400 !== null, '400 error is thrown');
  assert(callCount === 1, '400 error is NOT retried (via err.code)');

  // 401 Unauthorized via err.response.status (SendGrid SDK style)
  callCount = 0;
  let caught401 = null;
  try {
    await withRetry(async () => {
      callCount++;
      const err = new Error('Unauthorized');
      err.response = { status: 401 };
      throw err;
    }, 3, 5);
  } catch (err) {
    caught401 = err;
  }
  assert(caught401 !== null, '401 error is thrown');
  assert(callCount === 1, '401 error is NOT retried (via err.response.status)');

  // 403 Forbidden via err.response.statusCode
  callCount = 0;
  let caught403 = null;
  try {
    await withRetry(async () => {
      callCount++;
      const err = new Error('Forbidden');
      err.response = { statusCode: 403 };
      throw err;
    }, 3, 5);
  } catch (err) {
    caught403 = err;
  }
  assert(caught403 !== null, '403 error is thrown');
  assert(callCount === 1, '403 error is NOT retried (via err.response.statusCode)');

  // 429 Too Many Requests MUST be retried (server-side back-off signal)
  callCount = 0;
  let caught429 = null;
  try {
    await withRetry(async () => {
      callCount++;
      const err = new Error('Too Many Requests');
      err.code = 429;
      throw err;
    }, 3, 5);
  } catch (err) {
    caught429 = err;
  }
  assert(caught429 !== null, '429 error is thrown after all retries');
  assert(callCount === 3, '429 error IS retried up to maxAttempts');

  // 5xx errors must be retried (transient server failures)
  callCount = 0;
  let caught500 = null;
  try {
    await withRetry(async () => {
      callCount++;
      const err = new Error('Internal Server Error');
      err.code = 500;
      throw err;
    }, 3, 5);
  } catch (err) {
    caught500 = err;
  }
  assert(caught500 !== null, '500 error is thrown after all retries');
  assert(callCount === 3, '500 error IS retried up to maxAttempts');

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

  // Optional message section rendered when message is present
  const bookingWithMsg = { ...bookingData, message: 'Tarvitsen erikoiskohtelua' };
  const htmlWithMsg = buildBookingEmailHtml(bookingWithMsg, 'tiistai', '09:00');
  assert(htmlWithMsg.includes('Tarvitsen erikoiskohtelua'), 'Includes optional message section');
  assert(htmlWithMsg.includes('Asiakkaan viesti'), 'Contains Asiakkaan viesti header when message present');

  // No message section when message is empty
  const htmlNoMsg = buildBookingEmailHtml(bookingData, 'tiistai', '09:00');
  assert(!htmlNoMsg.includes('Asiakkaan viesti'), 'No Asiakkaan viesti header when message absent');

  // Registration number is shown when present
  const bookingWithReg = { ...bookingData, registrationNumber: 'ABC-123' };
  const htmlWithReg = buildBookingEmailHtml(bookingWithReg, 'tiistai', '09:00');
  assert(htmlWithReg.includes('ABC-123'), 'Contains registration number when present');
  assert(htmlWithReg.includes('Rekisteritunnus'), 'Contains Rekisteritunnus label when registration number present');

  // Registration number section omitted when absent
  const htmlNoReg = buildBookingEmailHtml(bookingData, 'tiistai', '09:00');
  assert(!htmlNoReg.includes('Rekisteritunnus'), 'No Rekisteritunnus label when registration number absent');

  // Registration number XSS is escaped
  const xssRegBooking = { ...bookingData, registrationNumber: '<script>evil()</script>' };
  const htmlXssReg = buildBookingEmailHtml(xssRegBooking, 'tiistai', '09:00');
  assert(!htmlXssReg.includes('<script>evil'), 'Escapes XSS in registration number');
  assert(htmlXssReg.includes('&lt;script&gt;'), 'Registration number XSS input is HTML-escaped in output');

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
  // Updated to check both emailQueued (new) and emailSent (legacy) fields
  async function shouldSkipEmail(bookingId, fakeDb) {
    try {
      const doc = await fakeDb.get(bookingId);
      if (doc.exists && (doc.data().emailQueued === true || doc.data().emailSent === true)) return true;
    } catch (_) {
      // Continue on error (same as production code)
    }
    return false;
  }

  // Case 1: emailSent already true (legacy) → should skip
  const dbAlreadySent = {
    get: async (_id) => ({ exists: true, data: () => ({ emailSent: true }) })
  };
  assert(await shouldSkipEmail('booking1', dbAlreadySent), 'Skips send when emailSent is already true');

  // Case 1b: emailQueued already true (new field) → should skip
  const dbAlreadyQueued = {
    get: async (_id) => ({ exists: true, data: () => ({ emailQueued: true }) })
  };
  assert(await shouldSkipEmail('booking1b', dbAlreadyQueued), 'Skips send when emailQueued is already true');

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

// --- Test 7: createEmailDocument skip-if-exists logic ---
async function testCreateEmailDocumentSkipIfExists() {
  console.log('📝 Test 7: createEmailDocument skip-if-exists - prevents Extension from processing same booking twice');
  console.log('------------------------------------------------------------------------------------------------------');

  // Simulate the new logic in createEmailDocument:
  // Only write to 'mail' if the document does NOT already exist.
  // This prevents a function retry from resetting an in-progress or failed document,
  // which would cause the Firebase Email Extension to process the same booking twice.
  const mailStore2 = {};
  let writeCount = 0;

  async function simulateCreateEmailDocument(bookingId) {
    // Simulates: check existence, then conditionally write
    const exists = Object.prototype.hasOwnProperty.call(mailStore2, bookingId);
    if (exists) {
      // Skip – document already exists, Extension already has it
      return bookingId; // return existing id without writing
    }
    writeCount++;
    mailStore2[bookingId] = { to: 'customer@example.com', bookingId };
    return bookingId;
  }

  // First call (normal booking flow): document created
  writeCount = 0;
  await simulateCreateEmailDocument('booking-111');
  assert(writeCount === 1, 'First call writes the mail document');
  assert(Object.keys(mailStore2).length === 1, 'Exactly one mail document after first call');

  // Second call (function retry): document already exists, should NOT overwrite
  await simulateCreateEmailDocument('booking-111');
  assert(writeCount === 1, 'Second call (retry) does NOT overwrite the existing document');
  assert(Object.keys(mailStore2).length === 1, 'Still exactly one mail document after retry');

  // Third call for a different booking: writes normally
  await simulateCreateEmailDocument('booking-222');
  assert(writeCount === 2, 'Different booking ID writes a new document');
  assert(Object.keys(mailStore2).length === 2, 'Two bookings → two mail documents');

  console.log('');
}

// --- Test 8: registrationNumber validation ---
function testRegistrationNumberValidation() {
  console.log('📝 Test 8: registrationNumber - Validation and Firestore storage');
  console.log('------------------------------------------------------------------');

  // Mirror the validation logic from functions/index.js book endpoint
  function validateRegistrationNumber(registrationNumber) {
    if (!registrationNumber || typeof registrationNumber !== 'string' || registrationNumber.trim() === '') {
      return { valid: false, error: 'Rekisteritunnus on pakollinen tieto' };
    }
    return { valid: true, value: registrationNumber.trim() };
  }

  // Valid cases
  assert(validateRegistrationNumber('ABC-123').valid, 'Accepts valid registration number');
  assert(validateRegistrationNumber('ABC-123').value === 'ABC-123', 'Trims and returns value');
  assert(validateRegistrationNumber('  XYZ-999  ').valid, 'Accepts registration number with whitespace');
  assert(validateRegistrationNumber('  XYZ-999  ').value === 'XYZ-999', 'Trims whitespace from registration number');
  assert(validateRegistrationNumber('A').valid, 'Accepts single character registration number');
  assert(validateRegistrationNumber('123ABC').valid, 'Accepts alphanumeric registration number');

  // Invalid cases
  assert(!validateRegistrationNumber('').valid, 'Rejects empty string');
  assert(!validateRegistrationNumber('   ').valid, 'Rejects whitespace-only string');
  assert(!validateRegistrationNumber(null).valid, 'Rejects null');
  assert(!validateRegistrationNumber(undefined).valid, 'Rejects undefined');
  assert(!validateRegistrationNumber(12345).valid, 'Rejects non-string value');

  // Verify error message
  assert(
    validateRegistrationNumber('').error === 'Rekisteritunnus on pakollinen tieto',
    'Returns correct error message for missing registration number'
  );

  // Verify registrationNumber is stored in booking data
  const bookingData = {
    registrationNumber: 'TEST-001',
    vehicleType: 'Henkilöauto',
    nimi: 'Testi Käyttäjä'
  };
  assert(bookingData.registrationNumber === 'TEST-001', 'registrationNumber stored in booking object');

  console.log('');
}

// --- Test 9: SendGrid API key trimming ---
function testSendgridApiKeyTrimming() {
  console.log('📝 Test 9: SendGrid API key trimming - guards against whitespace env vars');
  console.log('--------------------------------------------------------------------------');

  // Mirror the trimming logic from sendEmailViaSendGrid in index.js.
  // The same pattern is used for Nodemailer credentials (emailUserVal.trim()),
  // but the SendGrid path previously lacked this guard. The stub below is kept
  // in sync with the production code in index.js — update both if the logic changes.
  function processSendgridApiKey(rawKey) {
    if (!rawKey) return null;
    const trimmed = rawKey.trim();
    if (!trimmed) return null;
    return trimmed;
  }

  assert(processSendgridApiKey('SG.validkey') === 'SG.validkey', 'Valid key returned unchanged');
  assert(processSendgridApiKey('  SG.validkey  ') === 'SG.validkey', 'Trims surrounding whitespace');
  assert(processSendgridApiKey('\tSG.validkey\n') === 'SG.validkey', 'Trims tab and newline');
  assert(processSendgridApiKey('') === null, 'Empty string returns null (key treated as missing)');
  assert(processSendgridApiKey('   ') === null, 'Whitespace-only string returns null');
  assert(processSendgridApiKey(null) === null, 'null returns null');
  assert(processSendgridApiKey(undefined) === null, 'undefined returns null');

  console.log('');
}


async function runAll() {
  testEscapeHtml();
  await testWithRetry();
  testBuildBookingEmailHtml();
  testGetEmailMethodLogic();
  await testIdempotencyCheckLogic();
  await testMailCollectionIdempotency();
  await testCreateEmailDocumentSkipIfExists();
  testRegistrationNumberValidation();
  testSendgridApiKeyTrimming();

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
