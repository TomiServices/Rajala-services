// Lightweight auth helper for Google APIs with robust ADC fallback.
// Usage: const { getGoogleClient } = require('./lib/auth-client');
//        const client = await getGoogleClient(['https://www.googleapis.com/auth/calendar']);
const { GoogleAuth } = require('google-auth-library');

async function getGoogleClient(scopes = ['https://www.googleapis.com/auth/calendar']) {
  // If a service account JSON has been provided via env (e.g. GOOGLE_SERVICE_ACCOUNT_JSON),
  // try to parse and use it. If parsing fails, fall back to ADC.
  const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (envKey) {
    try {
      const cred = typeof envKey === 'string' ? JSON.parse(envKey) : envKey;
      const auth = new GoogleAuth({ credentials: cred, scopes });
      return await auth.getClient();
    } catch (err) {
      // Do not throw — log and fall back to ADC. This prevents noisy parse errors
      // if someone accidentally sets a non-JSON env var (like an email).
      console.warn('getGoogleClient: failed to parse GOOGLE_SERVICE_ACCOUNT_JSON, falling back to ADC:', err.message);
    }
  }

  // Default to Application Default Credentials (service account attached to runtime)
  const auth = new GoogleAuth({ scopes });
  return await auth.getClient();
}

module.exports = { getGoogleClient };