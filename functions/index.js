// index.js - Firebase Functions for Rajala Services Booking System (fixed)
// Robust date parsing: replaced direct toDate() calls with parseFirestoreDate
// Safe Google service account handling and defensive logging.

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
// ENVIRONMENT PARAMETERS (Gen2 / fallback to env)
// =======================
const recaptchaSecret = defineString('RECAPTCHA_SECRET');
const googleServiceAccount = defineString('GOOGLE_SERVICE_ACCOUNT');
const googleCalendarId = defineString('GOOGLE_CALENDAR_ID');
const emailUser = defineString('EMAIL_USER');
const emailPassword = defineString('EMAIL_PASSWORD');
const emailFrom = defineString('EMAIL_FROM');

// =======================
// CONSTANTS
// =======================
const BOOKINGS_COLLECTION = 'varaukset';
const ALLOWED_ORIGINS = [
  'https://www.rajala-services.com',
  'https://rajala-services.com',
  'https://fxnr-web.web.app',
  'https://fxnr-web.firebaseapp.com'
];

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

  // Legacy fallback: read functions.config().google if needed
  try {
    // eslint-disable-next-line global-require
    const legacyCfg = require('firebase-functions').config && require('firebase-functions').config().google;
    if (legacyCfg) {
      if (!saRaw && legacyCfg.service_account) saRaw = legacyCfg.service_account;
      if (!calIdRaw && legacyCfg.calendar_id) calIdRaw = legacyCfg.calendar_id;
    }
  } catch (e) {
    // ignore if not available
  }

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
  try {
    // eslint-disable-next-line global-require
    const legacyCfg = require('firebase-functions').config && require('firebase-functions').config().email;
    if (legacyCfg) {
      if (!emailUserVal && legacyCfg.user) emailUserVal = legacyCfg.user;
      if (!emailPasswordVal && legacyCfg.password) emailPasswordVal = legacyCfg.password;
    }
  } catch (e) {
    // ignore if not available
  }

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
    try {
      // eslint-disable-next-line global-require
      const legacyCfg = require('firebase-functions').config && require('firebase-functions').config().email;
      if (legacyCfg && !emailFromVal && legacyCfg.from) {
        emailFromVal = legacyCfg.from;
      }
    } catch (e) {
      // ignore if not available
    }
    
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

    const servicesText = (bookingData.services || [])
      .map(s => `  • ${s.serviceName || ''} - ${s.taskName || ''}${s.price ? ': ' + s.price : ''}`)
      .join('\n') || '  Palvelu ei määritelty';

    const mailOptions = {
      from: emailFromVal,
      to: bookingData.sahkoposti,
      subject: 'Varausvahvistus - Rajala Services',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c41e3a;">Varausvahvistus</h2>
          <p>Hei ${bookingData.nimi || 'asiakas'},</p>
          <p>Olemme vastaanottaneet varauksesi. Tässä varauksen tiedot:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Varauksen tiedot</h3>
            <p><strong>Aika:</strong> ${formattedDate} klo ${formattedTime}</p>
            <p><strong>Asiakas:</strong> ${bookingData.nimi || ''}</p>
            <p><strong>Puhelin:</strong> ${bookingData.puhelin || ''}</p>
            <p><strong>Sähköposti:</strong> ${bookingData.sahkoposti || ''}</p>
          </div>
          
          <div style="background-color: #fff4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Valitut palvelut</h3>
            <p style="white-space: pre-line;">${servicesText}</p>
            <p><strong>Kokonaishinta:</strong> ${bookingData.totalPrice || 'Hinta sovittaessa'}</p>
          </div>
          
          <p>Otamme sinuun yhteyttä tarvittaessa ennen varattua aikaa.</p>
          <p>Jos sinun täytyy perua tai muuttaa varausta, ota yhteyttä:</p>
          <ul>
            <li>Puhelin: <a href="tel:+358401234567">+358 40 123 4567</a></li>
            <li>Sähköposti: <a href="mailto:info@rajala-services.com">info@rajala-services.com</a></li>
          </ul>
          
          <p style="margin-top: 30px;">Ystävällisin terveisin,<br><strong>Rajala Services</strong></p>
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
async function verifyRecaptcha(token) {
  try {
    const secretKey = safeGetParamValue(recaptchaSecret, 'RECAPTCHA_SECRET');
    if (!secretKey) {
      console.error('reCAPTCHA secret not configured');
      return false;
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

    if (!response.data || response.data.success !== true) {
      console.log('reCAPTCHA validation failed:', response.data && response.data['error-codes']);
      return false;
    }

    if (response.data.score !== undefined) {
      return response.data.score > 0.5;
    }
    return true;
  } catch (err) {
    console.error('reCAPTCHA check error:', err.message || err);
    return false;
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
  const calendar = initializeGoogleCalendar();
  if (!calendar || !calendarId) {
    console.log('Google Calendar client missing - skipping event creation');
    return null;
  }

  try {
    const startDate = parseFirestoreDate(bookingData.aika) || new Date(bookingData.aika);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      console.warn('Invalid booking date for Google event, skipping:', bookingData);
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

    const resp = await calendar.events.insert({
      calendarId,
      requestBody: event
    });

    console.log('Google event created id=', resp.data && resp.data.id);
    return resp.data && resp.data.id;
  } catch (err) {
    console.error('createGoogleCalendarEvent error:', err.message || err);
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

    const { name, email, phone, aika, services, totalPrice, totalNumericPrice, recaptcha } = req.body;
    if (!name || !email || !phone || !aika || !services || !recaptcha) {
      return res.status(400).json({ error: 'Täytä kaikki pakolliset kentät' });
    }

    const isValidRecaptcha = await verifyRecaptcha(recaptcha);
    if (!isValidRecaptcha) {
      console.log('reCAPTCHA failed for booking');
      return res.status(401).json({ error: 'Turvavarmennus epäonnistui. Yritä uudelleen.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Virheellinen sähköpostiosoite' });

    const phoneRegex = /^\+358\s?(40|41|42|43|44|45|46|47|48|49|50)\s?\d{7}$/;
    if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Virheellinen puhelinnumero. Käytä muotoa: +358 40XXXXXXX' });

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

      console.log('Booking created:', bookingRef.id);

      const createdSnap = await bookingRef.get();
      const createdData = createdSnap.data();

      (async () => {
        try {
          const eventId = await createGoogleCalendarEvent(createdData);
          if (eventId) {
            await bookingRef.update({
              googleEventId: eventId,
              syncedToGoogle: true,
              googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (e) {
          console.error('Async Google sync failed for booking', bookingRef.id, e.message || e);
        }
      })();

      return res.status(200).json({ success: true, id: bookingRef.id, message: 'Varaus onnistui' });
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

// Email confirmation trigger - sends email when new booking is created
exports.onBookingCreated = onDocumentCreated({
  document: `${BOOKINGS_COLLECTION}/{bookingId}`,
  region: 'us-central1'
}, async (event) => {
  const bookingData = event.data.data();
  
  if (!bookingData) {
    console.log('No booking data found');
    return null;
  }

  // Skip email for bookings synced from Google Calendar
  if (bookingData.syncedFromGoogle) {
    console.log('Booking synced from Google Calendar - skipping email');
    return null;
  }

  try {
    await sendBookingConfirmationEmail(bookingData);
    console.log('Email trigger completed for booking:', event.params.bookingId);
  } catch (err) {
    console.error('Error in email trigger:', err.message || err);
    // Don't throw error - email failure shouldn't affect booking
  }

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
// Google Calendar webhook
// =======================
exports.calendarWebhook = onRequest({
  region: 'us-central1'
}, async (req, res) => {
  try {
    // Respond quickly for Google's webhook
    res.status(200).send('OK');

    const calendar = initializeGoogleCalendar();
    if (!calendar || !calendarId) {
      console.log('Calendar not configured - ignoring webhook');
      return;
    }

    const resourceState = req.headers['x-goog-resource-state'];
    if (!resourceState || (resourceState !== 'exists' && resourceState !== 'updated')) {
      console.log('Ignoring webhook state:', resourceState);
      return;
    }

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const response = await calendar.events.list({
      calendarId,
      timeMin: oneMonthAgo.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];

    for (const eventItem of events) {
      try {
        if (!eventItem.start?.dateTime) continue;
        const startTime = new Date(eventItem.start.dateTime);

        const existingSnapshot = await db.collection(BOOKINGS_COLLECTION)
          .where('googleEventId', '==', eventItem.id)
          .limit(1)
          .get();

        if (existingSnapshot.empty) {
          const desc = eventItem.description || '';
          const nameMatch = desc.match(/Asiakas:\s*(.+)/);
          const phoneMatch = desc.match(/Puhelin:\s*(.+)/);
          const emailMatch = desc.match(/Sähköposti:\s*(.+)/);

          await db.collection(BOOKINGS_COLLECTION).add({
            nimi: nameMatch ? nameMatch[1].trim() : 'Google Calendar -varaus',
            puhelin: phoneMatch ? phoneMatch[1].trim() : '',
            sahkoposti: emailMatch ? emailMatch[1].trim() : '',
            aika: admin.firestore.Timestamp.fromDate(startTime),
            services: [],
            totalPrice: 'Hinta sovittaessa',
            googleEventId: eventItem.id,
            syncedFromGoogle: true,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            luotu: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('Created booking from calendar event:', eventItem.id);
        } else {
          const docRef = existingSnapshot.docs[0].ref;
          await docRef.update({
            aika: admin.firestore.Timestamp.fromDate(startTime),
            syncedFromGoogle: true,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('Updated booking from calendar event:', eventItem.id);
        }
      } catch (evtErr) {
        console.error('Error processing calendar event', eventItem.id, evtErr.message || evtErr);
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
        await doc.ref.update({ deletedFromGoogle: true });
        await new Promise(r => setTimeout(r, 100));
        await doc.ref.delete();
        console.log('Deleted booking removed from Google Calendar:', doc.id);
      }
    }

    console.log('Calendar webhook completed');
  } catch (err) {
    console.error('calendarWebhook error:', err.message || err);
  }
});