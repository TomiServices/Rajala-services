// Lightweight auth helper for Google APIs with robust ADC fallback.
// Usage: const { getGoogleClient } = require('./lib/auth-client');
//        const client = await getGoogleClient(['https://www.googleapis.com/auth/calendar']);
const { GoogleAuth } = require('google-auth-library');

async function getGoogleClient(scopes = ['https://www.googleapis.com/auth/calendar']) {
  // Check GOOGLE_SERVICE_ACCOUNT_JSON first, then GOOGLE_SERVICE_ACCOUNT as fallback.
  // Both env vars may carry the service account JSON (plain or base64-encoded).
  // This matches the lookup order used by initializeGoogleCalendar() in index.js.
  const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT;
  if (envKey) {
    try {
      let raw = typeof envKey === 'string' ? envKey.trim() : envKey;
      // Support base64-encoded service account key (same as parseServiceAccountInput in index.js)
      if (typeof raw === 'string' && !raw.startsWith('{')) {
        try {
          const decoded = Buffer.from(raw, 'base64').toString('utf8');
          if (decoded.trim().startsWith('{')) raw = decoded;
        } catch (e) { /* not base64, continue */ }
      }
      const cred = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // Normalize escaped newlines in private_key (e.g. when stored via Firebase config)
      if (cred && typeof cred.private_key === 'string') {
        cred.private_key = cred.private_key.replace(/\\n/g, '\n');
      }
      const auth = new GoogleAuth({ credentials: cred, scopes });
      return await auth.getClient();
    } catch (err) {
      // Do not throw — log and fall back to ADC. This prevents noisy parse errors
      // if someone accidentally sets a non-JSON env var (like an email).
      console.warn('getGoogleClient: failed to parse service account credentials, falling back to ADC:', err.message);
    }
  }

  // Default to Application Default Credentials (service account attached to runtime)
  const auth = new GoogleAuth({ scopes });
  return await auth.getClient();
}

module.exports = { getGoogleClient };