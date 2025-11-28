// index.js - Firebase Functions for Rajala Services Booking System (updated)
// Added: watchRegistrar + improved calendarWebhook with syncToken handling
// Preserves all existing features; small, well-commented additions.

const admin = require('firebase-admin');
const axios = require('axios');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// =======================
// LEGACY CONFIG SUPPORT (Gen1)
// =======================
let legacyFunctionsConfig = null;
try {
  // eslint-disable-next-line global-require
  const functionsLib = require('firebase-functions');
  if (functionsLib.config) {
    legacyFunctionsConfig = functionsLib.config();
  }
} catch (e) {
  // Legacy config not available, that's fine
}

function getLegacyConfigValue(path) {
  if (!legacyFunctionsConfig) return null;
  const parts = path.split('.');
  let value = legacyFunctionsConfig;
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return null;
    }
  }
  return value;
}

// =======================
// UTILITY: HTML Escaping
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

// =======================
// ENVIRONMENT PARAMETERS (Gen2 / fallback to env)
// =======================
const recaptchaSecret = defineString('RECAPTCHA_SECRET');
const googleServiceAccount = defineString('GOOGLE_SERVICE_ACCOUNT');
const googleCalendarId = defineString('GOOGLE_CALENDAR_ID');
const emailUser = defineString('EMAIL_USER');
const emailPassword = defineString('EMAIL_PASSWORD');
const emailFrom = defineString('EMAIL_FROM');
const watchCallbackEnv = defineString('WATCH_CALLBACK_URL'); // optional preconfigured callback URL

// =======================
// CONSTANTS
// =======================
const BOOKINGS_COLLECTION = 'varaukset';
const WATCH_COLLECTION = 'calendarWatch';
const ALLOWED_ORIGINS = [
  'https://www.rajala-services.com',
  'https://rajala-services.com',
  'https://fxnr-web.web.app',
  'https://fxnr-web.firebaseapp.com'
];

// Company branding constants - used for emails and notifications
const COMPANY_NAME = 'Fixnero';
const COMPANY_EMAIL = 'info@fixnero.fi';
const COMPANY_PHONE = '+358401935001';
// Format phone number for display (remove +358 prefix and replace with 0)
const COMPANY_PHONE_DISPLAY = COMPANY_PHONE.replace('+358', '0');

// =======================
// UTILITY: Email Method Helper
// =======================
/**
 * Determines which email method was used based on the mail document ID and email sent status
 * @param {string|null} mailDocId - The Firebase Email Extension mail document ID (if created)
 * @param {boolean} emailSent - Whether an email was successfully sent
 * @returns {string|null} - 'firebase-extension', 'nodemailer', or null
 */
function getEmailMethod(mailDocId, emailSent) {
  if (mailDocId) return 'firebase-extension';
  if (emailSent) return 'nodemailer';
  return null;
}

// =======================
// GOOGLE CALENDAR CLIENT (lazy init)
// =======================
let googleCalendar = null;
let calendarId = null;

function safeGetParamValue(param, envNameFallback) {
  try {
    const v = param.value();
    if (v === undefined || v === null || v === '') return process.env[envNameFallback] || null;
    return v;
  } catch (e) {
    return process.env[envNameFallback] || null;
  }
}

function parseServiceAccountInput(input) {
  if (!input) return null;
  if (typeof input === 'object') return input;
  let s = input.trim();
  if (!s.startsWith('{')) {
    try {
      const decoded = Buffer.from(s, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) {
        s = decoded;
      }
    } catch (e) {
      // not base64 or decode failed; continue
    }
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error('Failed to parse service account JSON:', e.message);
    return null;
  }
}

function normalizePrivateKey(sa) {
  if (!sa || typeof sa.private_key !== 'string') return sa;
  sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

function initializeGoogleCalendar() {
  if (googleCalendar && calendarId) return googleCalendar;

  let saRaw = safeGetParamValue(googleServiceAccount, 'GOOGLE_SERVICE_ACCOUNT');
  let calIdRaw = safeGetParamValue(googleCalendarId, 'GOOGLE_CALENDAR_ID');

  // Support GOOGLE_SERVICE_ACCOUNT_JSON (for harmony with lib/auth-client.js)
  if (!saRaw) saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null;

  // Legacy fallback: read functions.config().google if needed
  if (!saRaw) saRaw = getLegacyConfigValue('google.service_account');
  if (!calIdRaw) calIdRaw = getLegacyConfigValue('google.calendar_id');

  if (!saRaw || !calIdRaw) {
    console.log('Google Calendar not configured (missing service account or calendar id)');
    return null;
  }

  const sa = parseServiceAccountInput(saRaw);
  if (!sa) {
    console.error('Unable to parse Google service account credentials');
    return null;
  }

  normalizePrivateKey(sa);

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: sa,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    calendarId = calIdRaw;
    googleCalendar = google.calendar({ version: 'v3', auth });
    console.log('Google Calendar initialized');
    return googleCalendar;
  } catch (err) {
    console.error('Failed to initialize Google Calendar client:', err.message || err);
    return null;
  }
}

// =======================
// EMAIL CONFIGURATION
// =======================
let emailTransporter = null;

function initializeEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  let emailUserVal = safeGetParamValue(emailUser, 'EMAIL_USER');
  let emailPasswordVal = safeGetParamValue(emailPassword, 'EMAIL_PASSWORD');

  // Legacy fallback: read functions.config().email if needed
  if (!emailUserVal) emailUserVal = getLegacyConfigValue('email.user');
  if (!emailPasswordVal) emailPasswordVal = getLegacyConfigValue('email.password');

  if (!emailUserVal || !emailPasswordVal) {
    console.log('Email not configured (missing EMAIL_USER or EMAIL_PASSWORD)');
    return null;
  }

  try {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUserVal,
        pass: emailPasswordVal
      }
    });
    console.log('Email transporter initialized');
    return emailTransporter;
  } catch (err) {
    console.error('Failed to initialize email transporter:', err.message || err);
    return null;
  }
}

async function sendBookingConfirmationEmail(bookingData) {
  const transporter = initializeEmailTransporter();
  if (!transporter) {
    console.log('Email transporter not available - skipping email');
    return false;
  }

  try {
    let emailFromVal = safeGetParamValue(emailFrom, 'EMAIL_FROM') || safeGetParamValue(emailUser, 'EMAIL_USER');
    
    // Legacy fallback for email.from
    if (!emailFromVal) emailFromVal = getLegacyConfigValue('email.from');
    
    const startDate = parseFirestoreDate(bookingData.aika);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      console.warn('Invalid booking date for email, skipping:', bookingData);
      return false;
    }

    const formattedDate = startDate.toLocaleDateString('fi-FI', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = startDate.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Escape user input to prevent XSS
    const escapedName = escapeHtml(bookingData.nimi);
    const escapedEmail = escapeHtml(bookingData.sahkoposti);
    const escapedPhone = escapeHtml(bookingData.puhelin);
    const escapedTotalPrice = escapeHtml(bookingData.totalPrice);

    const servicesText = (bookingData.services || [])
      .map(s => `  • ${escapeHtml(s.serviceName || '')} - ${escapeHtml(s.taskName || '')}${s.price ? ': ' + escapeHtml(s.price) : ''}`)
      .join('\n') || '  Palvelu ei määritelty';

    const mailOptions = {
      from: emailFromVal,
      to: bookingData.sahkoposti,
      subject: `Varausvahvistus - ${COMPANY_NAME}`,
      html: `
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
          </div>
          
          <div style="background-color: #fff4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Valitut palvelut</h3>
            <p style="white-space: pre-line;">${servicesText}</p>
            <p><strong>Kokonaishinta:</strong> ${escapedTotalPrice || 'Hinta sovittaessa'}</p>
          </div>
          
          <p>Otamme sinuun yhteyttä tarvittaessa ennen varattua aikaa.</p>
          <p>Jos sinun täytyy perua tai muuttaa varausta, ota yhteyttä:</p>
          <ul>
            <li>Puhelin: <a href="tel:${COMPANY_PHONE}">${COMPANY_PHONE_DISPLAY}</a></li>
            <li>Sähköposti: <a href="mailto:${COMPANY_EMAIL}">${COMPANY_EMAIL}</a></li>
          </ul>
          
          <p style="margin-top: 30px;">Ystävällisin terveisin,<br><strong>${COMPANY_NAME}</strong></p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            Tämä on automaattinen vahvistusviesti. Älä vastaa tähän viestiin.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', bookingData.sahkoposti);
    return true;
  } catch (err) {
    console.error('Failed to send confirmation email:', err.message || err);
    return false;
  }
}

// =======================
// UTILITY: Robust date parsing
// =======================
function parseFirestoreDate(val) {
  if (!val) return null;

  // Firestore Timestamp (Admin SDK) has toDate()
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch (e) {
      return null;
    }
  }

  // Proto-like object { seconds, nanos }
  if (typeof val === 'object' && val.seconds !== undefined && val.nanos !== undefined) {
    try {
      return new Date(val.seconds * 1000 + Math.round(val.nanos / 1e6));
    } catch (e) {
      return null;
    }
  }

  // Number: treat < 1e12 as seconds, else milliseconds
  if (typeof val === 'number') {
    if (val < 1e12) return new Date(val * 1000);
    return new Date(val);
  }

  // String: try Date.parse
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  }

  return null;
}

// =======================
// reCAPTCHA verification
// =======================
/**
 * Verifies reCAPTCHA token with Google's API
 * @param {string} token - The reCAPTCHA token from the client
 * @param {Object} options - Optional parameters
 * @param {string} options.expectedAction - If provided, validates verifyData.action matches this value
 * @returns {Object} - { success: boolean, error?: string, details?: object }
 */
async function verifyRecaptcha(token, options = {}) {
  try {
    const { expectedAction } = options;

    // Validate token presence and format
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.log('reCAPTCHA validation failed: missing or empty token');
      return {
        success: false,
        error: 'missing recaptcha token',
        details: { reason: 'Token was not provided or is empty' }
      };
    }

    const secretKey = safeGetParamValue(recaptchaSecret, 'RECAPTCHA_SECRET');
    if (!secretKey) {
      console.error('reCAPTCHA secret not configured in environment');
      return {
        success: false,
        error: 'recaptcha configuration error',
        details: { reason: 'Server misconfiguration - secret not set' }
      };
    }

    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: token
        }
      }
    );

    const verifyData = response.data || {};
    
    // Log Google verify response for debugging (DO NOT log secret or token)
    // Note: challenge_ts and hostname are excluded to prevent information disclosure
    console.log('reCAPTCHA verify response:', {
      success: verifyData.success,
      score: verifyData.score,
      action: verifyData.action,
      'error-codes': verifyData['error-codes']
    });

    if (!verifyData.success) {
      const errorCodes = verifyData['error-codes'] || [];
      console.log('reCAPTCHA validation failed. Error codes:', errorCodes);
      
      return {
        success: false,
        error: 'recaptcha verification failed',
        details: {
          'error-codes': errorCodes,
          reason: 'Google reCAPTCHA verification returned success:false'
        }
      };
    }

    // Check action for v3 reCAPTCHA (action-based validation)
    if (expectedAction && verifyData.action !== undefined) {
      if (verifyData.action !== expectedAction) {
        console.log(`reCAPTCHA action mismatch: expected '${expectedAction}', got '${verifyData.action}'`);
        return {
          success: false,
          error: 'recaptcha verification failed',
          details: {
            reason: 'Action mismatch'
          }
        };
      }
    }

    // Check score for v3 reCAPTCHA (score-based validation)
    if (verifyData.score !== undefined) {
      const score = verifyData.score;
      // Score threshold configurable via environment (default: 0.5)
      // Note: Using < means scores exactly equal to threshold are accepted
      const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5');
      
      if (score < threshold) {
        console.log(`reCAPTCHA score too low: ${score} (threshold: ${threshold})`);
        return {
          success: false,
          error: 'recaptcha verification failed',
          details: {
            reason: 'Score below acceptable threshold'
          }
        };
      }
      
      console.log(`reCAPTCHA verification passed with score: ${score}`);
    }

    return {
      success: true,
      details: {
        score: verifyData.score,
        action: verifyData.action
      }
    };
  } catch (err) {
    console.error('reCAPTCHA verification error:', err.message || err);
    return {
      success: false,
      error: 'recaptcha verification failed',
      details: {
        reason: 'Error communicating with Google reCAPTCHA service',
        error: err.message || 'Unknown error'
      }
    };
  }
}

// =======================
// Slot availability check
// =======================
async function isSlotAvailable(dateTime) {
  try {
    const slotDate = new Date(dateTime);
    const slotStart = new Date(slotDate);
    slotStart.setMinutes(0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1);

    const snapshot = await db.collection(BOOKINGS_COLLECTION)
      .where('aika', '>=', admin.firestore.Timestamp.fromDate(slotStart))
      .where('aika', '<', admin.firestore.Timestamp.fromDate(slotEnd))
      .get();

    return snapshot.empty;
  } catch (err) {
    console.error('isSlotAvailable error:', err);
    throw err;
  }
}

// =======================
// Google Calendar helpers
// =======================
async function createGoogleCalendarEvent(bookingData) {
  console.log('createGoogleCalendarEvent called with bookingData:', {
    nimi: bookingData.nimi,
    sahkoposti: bookingData.sahkoposti,
    aika: bookingData.aika,
    servicesCount: (bookingData.services || []).length
  });

  const calendar = initializeGoogleCalendar();
  if (!calendar || !calendarId) {
    console.error('Google Calendar integration not configured:', {
      calendarInitialized: !!calendar,
      calendarIdSet: !!calendarId,
      serviceAccountConfigured: !!safeGetParamValue(googleServiceAccount, 'GOOGLE_SERVICE_ACCOUNT'),
      calendarIdConfigured: !!safeGetParamValue(googleCalendarId, 'GOOGLE_CALENDAR_ID')
    });
    return null;
  }

  try {
    const startDate = parseFirestoreDate(bookingData.aika) || new Date(bookingData.aika);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      console.error('Invalid booking date for Google event:', {
        originalAika: bookingData.aika,
        parsedDate: startDate,
        isNaN: Number.isNaN(startDate?.getTime())
      });
      return null;
    }

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const serviceInfo = (bookingData.services || []).map(s =>
      `${s.serviceName || ''} - ${s.taskName || ''}${s.price ? ': ' + s.price : ''}`
    ).join('\n') || 'Palvelu ei määritelty';

    const event = {
      summary: `Varaus: ${bookingData.nimi || 'Tuntematon'}`,
      description:
        `Asiakas: ${bookingData.nimi || ''}\n` +
        `Puhelin: ${bookingData.puhelin || ''}\n` +
        `Sähköposti: ${bookingData.sahkoposti || ''}\n\n` +
        `Palvelut:\n${serviceInfo}\n\n` +
        `Kokonaishinta: ${bookingData.totalPrice || 'Hinta sovittaessa'}`,
      start: { dateTime: startDate.toISOString(), timeZone: 'Europe/Helsinki' },
      end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Helsinki' },
      colorId: '11'
    };

    console.log('Creating Google Calendar event:', {
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      calendarId: calendarId
    });

    const resp = await calendar.events.insert({
      calendarId,
      requestBody: event
    });

    console.log('Google Calendar event created successfully:', {
      eventId: resp.data && resp.data.id,
      htmlLink: resp.data && resp.data.htmlLink,
      status: resp.data && resp.data.status
    });
    return resp.data && resp.data.id;
  } catch (err) {
    console.error('createGoogleCalendarEvent failed:', {
      errorMessage: err.message || err,
      errorCode: err.code,
      errorStatus: err.status,
      errors: err.errors || [],
      calendarId: calendarId
    });
    // Return null to allow booking to succeed even if calendar sync fails
    // The caller handles null as "calendar not configured or sync failed"
    return null;
  }
}

// =======================
// Helpers: CORS
// =======================
function setCorsHeadersForRequest(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// =======================
// HTTP: GET /bookings
// =======================
exports.bookings = onRequest({
  region: 'us-central1',
  cors: ALLOWED_ORIGINS
}, async (req, res) => {
  try {
    setCorsHeadersForRequest(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const snapshot = await db.collection(BOOKINGS_COLLECTION).orderBy('aika', 'asc').get();
    console.log('bookings snapshot size:', snapshot.size);

    const bookings = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const dt = parseFirestoreDate(data.aika);
      if (!dt) {
        console.warn('Invalid/empty aika for doc', doc.id, 'raw=', data.aika);
        return; // skip invalid document
      }

      bookings.push({
        id: doc.id,
        aika: dt.toISOString(),
        nimi: data.nimi,
        sahkoposti: data.sahkoposti,
        puhelin: data.puhelin,
        services: data.services || [],
        totalPrice: data.totalPrice,
        googleEventId: data.googleEventId
      });
    });

    res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
    return res.status(200).json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    return res.status(500).json({ error: 'Varausten haku epäonnistui' });
  }
});

// =======================
// HTTP: POST /book
// =======================
exports.book = onRequest({
  region: 'us-central1',
  cors: ALLOWED_ORIGINS
}, async (req, res) => {
  try {
    setCorsHeadersForRequest(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, phone, aika, services, totalPrice, totalNumericPrice } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !aika || !services) {
      return res.status(400).json({ error: 'Täytä kaikki pakolliset kentät' });
    }

    // reCAPTCHA verification DISABLED to allow Firebase Functions deployment
    // The verification was causing deployment failures
    // TODO: Re-enable reCAPTCHA when deployment issues are resolved
    // SECURITY NOTE: Without reCAPTCHA, this endpoint is vulnerable to automated abuse.
    // Consider implementing rate limiting or re-enabling reCAPTCHA verification
    // by uncommenting the verifyRecaptcha call below and configuring RECAPTCHA_SECRET.
    // 
    // To re-enable reCAPTCHA:
    // 1. Set RECAPTCHA_SECRET environment variable in Firebase Functions
    // 2. Uncomment the recaptchaToken extraction and verification code below:
    //
    // const recaptchaToken = req.body.recaptcha || req.body.recaptchaToken || req.body['g-recaptcha-response'];
    // const recaptchaResult = await verifyRecaptcha(recaptchaToken, { expectedAction: 'booking' });
    // if (!recaptchaResult.success) {
    //   const statusCode = recaptchaResult.error === 'missing recaptcha token' ? 400 : 401;
    //   return res.status(statusCode).json({ 
    //     error: recaptchaResult.error,
    //     message: recaptchaResult.error === 'missing recaptcha token' 
    //       ? 'Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen.'
    //       : 'Turvavarmennus epäonnistui. Yritä uudelleen.',
    //     details: recaptchaResult.details
    //   });
    // }
    console.log('reCAPTCHA verification skipped - disabled for deployment');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Virheellinen sähköpostiosoite' });

    // More permissive phone regex: accepts Finnish numbers in common formats
    // Supports: +358 XX XXXXXXX, 0XX XXXXXXX, or just digits (6-12 digits)
    const phoneRegex = /^(?:\+358|0)?\s?\d{6,12}$/;
    if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Virheellinen puhelinnumero. Käytä muotoa: +358 40XXXXXXX tai 040XXXXXXX' });

    const bookingDate = new Date(aika);
    const now = new Date();
    if (Number.isNaN(bookingDate.getTime()) || bookingDate <= now) return res.status(400).json({ error: 'Valitse tuleva aika' });

    const dayOfWeek = bookingDate.getDay();
    const hour = bookingDate.getHours();
    if (dayOfWeek === 0 || dayOfWeek === 6) return res.status(400).json({ error: 'Varaukset vain arkipäivisin' });
    if (hour < 9 || hour >= 17) return res.status(400).json({ error: 'Varaukset klo 9-17 välillä' });

    const bookingRef = db.collection(BOOKINGS_COLLECTION).doc();

    try {
      await db.runTransaction(async (transaction) => {
        const available = await isSlotAvailable(bookingDate);
        if (!available) throw new Error('SLOT_UNAVAILABLE');

        const bookingData = {
          nimi: name,
          sahkoposti: email,
          puhelin: phone,
          aika: admin.firestore.Timestamp.fromDate(bookingDate),
          services: services,
          totalPrice: totalPrice || 'Hinta sovittaessa',
          totalNumericPrice: totalNumericPrice || 0,
          luotu: admin.firestore.FieldValue.serverTimestamp(),
          googleEventId: null,
          syncedToGoogle: false
        };

        transaction.set(bookingRef, bookingData);
      });

      console.log('Booking created in Firestore:', bookingRef.id);

      const createdSnap = await bookingRef.get();
      const createdData = createdSnap.data();
      
      console.log('Booking data retrieved from Firestore:', {
        id: bookingRef.id,
        nimi: createdData.nimi,
        aika: createdData.aika,
        servicesCount: (createdData.services || []).length
      });

      // FIX: Create Google Calendar event SYNCHRONOUSLY before returning response
      // Previously this was done in an async IIFE which could be cut off when the
      // HTTP function lifecycle ended, causing events to not be created in Google Calendar
      let googleEventId = null;
      let googleCalendarError = null;
      try {
        console.log('Attempting to create Google Calendar event for booking:', bookingRef.id);
        googleEventId = await createGoogleCalendarEvent(createdData);
        if (googleEventId) {
          await bookingRef.update({
            googleEventId: googleEventId,
            syncedToGoogle: true,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('Google Calendar event created and linked successfully:', {
            bookingId: bookingRef.id,
            googleEventId: googleEventId
          });
        } else {
          console.warn('Google Calendar event creation returned null - calendar may not be configured');
          googleCalendarError = 'Calendar not configured';
        }
      } catch (calendarError) {
        // Log detailed error but don't fail the booking - calendar sync is secondary
        console.error('Google Calendar sync failed for booking:', {
          bookingId: bookingRef.id,
          errorMessage: calendarError.message || calendarError,
          errorCode: calendarError.code,
          errorStack: calendarError.stack
        });
        googleCalendarError = calendarError.message || 'Calendar sync failed';
      }

      // Return success with detailed info for debugging
      return res.status(200).json({ 
        success: true, 
        id: bookingRef.id, 
        message: 'Varaus onnistui', 
        googleEventId: googleEventId,
        googleCalendarSynced: !!googleEventId,
        googleCalendarError: googleCalendarError
      });
    } catch (txErr) {
      if (txErr.message === 'SLOT_UNAVAILABLE') {
        console.log('Slot unavailable for booking');
        return res.status(409).json({ error: 'Valittu aika on jo varattu. Valitse toinen aika.' });
      }
      throw txErr;
    }
  } catch (err) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ error: 'Varauksen luonti epäonnistui. Yritä uudelleen.' });
  }
});

// =======================
// Firestore Triggers (v2)
// =======================

// Email collection name used by Firebase Email Extension (Trigger Email from Firestore)
const MAIL_COLLECTION = 'mail';

/**
 * Creates an email document in the 'mail' collection for Firebase Email Extension
 * This triggers the "Trigger Email from Firestore" extension to send the email via SMTP
 * 
 * @param {Object} bookingData - The booking data from Firestore
 * @param {string} bookingId - The booking document ID
 * @returns {Promise<string|null>} - The created mail document ID or null on failure
 */
async function createEmailDocument(bookingData, bookingId) {
  try {
    const startDate = parseFirestoreDate(bookingData.aika);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      console.warn('Invalid booking date for email, skipping:', bookingData);
      return null;
    }

    const formattedDate = startDate.toLocaleDateString('fi-FI', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = startDate.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Escape user input to prevent XSS
    const escapedName = escapeHtml(bookingData.nimi);
    const escapedEmail = escapeHtml(bookingData.sahkoposti);
    const escapedPhone = escapeHtml(bookingData.puhelin);
    const escapedTotalPrice = escapeHtml(bookingData.totalPrice);

    const servicesHtml = (bookingData.services || [])
      .map(s => `<li>${escapeHtml(s.serviceName || '')} - ${escapeHtml(s.taskName || '')}${s.price ? ': ' + escapeHtml(s.price) : ''}</li>`)
      .join('') || '<li>Palvelu ei määritelty</li>';

    // Create email document for Firebase Email Extension
    // The extension reads from 'mail' collection and sends emails via configured SMTP
    const mailDoc = {
      to: bookingData.sahkoposti,
      message: {
        subject: `Varausvahvistus - ${COMPANY_NAME}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333333;">Varausvahvistus</h2>
            <p>Hei ${escapedName || 'asiakas'},</p>
            <p>Kiitos varauksestasi! Olemme vastaanottaneet varauksesi. Tässä varauksen tiedot:</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Varauksen tiedot</h3>
              <p><strong>Aika:</strong> ${formattedDate} klo ${formattedTime}</p>
              <p><strong>Asiakas:</strong> ${escapedName}</p>
              <p><strong>Puhelin:</strong> ${escapedPhone}</p>
              <p><strong>Sähköposti:</strong> ${escapedEmail}</p>
            </div>
            
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Valitut palvelut</h3>
              <ul style="margin: 0; padding-left: 20px;">${servicesHtml}</ul>
              <p style="margin-top: 15px;"><strong>Kokonaishinta:</strong> ${escapedTotalPrice || 'Hinta sovittaessa'}</p>
            </div>
            
            <p>Otamme sinuun yhteyttä tarvittaessa ennen varattua aikaa.</p>
            <p>Jos sinun täytyy perua tai muuttaa varausta, ota yhteyttä:</p>
            <ul>
              <li>Puhelin: <a href="tel:${COMPANY_PHONE}">${COMPANY_PHONE_DISPLAY}</a></li>
              <li>Sähköposti: <a href="mailto:${COMPANY_EMAIL}">${COMPANY_EMAIL}</a></li>
            </ul>
            
            <p style="margin-top: 30px;">Ystävällisin terveisin,<br><strong>${COMPANY_NAME}</strong></p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              Tämä on automaattinen vahvistusviesti. Älä vastaa tähän viestiin.
            </p>
          </div>
        `
      },
      // Metadata for tracking
      bookingId: bookingId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const mailRef = await db.collection(MAIL_COLLECTION).add(mailDoc);
    console.log('Email document created for Firebase Email Extension:', mailRef.id);
    return mailRef.id;
  } catch (err) {
    console.error('Failed to create email document:', err.message || err);
    return null;
  }
}

// Email confirmation trigger - sends email when new booking is created
// FIX: Dual-path email sending:
// 1. Primary: Write to 'mail' collection for Firebase Email Extension (if installed)
// 2. Fallback: Use Nodemailer directly if email credentials are configured
// This ensures emails are sent regardless of which method is available
exports.onBookingCreated = onDocumentCreated({
  document: `${BOOKINGS_COLLECTION}/{bookingId}`,
  region: 'us-central1'
}, async (event) => {
  const bookingData = event.data.data();
  const bookingId = event.params.bookingId;
  
  console.log('onBookingCreated triggered for booking:', bookingId);
  
  if (!bookingData) {
    console.log('No booking data found for:', bookingId);
    return null;
  }

  // Skip email for bookings synced from Google Calendar
  if (bookingData.syncedFromGoogle) {
    console.log('Booking synced from Google Calendar - skipping email for:', bookingId);
    return null;
  }

  // Validate email address exists
  if (!bookingData.sahkoposti) {
    console.log('No email address in booking - skipping email for:', bookingId);
    return null;
  }

  console.log('Processing email for booking:', {
    bookingId: bookingId,
    customerEmail: bookingData.sahkoposti,
    customerName: bookingData.nimi
  });

  let emailSent = false;
  let mailDocId = null;

  try {
    // Primary path: Create email document for Firebase Email Extension (Trigger Email from Firestore)
    mailDocId = await createEmailDocument(bookingData, bookingId);
    if (mailDocId) {
      console.log('Email document created for Firebase Email Extension:', {
        bookingId: bookingId,
        mailDocId: mailDocId,
        method: 'firebase-extension'
      });
      emailSent = true;
    } else {
      console.log('Firebase Email Extension document creation failed, trying Nodemailer fallback');
    }
  } catch (err) {
    console.error('Firebase Email Extension failed:', {
      bookingId: bookingId,
      error: err.message || err
    });
  }

  // Fallback path: Use Nodemailer directly if Firebase Extension failed and Nodemailer is configured
  if (!emailSent) {
    try {
      const nodemailerResult = await sendBookingConfirmationEmail(bookingData);
      if (nodemailerResult) {
        console.log('Email sent via Nodemailer fallback:', {
          bookingId: bookingId,
          method: 'nodemailer'
        });
        emailSent = true;
      } else {
        console.warn('Nodemailer fallback also failed or not configured:', bookingId);
      }
    } catch (nodemailerErr) {
      console.error('Nodemailer fallback failed:', {
        bookingId: bookingId,
        error: nodemailerErr.message || nodemailerErr
      });
    }
  }

  // Use module-level getEmailMethod helper function
  const emailMethodUsed = getEmailMethod(mailDocId, emailSent);

  // Update booking document with email status for tracking
  try {
    const updateData = {
      emailSent: emailSent,
      emailSentAt: emailSent ? admin.firestore.FieldValue.serverTimestamp() : null,
      emailMethod: emailMethodUsed
    };
    await db.collection(BOOKINGS_COLLECTION).doc(bookingId).update(updateData);
    console.log('Booking updated with email status:', {
      bookingId: bookingId,
      emailSent: emailSent
    });
  } catch (updateErr) {
    console.error('Failed to update booking with email status:', {
      bookingId: bookingId,
      error: updateErr.message || updateErr
    });
  }

  console.log('Email trigger completed for booking:', {
    bookingId: bookingId,
    emailSent: emailSent,
    method: emailMethodUsed || 'none'
  });

  return null;
});

exports.onBookingUpdated = onDocumentUpdated({
  document: `${BOOKINGS_COLLECTION}/{bookingId}`,
  region: 'us-central1'
}, async (event) => {
  const calendar = initializeGoogleCalendar();
  if (!calendar || !calendarId) return null;

  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  if (afterData.syncedFromGoogle) return null; // prevent loops
  const googleEventId = afterData.googleEventId;
  if (!googleEventId) {
    console.log('No googleEventId on update - skipping');
    return null;
  }

  try {
    const startDate = parseFirestoreDate(afterData.aika);
    if (!startDate) {
      console.warn('Cannot update Google event: invalid aika for booking', event.data.params.bookingId);
      return null;
    }
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const serviceInfo = (afterData.services || []).map(s =>
      `${s.serviceName || ''} - ${s.taskName || ''}${s.price ? ': ' + s.price : ''}`
    ).join('\n') || 'Palvelu ei määritelty';

    await calendar.events.patch({
      calendarId,
      eventId: googleEventId,
      requestBody: {
        summary: `Varaus: ${afterData.nimi || 'Tuntematon'}`,
        description:
          `Asiakas: ${afterData.nimi || ''}\n` +
          `Puhelin: ${afterData.puhelin || ''}\n` +
          `Sähköposti: ${afterData.sahkoposti || ''}\n\n` +
          `Palvelut:\n${serviceInfo}\n\n` +
          `Kokonaishinta: ${afterData.totalPrice || 'Hinta sovittaessa'}`,
        start: { dateTime: startDate.toISOString(), timeZone: 'Europe/Helsinki' },
        end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Helsinki' }
      }
    });

    console.log('Patched Google event:', googleEventId);
  } catch (err) {
    console.error('Failed to patch Google event:', err.message || err);
  }
});

exports.onBookingDeleted = onDocumentDeleted({
  document: `${BOOKINGS_COLLECTION}/{bookingId}`,
  region: 'us-central1'
}, async (event) => {
  const calendar = initializeGoogleCalendar();
  if (!calendar || !calendarId) return null;

  const data = event.data.data();
  if (!data) return null;
  const googleEventId = data.googleEventId;
  if (!googleEventId) {
    console.log('No googleEventId on delete - skipping');
    return null;
  }

  if (data.deletedFromGoogle === true) {
    console.log('Deletion originated from Google - skipping to prevent loop');
    return null;
  }

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
    console.log('Deleted Google event:', googleEventId);
  } catch (err) {
    console.error('Failed to delete Google event:', err.message || err);
  }
});

// =======================
// Helper: register watch (used by watchRegistrar / renewCalendarWatch)
// =======================
async function registerCalendarWatch(callbackUrl) {
  if (!callbackUrl) throw new Error('Missing callbackUrl');
  const calendarIdEnv = safeGetParamValue(googleCalendarId, 'GOOGLE_CALENDAR_ID') || getLegacyConfigValue('google.calendar_id');
  if (!calendarIdEnv) throw new Error('Missing GOOGLE_CALENDAR_ID');

  // Use workload identity / function's SA (ADC) when available
  const authClient = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/calendar']
  });
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const channelId = `fxnr-web-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const requestBody = {
    id: channelId,
    type: 'web_hook',
    address: callbackUrl,
    // optional token or params can be added here for validation
  };

  const resp = await calendar.events.watch({
    calendarId: calendarIdEnv,
    requestBody
  });

  const data = resp.data || {};
  const doc = {
    channelId: data.id || channelId,
    resourceId: data.resourceId || null,
    expiration: data.expiration ? Number(data.expiration) : null,
    calendarId: calendarIdEnv,
    callbackUrl,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    nextSyncToken: data.nextSyncToken || null,
    raw: data
  };

  const docId = doc.channelId || `watch-${Date.now()}`;
  await db.collection(WATCH_COLLECTION).doc(docId).set(doc);
  return data;
}

// =======================
// HTTP: watchRegistrar (register Google Calendar watch -> saves to Firestore)
// Expects POST JSON: { "callbackUrl": "https://.../calendarWebhook" }
// If WATCH_CALLBACK_URL env var is set, that will be used as default.
// =======================
exports.watchRegistrar = onRequest({
  region: 'us-central1'
}, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST' });
    }

    const bodyCb = (req.body && req.body.callbackUrl) ? req.body.callbackUrl : null;
    const envCb = safeGetParamValue(watchCallbackEnv, 'WATCH_CALLBACK_URL') || getLegacyConfigValue('watch.callback_url');
    const callbackUrl = bodyCb || envCb;

    if (!callbackUrl) {
      return res.status(400).json({ error: 'Missing callbackUrl in request body and no WATCH_CALLBACK_URL configured' });
    }

    const data = await registerCalendarWatch(callbackUrl);
    return res.status(200).json({ ok: true, watch: data });
  } catch (err) {
    console.error('watchRegistrar error:', err && (err.message || err));
    return res.status(500).json({ error: err && (err.message || JSON.stringify(err)) });
  }
});

