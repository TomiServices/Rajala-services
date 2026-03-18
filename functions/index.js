// index.js - Firebase Functions for Rajala Services Booking System (updated)
// Added: watchRegistrar + improved calendarWebhook with syncToken handling
// Preserves all existing features; small, well-commented additions.

const admin = require('firebase-admin');
const axios = require('axios');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');
const { getGoogleClient } = require('./lib/auth-client');

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
const googleServiceAccount = defineString('GOOGLE_SERVICE_ACCOUNT');
const googleCalendarId = defineString('GOOGLE_CALENDAR_ID');
const emailUser = defineString('EMAIL_USER');
const emailPassword = defineString('EMAIL_PASSWORD');
const emailFrom = defineString('EMAIL_FROM');
const sendgridApiKey = defineString('SENDGRID_API_KEY');
const watchCallbackEnv = defineString('WATCH_CALLBACK_URL'); // optional preconfigured callback URL

// =======================
// CONSTANTS
// =======================
const BOOKINGS_COLLECTION = 'varaukset';
const WATCH_COLLECTION = 'calendarWatch';
const ALLOWED_ORIGINS = [
  'https://www.rajala-services.com',
  'https://rajala-services.com',
  'https://webbi1.web.app',
  'https://webbi1.firebaseapp.com'
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
// UTILITY: Retry with exponential backoff + jitter
// =======================
/**
 * Calls fn() up to maxAttempts times, waiting baseDelayMs * 2^(attempt-1) + jitter between retries.
 * 4xx HTTP errors (except 429 Too Many Requests) are not retried because they represent
 * permanent failures — retrying with the same request will always produce the same result.
 * @param {Function} fn - Async function to call
 * @param {number} maxAttempts - Maximum number of attempts (default 3)
 * @param {number} baseDelayMs - Base delay in milliseconds (default 500)
 * @returns {Promise<*>} - Resolves with fn's return value or rejects with last error
 */
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 500) {
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

// =======================
// UTILITY: Build booking confirmation email HTML
// =======================
/**
 * Builds the HTML body for a booking confirmation email.
 * @param {Object} bookingData - Booking data from Firestore
 * @param {string} formattedDate - Pre-formatted date string (fi-FI locale)
 * @param {string} formattedTime - Pre-formatted time string (fi-FI locale)
 * @returns {string} HTML string
 */
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
      
      <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Saapumisohjeet</h3>
        <p><strong>Osoite:</strong> Tiilenvalajantie 6</p>
        <p><strong>Postiosoite:</strong> 02330, Espoo</p>
        <div style="margin-top: 15px;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=Tiilenvalajantie+6,+02330+Espoo,+Finland" 
             style="display: inline-block; background-color: #3FA9F5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            🗺️ Reittiohjeet
          </a>
        </div>
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
  `;
}

// =======================
// UTILITY: Validate Environment Variables
// =======================
/**
 * Validates that required environment variables are set.
 * Logs a specific error for each missing variable.
 * @param {string[]} requiredEnvs - Array of required environment variable names
 * @throws {Error} if any required variable is missing
 */
function validateEnvVariables(requiredEnvs) {
  const missing = requiredEnvs.filter(env => !process.env[env]);
  for (const env of missing) {
    console.error(`${env} is missing. Cannot proceed.`);
  }
  if (missing.length > 0) {
    throw new Error(`ENV not configured: ${missing.join(', ')}`);
  }
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

  // Trim whitespace to guard against environment variables set to blank strings,
  // which would pass the falsy check but cause "Missing credentials for PLAIN"
  // errors in Nodemailer when it tries to authenticate with SMTP.
  emailUserVal = emailUserVal && emailUserVal.trim();
  emailPasswordVal = emailPasswordVal && emailPasswordVal.trim();

  if (!emailUserVal || !emailPasswordVal) {
    console.error('Email not configured (missing EMAIL_USER or EMAIL_PASSWORD)');
    return null;
  }

  try {
    // Use explicit STARTTLS on port 587 to avoid SMTP relay 421 throttling issues.
    // connectionTimeout: abort early if the TCP connection to smtp.gmail.com stalls —
    // without this, a hanging SMTP server can cause the Cloud Function to time out
    // (default 60 s) before any email is attempted, silently dropping the notification.
    // socketTimeout: cap the time allowed for an SMTP command response (EHLO, AUTH, etc.)
    // so that a mid-session stall is also caught quickly and we can fall through to
    // the SendGrid / Firebase-Extension fallback path.
    emailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,           // STARTTLS (upgrades after connect)
      requireTLS: true,        // Reject if STARTTLS is not available
      connectionTimeout: 5000, // 5 s — fail fast if SMTP host is unreachable.
                               // Gmail responds within ~1–2 s under normal conditions;
                               // 5 s is generous enough to handle momentary latency
                               // while keeping the Cloud Function well within its 60 s limit.
      socketTimeout: 10000,    // 10 s — fail fast if SMTP session stalls mid-way.
                               // Covers the full EHLO + STARTTLS + AUTH + DATA exchange;
                               // typical Gmail AUTH completes in < 3 s.
      auth: {
        user: emailUserVal,
        pass: emailPasswordVal
      }
    });
    console.log('Email transporter initialized (STARTTLS port 587)');
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

    const mailOptions = {
      from: emailFromVal,
      to: bookingData.sahkoposti,
      subject: `Varausvahvistus - ${COMPANY_NAME}`,
      html: buildBookingEmailHtml(bookingData, formattedDate, formattedTime)
    };

    await withRetry(() => transporter.sendMail(mailOptions));
    console.log('Confirmation email sent to:', bookingData.sahkoposti);
    return true;
  } catch (err) {
    console.error('Failed to send confirmation email:', err.message || err);
    return false;
  }
}

/**
 * Sends a booking confirmation email via the SendGrid HTTP API.
 * This is the primary email path - avoids SMTP relay throttling (421 errors).
 * SENDGRID_API_KEY must be configured in environment / Secret Manager.
 * @param {Object} bookingData - Booking data from Firestore
 * @returns {Promise<boolean>} true on success, false otherwise
 */
async function sendEmailViaSendGrid(bookingData) {
  const apiKey = safeGetParamValue(sendgridApiKey, 'SENDGRID_API_KEY');
  if (!apiKey) {
    console.log('SendGrid not configured (missing SENDGRID_API_KEY) - skipping');
    return false;
  }
  // Trim whitespace to guard against environment variables accidentally set with
  // surrounding spaces, which would cause "Unauthorized" (401) on every request.
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    console.log('SendGrid not configured (SENDGRID_API_KEY is blank after trim) - skipping');
    return false;
  }

  try {
    let emailFromVal = safeGetParamValue(emailFrom, 'EMAIL_FROM') ||
      safeGetParamValue(emailUser, 'EMAIL_USER') ||
      getLegacyConfigValue('email.from') ||
      `${COMPANY_NAME} <${COMPANY_EMAIL}>`;

    const startDate = parseFirestoreDate(bookingData.aika);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      console.warn('Invalid booking date for SendGrid email, skipping:', bookingData);
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

    sgMail.setApiKey(trimmedApiKey);
    const msg = {
      to: bookingData.sahkoposti,
      from: emailFromVal,
      subject: `Varausvahvistus - ${COMPANY_NAME}`,
      html: buildBookingEmailHtml(bookingData, formattedDate, formattedTime)
    };

    await withRetry(() => sgMail.send(msg));
    console.log('Confirmation email sent via SendGrid to:', bookingData.sahkoposti);
    return true;
  } catch (err) {
    console.error('Failed to send email via SendGrid:', err.message || err);
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

/**
 * Formats a Firestore timestamp value as a Finnish date-time string (Europe/Helsinki).
 * Returns an empty string if the value cannot be parsed.
 * @param {*} val - Firestore Timestamp, Date, number, or string
 * @returns {string} e.g. "27.2.2026 klo 14.30" or ""
 */
function formatFinnishDateTime(val) {
  const date = parseFirestoreDate(val);
  if (!date) return '';
  return date.toLocaleString('fi-FI', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
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

    const secretKey = process.env.RECAPTCHA_SECRET;
    if (!secretKey) {
      // RECAPTCHA_SECRET is not set in the server environment.
      // Returning success:true (allowing the booking) avoids blocking all users due to
      // a server misconfiguration, which is worse than a momentary gap in bot protection.
      // Admins should configure RECAPTCHA_SECRET to restore full bot-blocking capability.
      console.error('ACTION REQUIRED: RECAPTCHA_SECRET is not configured – reCAPTCHA verification is disabled. Set this environment variable to re-enable bot protection.');
      return {
        success: true,
        details: { reason: 'reCAPTCHA not configured on server – verification skipped' }
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
      // Score threshold configurable via environment (default: 0.3).
      // A threshold of 0.3 is intentionally more permissive than the commonly cited 0.5
      // to avoid rejecting legitimate users who may exhibit lower-confidence mouse/typing
      // patterns (e.g. mobile users, users with accessibility tools, etc.) while still
      // blocking clear bot traffic that typically scores 0.0–0.1.
      const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.3');
      
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

  // Track which auth method was used for logging
  let authMethod = 'jwt';
  let calendar = initializeGoogleCalendar();
  let effectiveCalendarId = calendarId;
  
  // If service account initialization fails, try ADC fallback
  if (!calendar || !effectiveCalendarId) {
    const calIdEnv = safeGetParamValue(googleCalendarId, 'GOOGLE_CALENDAR_ID') || getLegacyConfigValue('google.calendar_id');
    
    try {
      const authClient = await getGoogleClient(['https://www.googleapis.com/auth/calendar']);
      if (authClient && calIdEnv) {
        effectiveCalendarId = calIdEnv;
        calendar = google.calendar({ version: 'v3', auth: authClient });
        authMethod = 'adc';
        console.log('Google Calendar initialized via ADC fallback (getGoogleClient).');
      }
    } catch (adcErr) {
      console.warn('ADC fallback failed:', adcErr.message || adcErr);
    }
    
    // If still not configured after ADC fallback, log and return null
    if (!calendar || !effectiveCalendarId) {
      console.error('Google Calendar integration not configured:', {
        calendarInitialized: !!calendar,
        calendarIdSet: !!effectiveCalendarId,
        serviceAccountConfigured: !!safeGetParamValue(googleServiceAccount, 'GOOGLE_SERVICE_ACCOUNT'),
        calendarIdConfigured: !!safeGetParamValue(googleCalendarId, 'GOOGLE_CALENDAR_ID')
      });
      return null;
    }
  }
  
  console.log('Google Calendar client used:', authMethod);

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

    const formattedCreatedAt = formatFinnishDateTime(bookingData.luotu);

    const event = {
      summary: `Varaus: ${bookingData.nimi || 'Tuntematon'}`,
      description:
        `Asiakas: ${bookingData.nimi || ''}\n` +
        `Puhelin: ${bookingData.puhelin || ''}\n` +
        `Sähköposti: ${bookingData.sahkoposti || ''}\n` +
        `Ajoneuvotyyppi: ${bookingData.vehicleType || 'Ei määritelty'}\n` +
        (bookingData.registrationNumber ? `Rekisteritunnus: ${bookingData.registrationNumber}\n\n` : '\n') +
        `Palvelut:\n${serviceInfo}\n\n` +
        `Kokonaishinta: ${bookingData.totalPrice || 'Hinta sovittaessa'}` +
        (bookingData.message ? `\n\nAsiakkaan viesti:\n${bookingData.message}` : '') +
        (formattedCreatedAt ? `\n\nVaraus tehty: ${formattedCreatedAt}` : ''),
      start: { dateTime: startDate.toISOString(), timeZone: 'Europe/Helsinki' },
      end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Helsinki' },
      colorId: '11'
    };

    console.log('Creating Google Calendar event:', {
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      calendarId: effectiveCalendarId
    });

    const resp = await calendar.events.insert({
      calendarId: effectiveCalendarId,
      requestBody: event
    });

    console.log('Google Calendar event created successfully:', {
      eventId: resp.data && resp.data.id,
      htmlLink: resp.data && resp.data.htmlLink,
      status: resp.data && resp.data.status,
      authMethod: authMethod
    });
    return resp.data && resp.data.id;
  } catch (err) {
    console.error('createGoogleCalendarEvent failed:', {
      errorMessage: err.message || err,
      errorCode: err.code,
      errorStatus: err.status,
      errors: err.errors || [],
      calendarId: effectiveCalendarId
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
  region: 'europe-north1',
  cors: ALLOWED_ORIGINS,
  invoker: 'public'
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
// Booking timezone helpers
// =======================

/** Finnish timezone used for all business-hours and weekday validation. */
const BOOKING_TIMEZONE = 'Europe/Helsinki';

/**
 * Returns the hour (0-23) and dayOfWeek (0=Sun … 6=Sat) for a Date value
 * evaluated in the Finnish/Helsinki timezone.  Uses Intl.DateTimeFormat so
 * the result is correct regardless of the Node.js process timezone (UTC by
 * default on Firebase Cloud Functions).
 *
 * @param {Date} date
 * @returns {{ hour: number, dayOfWeek: number }}
 */
function getHelsinkiComponents(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIMEZONE,
    hour: 'numeric',
    hour12: false,
    weekday: 'short'
  }).formatToParts(date);

  const partMap = {};
  parts.forEach(p => { partMap[p.type] = p.value; });

  // 'short' weekday names in en-US locale (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    // The ECMA-402 spec allows "24" for the hour value at midnight when
    // hour12:false is used (see TC39/ecma402 §11.5.7 note on cyclic hours).
    // Node 18's V8 ICU implementation follows this, so % 24 guards against it.
    hour: parseInt(partMap.hour, 10) % 24,
    dayOfWeek: dayIndex[partMap.weekday] ?? -1
  };
}

// =======================
// HTTP: POST /book
// =======================
exports.book = onRequest({
  region: 'europe-north1',
  cors: ALLOWED_ORIGINS,
  invoker: 'public'
}, async (req, res) => {
  try {
    setCorsHeadersForRequest(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, phone, aika, services, totalPrice, totalNumericPrice, vehicleType, message, registrationNumber } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !aika || !services) {
      return res.status(400).json({ error: 'Täytä kaikki pakolliset kentät' });
    }

    // Validate registrationNumber (required, at least 1 character)
    if (!registrationNumber || typeof registrationNumber !== 'string' || registrationNumber.trim() === '') {
      return res.status(400).json({ error: 'Rekisteritunnus on pakollinen tieto' });
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
     const recaptchaToken = req.body.recaptcha || req.body.recaptchaToken || req.body['g-recaptcha-response'];
     const recaptchaResult = await verifyRecaptcha(recaptchaToken, { expectedAction: 'booking' });
     if (!recaptchaResult.success) {
       const statusCode = recaptchaResult.error === 'missing recaptcha token' ? 400 : 401;
       return res.status(statusCode).json({ 
         error: recaptchaResult.error,
         message: recaptchaResult.error === 'missing recaptcha token' 
           ? 'Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen.'
           : 'Turvavarmennus epäonnistui. Yritä uudelleen.',
         details: recaptchaResult.details
       });
     }
    console.log('reCAPTCHA verification successful');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Virheellinen sähköpostiosoite' });

    // Normalise phone: strip all whitespace so that common formats like
    // "+358 40 1234567" and "+358401234567" are treated equivalently.
    const normalizedPhone = phone.replace(/\s+/g, '');
    // Accept international (+358 + 6–12 digits) or local (0 + 6–10 digits) Finnish formats.
    const phoneRegex = /^(\+358\d{6,12}|0\d{6,10})$/;
    if (!phoneRegex.test(normalizedPhone)) return res.status(400).json({ error: 'Virheellinen puhelinnumero. Käytä muotoa: +358 40XXXXXXX tai 040XXXXXXX' });

    // Validate vehicleType if provided (should be a non-empty string)
    if (vehicleType !== undefined && typeof vehicleType !== 'string') {
      return res.status(400).json({ error: 'Virheellinen ajoneuvotyyppi' });
    }

    // Validate message if provided (optional free-text, max 350 chars)
    if (message !== undefined && (typeof message !== 'string' || message.length > 350)) {
      return res.status(400).json({ error: 'Viesti on liian pitkä tai virheellinen' });
    }

    const bookingDate = new Date(aika);
    const now = new Date();
    if (Number.isNaN(bookingDate.getTime()) || bookingDate <= now) return res.status(400).json({ error: 'Valitse tuleva aika' });

    // Validate weekday and business hours in the Finnish timezone (Europe/Helsinki).
    // Firebase Cloud Functions run in UTC by default; using getDay()/getHours() directly
    // would reject valid Finnish morning slots (e.g. 9 AM Helsinki = 6 AM UTC in summer).
    const { hour, dayOfWeek } = getHelsinkiComponents(bookingDate);
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
          puhelin: normalizedPhone,
          aika: admin.firestore.Timestamp.fromDate(bookingDate),
          services: services,
          totalPrice: totalPrice || 'Hinta sovittaessa',
          totalNumericPrice: totalNumericPrice || 0,
          vehicleType: vehicleType || '',
          registrationNumber: registrationNumber.trim(),
          message: (message && typeof message === 'string') ? message.trim() : '',
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
    const escapedVehicleType = escapeHtml(bookingData.vehicleType || 'Ei määritelty');
    const escapedRegistrationNumber = escapeHtml(bookingData.registrationNumber || '');
    const escapedMessage = escapeHtml(bookingData.message || '');

    const servicesHtml = (bookingData.services || [])
      .map(s => `<li>${escapeHtml(s.serviceName || '')} - ${escapeHtml(s.taskName || '')}${s.price ? ': ' + escapeHtml(s.price) : ''}</li>`)
      .join('') || '<li>Palvelu ei määritelty</li>';

    const messageSection = escapedMessage
      ? `<div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Asiakkaan viesti</h3>
              <p style="white-space: pre-wrap;">${escapedMessage}</p>
            </div>`
      : '';

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
              <p><strong>Ajoneuvotyyppi:</strong> ${escapedVehicleType}</p>
              ${escapedRegistrationNumber ? `<p><strong>Rekisteritunnus:</strong> ${escapedRegistrationNumber}</p>` : ''}
            </div>
            
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Valitut palvelut</h3>
              <ul style="margin: 0; padding-left: 20px;">${servicesHtml}</ul>
              <p style="margin-top: 15px;"><strong>Kokonaishinta:</strong> ${escapedTotalPrice || 'Hinta sovittaessa'}</p>
            </div>
            
            ${messageSection}
            
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

    // Use bookingId as the document ID for idempotency.
    // Before writing, check whether the document already exists.  If it does,
    // skip the write: the Firebase Email Extension has already picked it up
    // (or is in the process of doing so).  Overwriting the document would reset
    // its state and cause the Extension to process it a second time, producing
    // duplicate email attempts (the root cause of the "2 entries in mail" bug).
    const existingMailDoc = await db.collection(MAIL_COLLECTION).doc(bookingId).get();
    if (existingMailDoc.exists) {
      const existingState = (existingMailDoc.data() || {}).state;
      console.log('[createEmailDocument] Mail document already exists (state:', existingState !== undefined ? existingState : 'unknown', ') – skipping overwrite for booking:', bookingId);
      return bookingId;
    }

    await db.collection(MAIL_COLLECTION).doc(bookingId).set(mailDoc);
    console.log('Email document created for Firebase Email Extension:', bookingId);
    return bookingId;
  } catch (err) {
    console.error('Failed to create email document:', err.message || err);
    return null;
  }
}

// Email confirmation trigger - sends email when new booking is created
// Email sending priority:
// 1. Primary:   Nodemailer directly (if EMAIL_USER / EMAIL_PASSWORD are configured)
// 2. Fallback:  SendGrid HTTP API (if SENDGRID_API_KEY is configured)
// 3. Last resort: Write to 'mail' collection → Firebase Trigger Email Extension sends via SMTP
//    (only used if neither Nodemailer nor SendGrid are configured)
exports.onBookingCreated = onDocumentCreated({
  document: `${BOOKINGS_COLLECTION}/{bookingId}`,
  region: 'europe-north1'
}, async (event) => {
  const bookingData = event.data.data();
  const bookingId = event.params.bookingId;
  
  console.log('[onBookingCreated] triggered for booking:', bookingId);

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

  // Idempotency check: bail out if an email was already sent for this booking.
  // Guards against duplicate emails caused by Firebase Function retries.
  try {
    const existingDoc = await db.collection(BOOKINGS_COLLECTION).doc(bookingId).get();
    if (existingDoc.exists && existingDoc.data().emailSent === true) {
      console.log('[onBookingCreated] Email already sent for booking - skipping duplicate send:', bookingId);
      return null;
    }
    console.log('[onBookingCreated] Idempotency check passed (emailSent not true) for booking:', bookingId);
  } catch (checkErr) {
    // Log but continue: better to risk a duplicate than to miss the confirmation email
    console.warn('[onBookingCreated] Could not verify emailSent flag, proceeding with email send:', {
      bookingId: bookingId,
      error: checkErr.message || checkErr
    });
  }

  console.log('[onBookingCreated] Processing email for booking:', {
    bookingId: bookingId,
    customerEmail: bookingData.sahkoposti,
    customerName: bookingData.nimi
  });

  let emailSent = false;
  let emailMethodUsed = null;

  // Primary path: Nodemailer with explicit STARTTLS (port 587)
  // Uses EMAIL_USER / EMAIL_PASSWORD environment variables that we control directly.
  // This is tried first to avoid relying on the Firebase Email Extension's SMTP config.
  try {
    const nodemailerResult = await sendBookingConfirmationEmail(bookingData);
    if (nodemailerResult) {
      emailSent = true;
      emailMethodUsed = 'nodemailer';
      console.log('[onBookingCreated] Email sent via Nodemailer:', {
        bookingId: bookingId,
        method: 'nodemailer'
      });
    } else {
      console.warn('[onBookingCreated] Nodemailer not configured or failed, trying SendGrid:', bookingId);
    }
  } catch (nodemailerErr) {
    console.error('[onBookingCreated] Nodemailer failed:', {
      bookingId: bookingId,
      error: nodemailerErr.message || nodemailerErr
    });
  }

  // Fallback: SendGrid HTTP API
  if (!emailSent) {
    try {
      const sgResult = await sendEmailViaSendGrid(bookingData);
      if (sgResult) {
        emailSent = true;
        emailMethodUsed = 'sendgrid';
        console.log('[onBookingCreated] Email sent via SendGrid:', {
          bookingId: bookingId,
          method: 'sendgrid'
        });
      } else {
        console.warn('[onBookingCreated] SendGrid not configured or failed, trying Firebase Extension:', bookingId);
      }
    } catch (sgErr) {
      console.error('[onBookingCreated] SendGrid failed:', {
        bookingId: bookingId,
        error: sgErr.message || sgErr
      });
    }
  }

  // Last-resort fallback: Firebase Email Extension (write to 'mail' collection)
  // The extension reads the document and sends via its configured SMTP.
  // createEmailDocument() will skip overwriting an existing document so that a
  // function retry cannot cause the Extension to process the same booking twice.
  if (!emailSent) {
    try {
      const mailDocId = await createEmailDocument(bookingData, bookingId);
      if (mailDocId) {
        emailSent = true;
        emailMethodUsed = 'firebase-extension';
        console.log('[onBookingCreated] Email document written for Firebase Email Extension:', {
          bookingId: bookingId,
          mailDocId: mailDocId,
          method: 'firebase-extension'
        });
      } else {
        console.warn('[onBookingCreated] All email paths failed for booking:', bookingId);
      }
    } catch (extErr) {
      console.error('[onBookingCreated] Firebase Email Extension path failed:', {
        bookingId: bookingId,
        error: extErr.message || extErr
      });
    }
  }

  // Update booking document with email status for tracking
  try {
    const updateData = {
      emailSent: emailSent,
      emailSentAt: emailSent ? admin.firestore.FieldValue.serverTimestamp() : null,
      emailMethod: emailMethodUsed
    };
    await db.collection(BOOKINGS_COLLECTION).doc(bookingId).update(updateData);
    console.log('[onBookingCreated] Booking updated with email status:', {
      bookingId: bookingId,
      emailSent: emailSent
    });
  } catch (updateErr) {
    console.error('[onBookingCreated] Failed to update booking with email status:', {
      bookingId: bookingId,
      error: updateErr.message || updateErr
    });
  }

  console.log('[onBookingCreated] Email trigger completed for booking:', {
    bookingId: bookingId,
    emailSent: emailSent,
    method: emailMethodUsed || 'none'
  });

  return null;
});

exports.onBookingUpdated = onDocumentUpdated({
  document: `${BOOKINGS_COLLECTION}/{bookingId}`,
  region: 'europe-north1'
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

    const updatedCreatedAt = formatFinnishDateTime(afterData.luotu);

    await calendar.events.patch({
      calendarId,
      eventId: googleEventId,
      requestBody: {
        summary: `Varaus: ${afterData.nimi || 'Tuntematon'}`,
        description:
          `Asiakas: ${afterData.nimi || ''}\n` +
          `Puhelin: ${afterData.puhelin || ''}\n` +
          `Sähköposti: ${afterData.sahkoposti || ''}\n` +
          (afterData.registrationNumber ? `Rekisteritunnus: ${afterData.registrationNumber}\n\n` : '\n') +
          `Palvelut:\n${serviceInfo}\n\n` +
          `Kokonaishinta: ${afterData.totalPrice || 'Hinta sovittaessa'}` +
          (afterData.message ? `\n\nAsiakkaan viesti:\n${afterData.message}` : '') +
          (updatedCreatedAt ? `\n\nVaraus tehty: ${updatedCreatedAt}` : ''),
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
  region: 'europe-north1'
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
  region: 'europe-north1',
  invoker: 'public'
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
  region: 'europe-north1',
  invoker: 'public'
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
  region: 'europe-north1',
  invoker: 'public'
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
        showDeleted: true,
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
            showDeleted: true,
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

    // Process events into Firestore (create, update, or delete)
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    for (const eventItem of events) {
      try {
        if (!eventItem || !eventItem.id) continue;

        // Handle deleted/cancelled events
        // When showDeleted: true is used, deleted events are returned with status='cancelled'
        // The 'deleted' property may also be set for some types of deletions
        if (eventItem.status === 'cancelled' || eventItem.deleted) {
          const existingSnapshot = await db.collection(BOOKINGS_COLLECTION)
            .where('googleEventId', '==', eventItem.id)
            .limit(1)
            .get();
          
          if (!existingSnapshot.empty) {
            const docRef = existingSnapshot.docs[0].ref;
            // Mark as deleted before removing to prevent race conditions with Firestore triggers
            await docRef.update({ deletedFromGoogle: true });
            // Small delay to ensure Firestore acknowledges the update before deletion
            await new Promise(r => setTimeout(r, 100));
            await docRef.delete();
            deletedCount++;
            console.log('Deleted booking for cancelled calendar event:', eventItem.id);
          }
          continue;
        }

        // Handle active events - skip if no valid start time
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