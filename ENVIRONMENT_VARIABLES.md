# Environment Variables Configuration

This document lists all environment variables and Firebase Functions configuration required for the Rajala Services booking system.

## Firebase Functions Gen2 Configuration

**IMPORTANT**: This project uses Firebase Functions Gen2, which uses environment variables and secrets instead of the legacy `functions.config()` approach.

**Production**: Use Firebase secrets management
**Local Development**: Use `.env` file in the `functions/` directory

### Required Configuration

#### 1. reCAPTCHA Secret Key

**Purpose**: Server-side validation of reCAPTCHA tokens to prevent spam bookings.

**Production Configuration (Firebase Secrets)**:
```bash
# Set as a secret (recommended for Gen2)
firebase functions:secrets:set RECAPTCHA_SECRET

# Or set as an environment variable
firebase functions:config:set RECAPTCHA_SECRET="YOUR_RECAPTCHA_SECRET_KEY"
```

**Details**:
- Type: String
- Format: reCAPTCHA v3 secret key (NOT Enterprise)
- Required: Yes (for production)
- Site Key (public): `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- Register at: https://www.google.com/recaptcha/admin
- **NEVER commit this secret to version control**

**Local Development (.env file)**:
Create `functions/.env`:
```env
RECAPTCHA_SECRET=YOUR_RECAPTCHA_SECRET_KEY
```

#### 2. Google Calendar Service Account

**Purpose**: Authenticate with Google Calendar API for two-way sync.

**Production Configuration (Firebase Secrets)**:
```bash
# Set as a secret (recommended for Gen2)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT

# Or set as an environment variable (minified JSON)
firebase functions:config:set GOOGLE_SERVICE_ACCOUNT="$(cat service-account-key.json | jq -c)"
```

**Details**:
- Type: JSON object (minified to single line)
- Format: Google Cloud service account key JSON
- Required: Yes (for Google Calendar integration)
- Obtain from: Google Cloud Console > IAM & Admin > Service Accounts
- **NEVER commit this to version control**

**Local Development (.env file)**:
Create `functions/.env`:
```env
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
```

**Security Warning**: ⚠️ NEVER commit this to version control! The `.env` file is already in `.gitignore`.

#### 3. Google Calendar ID

**Purpose**: Specify which Google Calendar to sync bookings with.

**Production Configuration (Firebase Secrets)**:
```bash
# Set as a secret (recommended for Gen2)
firebase functions:secrets:set GOOGLE_CALENDAR_ID

# Or set as an environment variable
firebase functions:config:set GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"
```

**Details**:
- Type: String
- Format: Google Calendar ID (email-like format)
- Required: Yes (for Google Calendar integration)
- Obtain from: Google Calendar Settings > Integrate calendar

**Local Development (.env file)**:
Create `functions/.env`:
```env
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
```

## Complete Configuration Example

### Production (Firebase CLI)

**Using Secrets (Recommended for Gen2)**:
```bash
# Set secrets interactively
firebase functions:secrets:set RECAPTCHA_SECRET
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
firebase functions:secrets:set GOOGLE_CALENDAR_ID

# Verify secrets are set
firebase functions:secrets:access RECAPTCHA_SECRET --project=your-project-id

# Deploy functions with secrets
firebase deploy --only functions
```

**Using Environment Variables** (Alternative):
```bash
# Set all configuration at once
# IMPORTANT: Replace these example values with your actual secrets
firebase functions:config:set \
  RECAPTCHA_SECRET="YOUR_ACTUAL_SECRET_KEY_HERE" \
  GOOGLE_SERVICE_ACCOUNT="$(cat service-account-key.json | jq -c)" \
  GOOGLE_CALENDAR_ID="rajala-varaukset@group.calendar.google.com"

# Verify configuration
firebase functions:config:get
```

### Local Development (.env file)

Create `functions/.env`:

```env
# reCAPTCHA Secret Key (v3)
RECAPTCHA_SECRET=YOUR_ACTUAL_SECRET_KEY_HERE_40_CHARS

