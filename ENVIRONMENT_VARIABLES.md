# Environment Variables Configuration

This document lists all environment variables and Firebase Functions configuration required for the Fixnero booking system.

## Firebase Functions Configuration

Firebase Functions use `firebase functions:config:set` for production configuration and `.runtimeconfig.json` for local development.

### Required Configuration

#### 1. reCAPTCHA Secret Key

**Purpose**: Server-side validation of reCAPTCHA tokens to prevent spam bookings.

**Configuration**:
```bash
firebase functions:config:set recaptcha.secret="YOUR_RECAPTCHA_SECRET_KEY"
```

**Details**:
- Type: String
- Format: reCAPTCHA v3 secret key (NOT Enterprise)
- Required: Yes (for production)
- Site Key (public): `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- Register at: https://www.google.com/recaptcha/admin

**Local Development**:
```json
{
  "recaptcha": {
    "secret": "YOUR_RECAPTCHA_SECRET_KEY"
  }
}
```

#### 2. Google Calendar Service Account

**Purpose**: Authenticate with Google Calendar API for two-way sync.

**Configuration**:
```bash
# Minify the service account JSON and set it
firebase functions:config:set google.service_account="$(cat service-account-key.json | jq -c)"
```

**Details**:
- Type: JSON object (minified to single line)
- Format: Google Cloud service account key JSON
- Required: Yes (for Google Calendar integration)
- Obtain from: Google Cloud Console > IAM & Admin > Service Accounts

**Local Development**:
```json
{
  "google": {
    "service_account": {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "service-account@project-id.iam.gserviceaccount.com",
      "client_id": "client-id",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
    }
  }
}
```

**Security Warning**: ⚠️ NEVER commit this to version control! Add `.runtimeconfig.json` to `.gitignore`.

#### 3. Google Calendar ID

**Purpose**: Specify which Google Calendar to sync bookings with.

**Configuration**:
```bash
firebase functions:config:set google.calendar_id="your-calendar-id@group.calendar.google.com"
```

**Details**:
- Type: String
- Format: Google Calendar ID (email-like format)
- Required: Yes (for Google Calendar integration)
- Obtain from: Google Calendar Settings > Integrate calendar

**Local Development**:
```json
{
  "google": {
    "calendar_id": "your-calendar-id@group.calendar.google.com"
  }
}
```

## Complete Configuration Example

### Production (Firebase CLI)

```bash
# Set all configuration at once
firebase functions:config:set \
  recaptcha.secret="6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  google.service_account="$(cat service-account-key.json | jq -c)" \
  google.calendar_id="fixnero-varaukset@group.calendar.google.com"

# Verify configuration
firebase functions:config:get
```

### Local Development (.runtimeconfig.json)

Create `functions/.runtimeconfig.json`:

```json
{
  "recaptcha": {
    "secret": "6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "google": {
    "service_account": {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "abc123...",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n",
      "client_email": "fixnero-calendar-sync@your-project-id.iam.gserviceaccount.com",
      "client_id": "123456789...",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/fixnero-calendar-sync%40your-project-id.iam.gserviceaccount.com"
    },
    "calendar_id": "fixnero-varaukset@group.calendar.google.com"
  }
}
```

## Frontend Configuration (index.html)

### reCAPTCHA Site Key

The reCAPTCHA site key is embedded in the HTML and JavaScript:

**Location**: `index.html` (line ~3566) and `booking-system.js` (line 9)

```html
<!-- In index.html -->
<script src="https://www.google.com/recaptcha/api.js?render=6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM"></script>
```

```javascript
// In booking-system.js
const RECAPTCHA_SITE_KEY = '6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM';
```

**Note**: This is safe to be public as it's the site key (not the secret).

## How to Access Configuration in Code

### Firebase Functions

```javascript
// reCAPTCHA secret
const RECAPTCHA_SECRET = functions.config().recaptcha?.secret || process.env.RECAPTCHA_SECRET;

// Google Calendar credentials
const serviceAccount = functions.config().google?.service_account;
const calendarId = functions.config().google?.calendar_id;
```

## Configuration Checklist

Before deploying to production, ensure:

- [ ] reCAPTCHA secret key is configured
- [ ] reCAPTCHA domains include: `rajala-services.com`, `www.rajala-services.com`
- [ ] Google service account JSON is configured
- [ ] Google Calendar ID is configured
- [ ] Service account has access to the calendar
- [ ] Calendar API is enabled in Google Cloud Console
- [ ] All secrets are NOT committed to version control
- [ ] `.runtimeconfig.json` is in `.gitignore`

## Verification Commands

```bash
# Check Firebase Functions configuration
firebase functions:config:get

# Test local configuration
cd functions
node -e "const config = require('./.runtimeconfig.json'); console.log('Config loaded:', Object.keys(config));"

# Validate service account JSON
cd functions
node -e "const config = require('./.runtimeconfig.json'); console.log('Service account email:', config.google.service_account.client_email);"
```

## Troubleshooting

### Configuration Not Found

**Symptom**: Functions log "Google Calendar not configured" or "reCAPTCHA secret not configured"

**Solution**:
1. Check configuration: `firebase functions:config:get`
2. Verify the values are set correctly
3. Redeploy functions: `firebase deploy --only functions`

### Service Account Authentication Failed

**Symptom**: "Error initializing Google Calendar client" or "403 Forbidden"

**Solution**:
1. Verify service account JSON is valid
2. Check that the service account has Calendar API access
3. Ensure the calendar is shared with the service account email
4. Verify Calendar API is enabled in Google Cloud Console

### reCAPTCHA Verification Failed

**Symptom**: Users see "Turvavarmennus epäonnistui"

**Solution**:
1. Verify reCAPTCHA secret key matches the site key
2. Check that domains are registered in reCAPTCHA admin console
3. Ensure secret key is correctly configured in Firebase Functions

## Security Best Practices

1. **Never commit secrets**: Add to `.gitignore`:
   ```
   functions/.runtimeconfig.json
   service-account-key.json
   ```

2. **Rotate keys regularly**: 
   - Regenerate reCAPTCHA keys every 6-12 months
   - Rotate service account keys annually

3. **Limit permissions**:
   - Service account should only have Calendar API access
   - Use principle of least privilege

4. **Monitor usage**:
   - Check Google Cloud Console for API usage
   - Set up billing alerts
   - Monitor Firebase Functions logs

5. **Use environment-specific configs**:
   - Development: Use `.runtimeconfig.json`
   - Production: Use `firebase functions:config:set`
   - Never mix dev and prod credentials

## Support

For issues with configuration:
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify Google Cloud Console for API status
3. Review this documentation
4. Contact the development team

---

**Last Updated**: 2025-11-19
**Configuration Version**: 1.0.0
