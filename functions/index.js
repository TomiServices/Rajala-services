// index.js - Complete Firebase Functions for Rajala Services Booking System
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const axios = require('axios');
const { google } = require('googleapis');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// =======================
// CONSTANTS
// =======================
const BOOKINGS_COLLECTION = 'varaukset'; // Using Finnish collection name as per existing setup
const ALLOWED_ORIGINS = [
  'https://www.rajala-services.com',
  'https://rajala-services.com',
  'https://fxnr-web.web.app',
  'https://fxnr-web.firebaseapp.com'
];

// =======================
// CORS CONFIGURATION
// =======================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
const corsHandler = cors(corsOptions);

// =======================
// GOOGLE CALENDAR SETUP
// =======================
let googleCalendar = null;
let calendarId = null;

// Initialize Google Calendar client if configured
function initializeGoogleCalendar() {
  try {
    const config = functions.config();
    
    if (!config.google || !config.google.service_account || !config.google.calendar_id) {
      console.log('Google Calendar not configured - sync disabled');
      return null;
    }

    // Parse service account from config
    const serviceAccount = typeof config.google.service_account === 'string' 
      ? JSON.parse(config.google.service_account)
      : config.google.service_account;

    calendarId = config.google.calendar_id;

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    googleCalendar = google.calendar({ version: 'v3', auth });
    console.log('Google Calendar initialized successfully');
    return googleCalendar;
  } catch (error) {
    console.error('Failed to initialize Google Calendar:', error.message);
    return null;
  }
}

// =======================
// UTILITY FUNCTIONS
// =======================

/**
 * Verify reCAPTCHA token
 */
