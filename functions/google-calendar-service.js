/**
 * Google Calendar API Service
 * 
 * This module provides a wrapper around the Google Calendar API
 * for managing calendar events and synchronization.
 */

const { google } = require('googleapis');
const admin = require('firebase-admin');

// OAuth2 credentials (loaded from Firebase config or environment)
const getOAuth2Client = () => {
  const credentials = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://us-central1-fxnr-web.cloudfunctions.net/oauth2callback'
  };

  const oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    credentials.redirectUri
  );

  return oauth2Client;
};

/**
 * Get stored OAuth2 tokens from Firebase
 */
const getStoredTokens = async () => {
  try {
    const tokenRef = admin.database().ref('google_calendar/oauth_tokens');
    const snapshot = await tokenRef.once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Error fetching stored tokens:', error);
    return null;
  }
};

/**
 * Store OAuth2 tokens in Firebase
 */
const storeTokens = async (tokens) => {
  try {
    const tokenRef = admin.database().ref('google_calendar/oauth_tokens');
    await tokenRef.set({
      ...tokens,
      updated_at: new Date().toISOString()
    });
    console.log('OAuth tokens stored successfully');
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
};

/**
 * Get authenticated Google Calendar API client
 */
const getCalendarClient = async () => {
  const oauth2Client = getOAuth2Client();
  const tokens = await getStoredTokens();

  if (!tokens) {
    throw new Error('No OAuth tokens found. Please authenticate first.');
  }

  oauth2Client.setCredentials(tokens);

  // Check if token needs refresh
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
    console.log('Token expired, refreshing...');
    const { credentials } = await oauth2Client.refreshAccessToken();
    await storeTokens(credentials);
    oauth2Client.setCredentials(credentials);
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

/**
 * Format appointment data into Google Calendar event description
 */
const formatEventDescription = (appointmentData) => {
  const services = appointmentData.services || [];
  const servicesList = services.map(s => 
    `- ${s.serviceName}: ${s.taskName} (${s.price || 'Hinta sovittaessa'})`
  ).join('\n');

  return `
Varaus - Fixnero Autohuolto

Asiakas: ${appointmentData.customerName}
Puhelin: ${appointmentData.customerPhone}
Sähköposti: ${appointmentData.customerEmail}

Palvelut:
${servicesList}

Kokonaishinta: ${appointmentData.totalPrice || 'Hinta sovittaessa'}

Varausnumero: ${appointmentData.id}
Varattu: ${new Date(appointmentData.createdAt).toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' })}
  `.trim();
};

/**
 * Create a new event in Google Calendar
 * 
 * @param {Object} appointmentData - Appointment data from Firebase
 * @returns {Promise<string>} Google Calendar event ID
 */
const createCalendarEvent = async (appointmentData) => {
  try {
    const calendar = await getCalendarClient();

    const event = {
      summary: `${appointmentData.services[0]?.serviceName || 'Varaus'} - ${appointmentData.customerName}`,
      description: formatEventDescription(appointmentData),
      start: {
        dateTime: appointmentData.startTime,
        timeZone: 'Europe/Helsinki'
      },
      end: {
        dateTime: appointmentData.endTime,
        timeZone: 'Europe/Helsinki'
      },
      colorId: '9', // Blue color for bookings
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 } // 1 hour before
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'none' // Don't send email notifications
    });

    console.log('Google Calendar event created:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
};

/**
 * Update an existing event in Google Calendar
 * 
 * @param {string} googleEventId - Google Calendar event ID
 * @param {Object} appointmentData - Updated appointment data
 * @returns {Promise<void>}
 */
const updateCalendarEvent = async (googleEventId, appointmentData) => {
  try {
    const calendar = await getCalendarClient();

    const event = {
      summary: `${appointmentData.services[0]?.serviceName || 'Varaus'} - ${appointmentData.customerName}`,
      description: formatEventDescription(appointmentData),
      start: {
        dateTime: appointmentData.startTime,
        timeZone: 'Europe/Helsinki'
      },
      end: {
        dateTime: appointmentData.endTime,
        timeZone: 'Europe/Helsinki'
      }
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      resource: event,
      sendUpdates: 'none'
    });

    console.log('Google Calendar event updated:', googleEventId);
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    throw new Error(`Failed to update calendar event: ${error.message}`);
  }
};

/**
 * Delete an event from Google Calendar
 * 
 * @param {string} googleEventId - Google Calendar event ID
 * @returns {Promise<void>}
 */
const deleteCalendarEvent = async (googleEventId) => {
  try {
    const calendar = await getCalendarClient();

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
      sendUpdates: 'none'
    });

    console.log('Google Calendar event deleted:', googleEventId);
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    throw new Error(`Failed to delete calendar event: ${error.message}`);
  }
};

/**
 * Get events from Google Calendar within a date range
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of calendar events
 */
const getCalendarEvents = async (startDate, endDate) => {
  try {
    const calendar = await getCalendarClient();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: 'Europe/Helsinki',
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw new Error(`Failed to fetch calendar events: ${error.message}`);
  }
};

/**
 * Check if a time slot is available in Google Calendar
 * 
 * @param {string} startTime - ISO timestamp of start time
 * @param {string} endTime - ISO timestamp of end time
 * @returns {Promise<boolean>} True if slot is available
 */
const checkSlotAvailability = async (startTime, endTime) => {
  try {
    const calendar = await getCalendarClient();

    const response = await calendar.freebusy.query({
      resource: {
        timeMin: startTime,
        timeMax: endTime,
        timeZone: 'Europe/Helsinki',
        items: [{ id: 'primary' }]
      }
    });

    const busy = response.data.calendars.primary.busy || [];
    return busy.length === 0;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    // In case of error, return false to prevent double booking
    return false;
  }
};

/**
 * Set up a webhook to receive notifications about calendar changes
 * 
 * @returns {Promise<Object>} Webhook channel information
 */
const setupWebhook = async () => {
  try {
    const calendar = await getCalendarClient();
    const channelId = `fixnero-calendar-${Date.now()}`;
    const webhookUrl = 'https://us-central1-fxnr-web.cloudfunctions.net/googleCalendarWebhook';

    const response = await calendar.events.watch({
      calendarId: 'primary',
      resource: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        // Webhook expires after 7 days (max allowed)
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000)
      }
    });

    // Store webhook info in Firebase
    await admin.database().ref('google_calendar/webhook').set({
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration,
      created_at: new Date().toISOString()
    });

    console.log('Webhook set up successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error setting up webhook:', error);
    throw new Error(`Failed to setup webhook: ${error.message}`);
  }
};

/**
 * Stop receiving webhook notifications
 */
const stopWebhook = async () => {
  try {
    const webhookRef = admin.database().ref('google_calendar/webhook');
    const snapshot = await webhookRef.once('value');
    const webhookData = snapshot.val();

    if (!webhookData) {
      console.log('No webhook to stop');
      return;
    }

    const calendar = await getCalendarClient();
    await calendar.channels.stop({
      resource: {
        id: webhookData.channelId,
        resourceId: webhookData.resourceId
      }
    });

    await webhookRef.remove();
    console.log('Webhook stopped successfully');
  } catch (error) {
    console.error('Error stopping webhook:', error);
  }
};

module.exports = {
  getOAuth2Client,
  getStoredTokens,
  storeTokens,
  getCalendarClient,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  checkSlotAvailability,
  setupWebhook,
  stopWebhook,
  formatEventDescription
};