# Google Service Account JSON (minified)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}

# Google Calendar ID
GOOGLE_CALENDAR_ID=rajala-varaukset@group.calendar.google.com
```

**Important**: 
- The `.env` file is already in `.gitignore` - NEVER commit it
- Copy `functions/.env.example` to `functions/.env` and fill in your values
- Use different credentials for development and production

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

### Firebase Functions Gen2

The code uses `defineString()` from `firebase-functions/params` to access environment variables:

```javascript
const { defineString } = require('firebase-functions/params');

// Define parameters (Gen2 approach)
const recaptchaSecret = defineString('RECAPTCHA_SECRET');
const googleServiceAccount = defineString('GOOGLE_SERVICE_ACCOUNT');
const googleCalendarId = defineString('GOOGLE_CALENDAR_ID');

// Access values at runtime
const secretKey = recaptchaSecret.value();
const serviceAccountJson = googleServiceAccount.value();
const calendarId = googleCalendarId.value();
```

**Benefits of Gen2 approach**:
- Better type safety
- Clearer error messages when variables are missing
- Works with both secrets and environment variables
- Supports local `.env` files automatically

## Configuration Checklist

Before deploying to production, ensure:

- [ ] reCAPTCHA secret key is configured (via `firebase functions:secrets:set RECAPTCHA_SECRET`)
- [ ] reCAPTCHA domains include: `rajala-services.com`, `www.rajala-services.com`
- [ ] Google service account JSON is configured (via `firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT`)
- [ ] Google Calendar ID is configured (via `firebase functions:secrets:set GOOGLE_CALENDAR_ID`)
- [ ] Service account has access to the calendar
- [ ] Calendar API is enabled in Google Cloud Console
- [ ] All secrets are NOT committed to version control
- [ ] `.env` file is in `.gitignore` (already configured)
- [ ] Functions are deployed with latest environment variables
- [ ] Local `.env` file exists for development (copy from `.env.example`)

## Verification Commands

```bash
# Check Firebase Functions secrets (Gen2)
firebase functions:secrets:access RECAPTCHA_SECRET --project=your-project-id

# Check Firebase Functions environment variables (alternative)
firebase functions:config:get

# Test local configuration (.env file)
cd functions
node -e "require('dotenv').config(); console.log('RECAPTCHA_SECRET:', process.env.RECAPTCHA_SECRET ? 'Set ✓' : 'Not set ✗');"

# Validate service account JSON
cd functions
node -e "require('dotenv').config(); const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}'); console.log('Service account email:', sa.client_email || 'Not configured');"

# Start Firebase Emulator with local .env
firebase emulators:start
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

1. **Never commit secrets**: Already configured in `.gitignore`:
   ```
   *.env
   functions/.runtimeconfig.json
   functions/service-account.json
   *service-account*.json
   ```

2. **Use Firebase Secrets for production** (Gen2 best practice):
   - Secrets are encrypted at rest
   - Access is logged and auditable
   - Easier rotation and management
   - Command: `firebase functions:secrets:set SECRET_NAME`

3. **Rotate keys regularly**: 
   - Regenerate reCAPTCHA keys every 6-12 months
   - Rotate service account keys annually

4. **Limit permissions**:
   - Service account should only have Calendar API access
   - Use principle of least privilege

5. **Monitor usage**:
   - Check Google Cloud Console for API usage
   - Set up billing alerts
   - Monitor Firebase Functions logs

6. **Use environment-specific configs**:
   - Development: Use `.env` file locally
   - Production: Use Firebase Secrets
   - Never mix dev and prod credentials

7. **Verify .gitignore**:
   - Ensure `.env` files are never committed
   - Check with: `git status --ignored`

## Support

For issues with configuration:
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify Google Cloud Console for API status
3. Review this documentation
4. Contact the development team

---

**Last Updated**: 2025-11-23
**Configuration Version**: 2.0.0 (Gen2)
**Firebase Functions**: Gen2