async function verifyRecaptcha(token) {
  try {
    const config = functions.config();
    const secretKey = config.recaptcha?.secret;
    
    if (!secretKey) {
      console.error('reCAPTCHA secret key not configured');
      throw new Error('Turvavarmennus ei ole määritetty');
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

    if (!response.data.success) {
      console.log('reCAPTCHA verification failed:', response.data['error-codes']);
      return false;
    }

    // For v3, check score (0.0 - 1.0, higher is better)
    const score = response.data.score || 0;
    console.log('reCAPTCHA score:', score);
    
    // Require score > 0.5 for v3, or just success for v2
    return response.data.score === undefined || score > 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    return false;
  }
}

/**
 * Check if a time slot is available
 */
async function isSlotAvailable(dateTime) {
  try {
    const slotDate = new Date(dateTime);
    const slotHour = slotDate.getHours();
    
    // Create start and end of the hour slot
    const slotStart = new Date(slotDate);
    slotStart.setMinutes(0, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotHour + 1);

    // Query existing bookings for this time slot
    const snapshot = await db.collection(BOOKINGS_COLLECTION)
      .where('aika', '>=', admin.firestore.Timestamp.fromDate(slotStart))
      .where('aika', '<', admin.firestore.Timestamp.fromDate(slotEnd))
      .get();

    // Slot is available if no bookings exist
    return snapshot.empty;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    throw error;
  }
}

/**
 * Create Google Calendar event for a booking
 */
async function createGoogleCalendarEvent(bookingData) {
  if (!googleCalendar || !calendarId) {
    console.log('Google Calendar not available, skipping sync');
    return null;
  }

  try {
    const startTime = new Date(bookingData.aika);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1); // 1-hour booking slots

    // Format service information
    const serviceInfo = bookingData.services?.map(s => 
      `${s.serviceName} - ${s.taskName}${s.price ? ': ' + s.price : ''}`
    ).join('\n') || 'Palvelu ei määritelty';

    const event = {
      summary: `Varaus: ${bookingData.nimi}`,
      description: `Asiakas: ${bookingData.nimi}\n` +
                   `Puhelin: ${bookingData.puhelin}\n` +
                   `Sähköposti: ${bookingData.sahkoposti}\n\n` +
                   `Palvelut:\n${serviceInfo}\n\n` +
                   `Kokonaishinta: ${bookingData.totalPrice || 'Hinta sovittaessa'}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Helsinki'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Helsinki'
      },
      colorId: '11' // Red color for easy identification
    };

    const response = await googleCalendar.events.insert({
      calendarId: calendarId,
      requestBody: event
    });

    console.log('Created Google Calendar event:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error.message);
    // Don't throw - Google Calendar sync is optional
    return null;
  }
}

// =======================
// HTTP ENDPOINTS
// =======================

/**
 * GET /bookings - Fetch all bookings
 */
exports.bookings = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const snapshot = await db.collection(BOOKINGS_COLLECTION)
        .orderBy('aika', 'asc')
        .get();

      const bookings = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        bookings.push({
          id: doc.id,
          aika: data.aika?.toDate().toISOString() || data.aika,
          nimi: data.nimi,
          sahkoposti: data.sahkoposti,
          puhelin: data.puhelin,
          services: data.services || [],
          totalPrice: data.totalPrice,
          googleEventId: data.googleEventId
        });
      });

      // Add cache headers
      res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
      res.status(200).json(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ error: 'Varausten haku epäonnistui' });
    }
  });
});

/**
 * POST /book - Create a new booking
 */
exports.book = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { name, email, phone, aika, services, totalPrice, totalNumericPrice, recaptcha } = req.body;

      // Validate required fields
      if (!name || !email || !phone || !aika || !services || !recaptcha) {
        return res.status(400).json({ error: 'Täytä kaikki pakolliset kentät' });
      }

      // Verify reCAPTCHA
      const isValidRecaptcha = await verifyRecaptcha(recaptcha);
      if (!isValidRecaptcha) {
        console.log('reCAPTCHA verification failed for booking attempt');
        return res.status(401).json({ error: 'Turvavarmennus epäonnistui. Yritä uudelleen.' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Virheellinen sähköpostiosoite' });
      }

      // Validate phone format
      const phoneRegex = /^\+358\s?\d{1,3}\s?\d{4,}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Virheellinen puhelinnumero. Käytä muotoa: +358 401234567' });
      }

      // Validate date is in the future
      const bookingDate = new Date(aika);
      const now = new Date();
      if (bookingDate <= now) {
        return res.status(400).json({ error: 'Valitse tuleva aika' });
      }

      // Validate business hours (9-17, weekdays)
      const dayOfWeek = bookingDate.getDay();
      const hour = bookingDate.getHours();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.status(400).json({ error: 'Varaukset vain arkipäivisin' });
      }
      if (hour < 9 || hour >= 17) {
        return res.status(400).json({ error: 'Varaukset klo 9-17 välillä' });
      }

      // Check slot availability using transaction for atomicity
      const bookingRef = db.collection(BOOKINGS_COLLECTION).doc();
      
      try {
        await db.runTransaction(async (transaction) => {
          // Check if slot is available within transaction
          const available = await isSlotAvailable(aika);
          
          if (!available) {
            throw new Error('SLOT_UNAVAILABLE');
          }

          // Create booking data
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

          // Create booking atomically
          transaction.set(bookingRef, bookingData);
        });

        // Transaction successful - booking created
        console.log('Booking created successfully:', bookingRef.id);

        // Sync to Google Calendar (async, non-blocking)
        // This happens after the transaction to avoid blocking the response
        const bookingSnapshot = await bookingRef.get();
        const bookingData = bookingSnapshot.data();
        
        // Attempt Google Calendar sync
        const googleEventId = await createGoogleCalendarEvent(bookingData);
        if (googleEventId) {
          await bookingRef.update({
            googleEventId: googleEventId,
            syncedToGoogle: true,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Return success response
        res.status(200).json({
          success: true,
          id: bookingRef.id,
          message: 'Varaus onnistui'
        });

      } catch (transactionError) {
        if (transactionError.message === 'SLOT_UNAVAILABLE') {
          console.log('Booking attempt failed: slot not available');
          return res.status(409).json({ 
            error: 'Valittu aika on jo varattu. Valitse toinen aika.' 
          });
        }
        throw transactionError;
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ error: 'Varauksen luonti epäonnistui. Yritä uudelleen.' });
    }
  });
});

// =======================
// FIRESTORE TRIGGERS FOR GOOGLE CALENDAR SYNC
// =======================

/**
 * Trigger: When booking is updated in Firestore, update Google Calendar
 */
exports.onBookingUpdated = functions.firestore
  .document(`${BOOKINGS_COLLECTION}/{bookingId}`)
  .onUpdate(async (change, context) => {
    const calendar = initializeGoogleCalendar();
    if (!calendar || !calendarId) {
      return null;
    }

    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Skip if this update came from Google Calendar (prevent loops)
    if (afterData.syncedFromGoogle) {
      return null;
    }

    const googleEventId = afterData.googleEventId;
    if (!googleEventId) {
      console.log('No Google event ID, skipping update');
      return null;
    }

    try {
      const startTime = afterData.aika.toDate();
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      const serviceInfo = afterData.services?.map(s => 
        `${s.serviceName} - ${s.taskName}${s.price ? ': ' + s.price : ''}`
      ).join('\n') || 'Palvelu ei määritelty';

      await calendar.events.patch({
        calendarId: calendarId,
        eventId: googleEventId,
        requestBody: {
          summary: `Varaus: ${afterData.nimi}`,
          description: `Asiakas: ${afterData.nimi}\n` +
                       `Puhelin: ${afterData.puhelin}\n` +
                       `Sähköposti: ${afterData.sahkoposti}\n\n` +
                       `Palvelut:\n${serviceInfo}\n\n` +
                       `Kokonaishinta: ${afterData.totalPrice || 'Hinta sovittaessa'}`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'Europe/Helsinki'
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'Europe/Helsinki'
          }
        }
      });

      console.log('Updated Google Calendar event:', googleEventId);
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error.message);
    }
  });

/**
 * Trigger: When booking is deleted from Firestore, delete from Google Calendar
 */
exports.onBookingDeleted = functions.firestore
  .document(`${BOOKINGS_COLLECTION}/{bookingId}`)
  .onDelete(async (snap, context) => {
    const calendar = initializeGoogleCalendar();
    if (!calendar || !calendarId) {
      return null;
    }

    const data = snap.data();
    const googleEventId = data.googleEventId;

    if (!googleEventId) {
      console.log('No Google event ID, skipping deletion');
      return null;
    }

    // Skip if this deletion came from Google Calendar (prevent loops)
    if (data.syncedFromGoogle) {
      return null;
    }

    try {
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: googleEventId
      });

      console.log('Deleted Google Calendar event:', googleEventId);
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error.message);
    }
  });

// =======================
// GOOGLE CALENDAR WEBHOOK
// =======================

/**
 * Webhook: Receive notifications from Google Calendar
 */
exports.calendarWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Respond quickly to Google's ping
    res.status(200).send('OK');

    const calendar = initializeGoogleCalendar();
    if (!calendar || !calendarId) {
      console.log('Google Calendar not configured, ignoring webhook');
      return;
    }

    // Check if this is a sync notification
    const resourceState = req.headers['x-goog-resource-state'];
    if (resourceState !== 'exists' && resourceState !== 'updated') {
      console.log('Ignoring webhook with state:', resourceState);
      return;
    }

    // Fetch recent events from Google Calendar
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: oneMonthAgo.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];

    // Sync events to Firestore
    for (const event of events) {
      try {
        // Skip events without start time
        if (!event.start?.dateTime) {
          continue;
        }

        // Check if we already have this event
        const existingSnapshot = await db.collection(BOOKINGS_COLLECTION)
          .where('googleEventId', '==', event.id)
          .limit(1)
          .get();

        const startTime = new Date(event.start.dateTime);

        if (existingSnapshot.empty) {
          // Create new booking from Google Calendar event
          // Parse customer info from description
          const description = event.description || '';
          const nameMatch = description.match(/Asiakas:\s*(.+)/);
          const phoneMatch = description.match(/Puhelin:\s*(.+)/);
          const emailMatch = description.match(/Sähköposti:\s*(.+)/);

          await db.collection(BOOKINGS_COLLECTION).add({
            nimi: nameMatch ? nameMatch[1].trim() : 'Google Calendar -varaus',
            puhelin: phoneMatch ? phoneMatch[1].trim() : '',
            sahkoposti: emailMatch ? emailMatch[1].trim() : '',
            aika: admin.firestore.Timestamp.fromDate(startTime),
            services: [],
            totalPrice: 'Hinta sovittaessa',
            googleEventId: event.id,
            syncedFromGoogle: true,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            luotu: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log('Created booking from Google Calendar event:', event.id);
        } else {
          // Update existing booking
          const docRef = existingSnapshot.docs[0].ref;
          await docRef.update({
            aika: admin.firestore.Timestamp.fromDate(startTime),
            syncedFromGoogle: true,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log('Updated booking from Google Calendar event:', event.id);
        }
      } catch (eventError) {
        console.error('Error syncing event:', event.id, eventError.message);
      }
    }

    // Check for deleted events
    const allBookings = await db.collection(BOOKINGS_COLLECTION)
      .where('googleEventId', '!=', null)
      .get();

    const eventIds = new Set(events.map(e => e.id));

    for (const doc of allBookings.docs) {
      const booking = doc.data();
      if (booking.googleEventId && !eventIds.has(booking.googleEventId)) {
        // Event was deleted from Google Calendar
        await doc.ref.delete();
        console.log('Deleted booking (removed from Google Calendar):', doc.id);
      }
    }

    console.log('Calendar webhook processed successfully');
  } catch (error) {
    console.error('Error processing calendar webhook:', error);
    // Still return 200 to prevent Google from retrying
  }
});
