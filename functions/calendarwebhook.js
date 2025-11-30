// Calendar webhook handler (Gen2 Cloud Function - HTTP trigger).
// Expects FIREBASE project and GOOGLE_CALENDAR_ID env to be set.
// Uses lib/auth-client.js for auth (ADC or secret JSON fallback).
//
// Behavior:
// - Reads notification headers from Google Calendar push.
// - Loads latest calendarWatch doc for the configured calendar.
// - If nextSyncToken exists, uses events.list with syncToken to fetch changes.
// - Otherwise, does a safety "windowed" events.list (upcoming 30 days) to pick up new events.
// - Upserts/deletes "bookings" documents in Firestore based on eventId.
// - Updates calendarWatch.nextSyncToken if provided by API.
//
// NOTE: adapt collection names and booking schema to your app as needed.

const { google } = require('googleapis');
const admin = require('firebase-admin');
const { getGoogleClient } = require('./lib/auth-client');

// init firebase-admin once
function ensureAdminInit() {
  if (!admin.apps.length) {
    const projectId = process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG && (() => {
      try { return JSON.parse(process.env.FIREBASE_CONFIG).projectId; } catch(e){ return undefined; }
    })());
    admin.initializeApp(projectId ? { projectId } : undefined);
  }
}

async function findLatestWatchDoc(calendarId) {
  const db = admin.firestore();
  const q = db.collection('calendarWatch')
    .where('calendarId', '==', calendarId)
    .orderBy('createdAt', 'desc')
    .limit(1);
  const snap = await q.get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data(), ref: doc.ref };
}

async function upsertBookingFromEvent(event) {
  const db = admin.firestore();
  // Try find existing booking by eventId
  const existingQuery = await db.collection('bookings').where('eventId', '==', event.id).limit(1).get();
  const docData = {
    eventId: event.id,
    summary: event.summary || '',
    description: event.description || '',
    start: event.start || {},
    end: event.end || {},
    attendees: event.attendees || [],
    status: event.status || '',
    raw: event,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (existingQuery.empty) {
    // create
    const ref = await db.collection('bookings').add({
      ...docData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Created booking from calendar event:', ref.id);
    return { op: 'create', id: ref.id };
  } else {
    const doc = existingQuery.docs[0];
    await doc.ref.set(docData, { merge: true });
    console.log('Updated booking from calendar event:', doc.id);
    return { op: 'update', id: doc.id };
  }
}

async function deleteBookingForEvent(eventId) {
  const db = admin.firestore();
  const q = await db.collection('bookings').where('eventId', '==', eventId).limit(1).get();
  if (q.empty) {
    console.log('No booking found to delete for event:', eventId);
    return false;
  }
  await q.docs[0].ref.delete();
  console.log('Deleted booking for calendar event:', eventId);
  return true;
}

async function fetchEventsUsingSyncToken(calendar, calendarId, syncToken) {
  // Use syncToken to get incremental updates
  try {
    const res = await calendar.events.list({
      calendarId,
      syncToken,
      singleEvents: true,
      showDeleted: true,
      maxResults: 2500,
      orderBy: 'startTime'
    });
    return res.data;
  } catch (err) {
    // syncToken can become invalid (410) — caller should handle fallback
    throw err;
  }
}

async function fetchEventsWindowed(calendar, calendarId) {
  // Fallback / initial sync: fetch upcoming window (30 days) to avoid huge import
  const now = new Date();
  const timeMin = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 1 day back
  const timeMax = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days ahead
  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    showDeleted: true,
    maxResults: 2500,
    orderBy: 'startTime'
  });
  return res.data;
}

async function processEventsList(eventsData) {
  if (!eventsData || (!eventsData.items && !eventsData.length)) {
    console.log('No events data returned');
    return;
  }
  const items = eventsData.items || eventsData;
  for (const ev of items) {
    try {
      if (ev.status === 'cancelled' || ev.deleted) {
        await deleteBookingForEvent(ev.id);
      } else {
        await upsertBookingFromEvent(ev);
      }
    } catch (err) {
      console.error('Error processing event', ev && ev.id, err.message || err);
    }
  }
}

exports.calendarWebhook = async (req, res) => {
  ensureAdminInit();

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      console.warn('Google Calendar not configured (missing calendar id)');
      res.status(204).send('No calendar configured');
      return;
    }

    // Read Google push headers (case-insensitive)
    const headers = {};
    for (const k of Object.keys(req.headers || {})) headers[k.toLowerCase()] = req.headers[k];

    const resourceState = headers['x-goog-resource-state'] || headers['x-goog-resource-state'.toLowerCase()] || '';
    const channelId = headers['x-goog-channel-id'] || headers['x-goog-channel-id'.toLowerCase()];
    const resourceId = headers['x-goog-resource-id'] || headers['x-goog-resource-id'.toLowerCase()];
    const message = req.body || {};

    console.log('Received calendar webhook:', { resourceState, channelId, resourceId, bodyPreview: typeof message === 'object' ? JSON.stringify(message).slice(0,200) : message });

    // Quick ignore for 'sync' notifications (Google sends these)
    if ((resourceState || '').toLowerCase() === 'sync') {
      console.log('Ignoring webhook state: sync');
      res.status(204).send('sync ignored');
      return;
    }

    // Prepare calendar client
    let calendar;
    try {
      const client = await getGoogleClient();
      console.log('calendarWebhook auth client used: adc');
      calendar = google.calendar({ version: 'v3', auth: client });
    } catch (authErr) {
      console.error('calendarWebhook: Failed to get auth client:', authErr.message || authErr);
      res.status(500).send({ ok: false, error: 'Auth initialization failed' });
      return;
    }

    // Get latest watch doc for this calendar
    const watchDoc = await findLatestWatchDoc(calendarId);
    const syncToken = watchDoc && watchDoc.data && watchDoc.data.nextSyncToken ? watchDoc.data.nextSyncToken : null;

    let eventsData = null;
    if (syncToken) {
      // Try incremental fetch
      try {
        eventsData = await fetchEventsUsingSyncToken(calendar, calendarId, syncToken);
      } catch (err) {
        // If sync token invalid (HTTP 410), fallback to windowed fetch and continue
        console.warn('Sync token fetch failed, will fallback to windowed fetch:', err && err.code ? `${err.code} ${err.message}` : err.message || err);
        eventsData = await fetchEventsWindowed(calendar, calendarId);
      }
    } else {
      // No sync token available -> do windowed fetch
      eventsData = await fetchEventsWindowed(calendar, calendarId);
    }

    // Process events returned (creates/updates/deletes bookings)
    await processEventsList(eventsData);

    // Update watch doc with nextSyncToken if present
    if (eventsData && eventsData.nextSyncToken && watchDoc && watchDoc.ref) {
      await watchDoc.ref.set({
        nextSyncToken: eventsData.nextSyncToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('Updated watch doc with nextSyncToken');
    }

    console.log('Calendar webhook completed');
    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('Calendar webhook handler error:', err && (err.stack || err.message || err));
    // Do not expose sensitive details to caller
    res.status(500).send({ ok: false, error: 'internal error' });
  }
};