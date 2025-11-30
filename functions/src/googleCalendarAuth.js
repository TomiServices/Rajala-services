/**
 * Google Calendar Authentication Helper
 * 
 * Provides reliable Google Calendar authentication using either:
 * 1. Service Account JSON (from GOOGLE_SERVICE_ACCOUNT or GOOGLE_SERVICE_ACCOUNT_JSON env vars)
 * 2. Application Default Credentials (ADC) as fallback
 * 
 * Usage:
 *   const { getCalendarClient } = require('./src/googleCalendarAuth');
 *   const { calendar, authClient, used } = await getCalendarClient();
 */

const { google } = require('googleapis');

/**
 * Get an authenticated Google Calendar client
 * 
 * @param {string[]} scopes - OAuth scopes (default: calendar scope)
 * @returns {Promise<{calendar: object, authClient: object, used: 'jwt'|'adc'}>}
 */
async function getCalendarClient(scopes = ['https://www.googleapis.com/auth/calendar']) {
  // Try to get service account JSON from environment variables
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT;
  
  if (envJson) {
    try {
      // Parse the JSON (could be a string or already an object)
      const credentials = typeof envJson === 'string' ? JSON.parse(envJson) : envJson;
      
      // Normalize private key (replace literal \n with actual newlines)
      if (credentials && typeof credentials.private_key === 'string') {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      
      // Create JWT auth client
      const authClient = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        scopes
      );
      
      // Authorize the client
      await authClient.authorize();
      
      // Create calendar instance
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      
      console.log('Google Calendar auth initialized via JWT (service account)');
      return { calendar, authClient, used: 'jwt' };
    } catch (err) {
      // Log warning but don't expose sensitive details
      console.warn('Failed to parse service account JSON, falling back to ADC:', err.message);
    }
  }
  
  // Fallback to Application Default Credentials
  try {
    const authClient = await google.auth.getClient({ scopes });
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    
    console.log('Google Calendar auth initialized via ADC (Application Default Credentials)');
    return { calendar, authClient, used: 'adc' };
  } catch (err) {
    console.error('Failed to initialize Google Calendar auth via ADC:', err.message);
    throw err;
  }
}

module.exports = { getCalendarClient };