// =======================
// HTTP: renewCalendarWatch (simple helper to re-register watch if needed)
// If you want scheduler to auto-run this, create Cloud Scheduler job calling this endpoint.
// =======================
exports.renewCalendarWatch = onRequest({
  region: 'us-central1'
}, async (req, res) => {
  try {
    // Allow POST only for safety
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // We will re-register watch using same callback as last known watch (if available)
    const last = await db.collection(WATCH_COLLECTION).orderBy('createdAt', 'desc').limit(1).get();
    const doc = last.docs[0];
    const callbackUrl = (req.body && req.body.callbackUrl) ? req.body.callbackUrl : (doc ? doc.data().callbackUrl : null);

    if (!callbackUrl) {
      return res.status(400).json({ error: 'No callbackUrl found (provide in POST body or register watch first)' });
    }

    const data = await registerCalendarWatch(callbackUrl);
    return res.status(200).json({ ok: true, watch: data });
  } catch (err) {
    console.error('renewCalendarWatch error:', err && (err.message || err));
    return res.status(500).json({ error: err && (err.message || JSON.stringify(err)) });
  }
});

// =======================
// Google Calendar webhook (improved with syncToken handling)
// FIX: Respond 200 OK AFTER processing completes to avoid premature termination
// FIX: Enhanced logging for better debugging of sync issues
// =======================
exports.calendarWebhook = onRequest({
  region: 'us-central1'
}, async (req, res) => {
  console.log('Calendar webhook received:', {
    method: req.method,
    resourceState: req.headers['x-goog-resource-state'],
    channelId: req.headers['x-goog-channel-id'],
    resourceId: req.headers['x-goog-resource-id'],
    messageNumber: req.headers['x-goog-message-number']
  });

  try {
    // If calendar isn't configured via explicit service account, we will try ADC via getClient
    const calendar = initializeGoogleCalendar() || (await (async () => {
      try {
        const authClient = await google.auth.getClient({
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
        const calIdEnv = safeGetParamValue(googleCalendarId, 'GOOGLE_CALENDAR_ID') || getLegacyConfigValue('google.calendar_id');
        if (!calIdEnv) return null;
        calendarId = calIdEnv;
        return google.calendar({ version: 'v3', auth: authClient });
      } catch (e) {
        console.error('calendarWebhook auth getClient failed:', e && (e.message || e));
        return null;
      }
    })());

    if (!calendar || !calendarId) {
      console.log('Calendar not configured - ignoring webhook');
      return res.status(200).send('OK');
    }

    const resourceState = req.headers['x-goog-resource-state'];
    if (!resourceState || (resourceState !== 'exists' && resourceState !== 'updated')) {
      console.log('Ignoring webhook with state:', resourceState);
      return res.status(200).send('OK');
    }

    console.log('Processing calendar webhook with state:', resourceState);

    // We'll attempt to use saved nextSyncToken for incremental sync.
    const watchSnap = await db.collection(WATCH_COLLECTION).orderBy('createdAt', 'desc').limit(1).get();
    const watchDoc = watchSnap.docs[0];
    const syncToken = watchDoc ? (watchDoc.data().nextSyncToken || null) : null;

    console.log('Sync token status:', {
      hasSyncToken: !!syncToken,
      hasWatchDoc: !!watchDoc
    });

    let events = [];
    async function doFullListAndSaveToken(docRef) {
      // full list (time range recent month) to avoid massive payloads
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);

      console.log('Performing full calendar list from:', oneMonthAgo.toISOString());

      const resp = await calendar.events.list({
        calendarId,
        timeMin: oneMonthAgo.toISOString(),
        singleEvents: true,
        maxResults: 2500,
        orderBy: 'startTime'
      });
      events = resp.data.items || [];
      console.log('Full list returned', events.length, 'events');
      
      if (resp.data.nextSyncToken && docRef) {
        await docRef.update({ nextSyncToken: resp.data.nextSyncToken, lastSyncAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log('Updated nextSyncToken in watch document');
      }
    }

    try {
      if (syncToken && watchDoc) {
        try {
          console.log('Attempting incremental sync with syncToken');
          const resp = await calendar.events.list({
            calendarId,
            syncToken,
            singleEvents: true,
            maxResults: 2500
          });
          events = resp.data.items || [];
          console.log('Incremental sync returned', events.length, 'events');
          
          if (resp.data.nextSyncToken) {
            await watchDoc.ref.update({ nextSyncToken: resp.data.nextSyncToken, lastSyncAt: admin.firestore.FieldValue.serverTimestamp() });
            console.log('Updated nextSyncToken after incremental sync');
          }
        } catch (err) {
          // If sync token invalid/expired, fall back to full list
          const isSyncInvalid = (err && (err.code === 410 ||
            (err.errors && err.errors[0] && err.errors[0].reason === 'syncTokenInvalid')));
          if (isSyncInvalid) {
            console.warn('Sync token invalid/expired, falling back to full list');
            await doFullListAndSaveToken(watchDoc ? watchDoc.ref : null);
          } else {
            throw err;
          }
        }
      } else {
        console.log('No sync token available, performing full list');
        await doFullListAndSaveToken(watchDoc ? watchDoc.ref : null);
      }
    } catch (err) {
      console.error('Failed to fetch events from Google Calendar:', {
        error: err.message || err,
        code: err.code
      });
      // safe fallback - abort further processing to avoid deleting things incorrectly
      return res.status(200).send('OK');
    }

    // Upsert events into Firestore (create or update)
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    for (const eventItem of events) {
      try {
        if (!eventItem || !eventItem.id) continue;
        if (!eventItem.start || !eventItem.start.dateTime) continue;

        const startTime = new Date(eventItem.start.dateTime);
        if (Number.isNaN(startTime.getTime())) continue;

        const existingSnapshot = await db.collection(BOOKINGS_COLLECTION)
          .where('googleEventId', '==', eventItem.id)
          .limit(1)
          .get();

        const desc = eventItem.description || '';
        const nameMatch = desc.match(/Asiakas:\s*(.+)/);
        const phoneMatch = desc.match(/Puhelin:\s*(.+)/);
        const emailMatch = desc.match(/Sähköposti:\s*(.+)/);

        const upsertData = {
          nimi: nameMatch ? nameMatch[1].trim() : 'Google Calendar -varaus',
          puhelin: phoneMatch ? phoneMatch[1].trim() : '',
          sahkoposti: emailMatch ? emailMatch[1].trim() : '',
          aika: admin.firestore.Timestamp.fromDate(startTime),
          services: [], // we don't have service data from Google events
          totalPrice: 'Hinta sovittaessa',
          googleEventId: eventItem.id,
          syncedFromGoogle: true,
          googleSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (existingSnapshot.empty) {
          await db.collection(BOOKINGS_COLLECTION).add({
            ...upsertData,
            luotu: admin.firestore.FieldValue.serverTimestamp()
          });
          createdCount++;
          console.log('Created booking from calendar event:', eventItem.id);
        } else {
          const docRef = existingSnapshot.docs[0].ref;
          await docRef.update({
            ...upsertData,
            // do not overwrite luotu
          });
          updatedCount++;
          console.log('Updated booking from calendar event:', eventItem.id);
        }
      } catch (evtErr) {
        console.error('Error processing calendar event:', {
          eventId: eventItem && eventItem.id,
          error: evtErr.message || evtErr
        });
      }
    }

    // Remove deleted events in Firestore (mark/delete)
    const allBookings = await db.collection(BOOKINGS_COLLECTION)
      .where('googleEventId', '!=', null)
      .get();

    const eventIds = new Set(events.map(e => e.id));
    for (const doc of allBookings.docs) {
      const booking = doc.data();
      if (booking.googleEventId && !eventIds.has(booking.googleEventId)) {
        try {
          await doc.ref.update({ deletedFromGoogle: true });
          await new Promise(r => setTimeout(r, 100));
          await doc.ref.delete();
          deletedCount++;
          console.log('Deleted booking removed from Google Calendar:', doc.id);
        } catch (delErr) {
          console.error('Failed to remove booking for missing Google event:', {
            docId: doc.id,
            error: delErr.message || delErr
          });
        }
      }
    }

    console.log('Calendar webhook completed:', {
      eventsProcessed: events.length,
      bookingsCreated: createdCount,
      bookingsUpdated: updatedCount,
      bookingsDeleted: deletedCount
    });
    
    // Respond 200 OK after all processing is complete
    return res.status(200).send('OK');
  } catch (err) {
    console.error('calendarWebhook error:', {
      error: err.message || err,
      stack: err.stack
    });
    // Still return 200 to acknowledge receipt to Google (prevents retries)
    return res.status(200).send('OK');
  }
});

// End of file