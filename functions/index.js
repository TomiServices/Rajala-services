const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

// Lataa Google Service Account JSON
const auth = new google.auth.GoogleAuth({
  keyFile: 'service-account.json', // polku service accountiin
  scopes: ['https://www.googleapis.com/auth/calendar']
});
const calendar = google.calendar({ version: 'v3', auth });

// Firestore collection nimi
const BOOKINGS_COLLECTION = 'bookings';
const GOOGLE_CALENDAR_ID = 'primary'; // voit vaihtaa omaan kalenterin ID:hen

// =======================
// 1️⃣ Firestore -> Google Calendar
// =======================
exports.syncToGoogleCalendar = functions.firestore
  .document(`${BOOKINGS_COLLECTION}/{bookingId}`)
  .onCreate(async (snap, context) => {
    const data = snap.data();
    try {
      const event = await calendar.events.insert({
        calendarId: GOOGLE_CALENDAR_ID,
        requestBody: {
          summary: data.title || 'Varaus',
          description: data.description || '',
          start: { dateTime: data.start.toDate().toISOString() },
          end: { dateTime: data.end.toDate().toISOString() },
        },
      });
      console.log('Event created in Google Calendar:', event.data.id);

      // Tallennetaan Google Calendar event ID Firestoreen
      await snap.ref.update({ googleEventId: event.data.id });

    } catch (error) {
      console.error('Error creating event in Google Calendar:', error);
    }
  });

// =======================
// 2️⃣ Google Calendar -> Firestore webhook
// =======================
exports.calendarWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const event = req.body; // Google Calendar push notification payload
  console.log('Received Google Calendar webhook event:', JSON.stringify(event));

  // TODO: Päivitä Firestore FullCalendarin näyttämään muutokset
  // Esim. etsi dokumentti googleEventId:n perusteella ja päivitä tiedot
  // const bookingRef = admin.firestore().collection(BOOKINGS_COLLECTION).doc(docId);
  // await bookingRef.update({...});

  res.status(200).send('OK');
});

// =======================
// 3️⃣ FullCalendar -> Firestore POST endpoint
// =======================
exports.bookings = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const data = req.body;
  if (!data.start || !data.end || !data.title) {
    return res.status(400).send('Missing required fields: start, end, title');
  }

  try {
    const bookingRef = await admin.firestore().collection(BOOKINGS_COLLECTION).add({
      title: data.title,
      description: data.description || '',
      start: admin.firestore.Timestamp.fromDate(new Date(data.start)),
      end: admin.firestore.Timestamp.fromDate(new Date(data.end)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ id: bookingRef.id, message: 'Booking saved' });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).send('Internal Server Error');
  }
});
