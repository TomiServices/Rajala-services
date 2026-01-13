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

#### 4. Email Configuration (Optional - for confirmation emails)

**Purpose**: Send automatic confirmation emails to customers after booking.

**Configuration**:
```bash
# Set email credentials
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-gmail-app-password"
firebase functions:config:set email.from="Fixnero <Palvelut@fixnero.fi>"
```

**Details**:
- Type: String values
- Format: 
  - `email.user`: Gmail account email address
  - `email.password`: Gmail App Password (16 characters, NOT regular password)
  - `email.from`: Display name and email for sender
- Required: Optional (email features disabled if not configured)
- Obtain App Password from: Google Account > Security > 2-Step Verification > App passwords

**Local Development**:
```json
{
  "email": {
    "user": "your-email@gmail.com",
    "password": "abcdefghijklmnop",
    "from": "Fixnero <Palvelut@fixnero.fi>"
  }
}
```

**Security Warning**: ⚠️ Use Gmail App Password, NOT your regular password! Enable 2-Step Verification first.

**For detailed email setup, see**: [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md)

## Complete Configuration Example

### Production (Firebase CLI)

```bash
# Set all configuration at once
firebase functions:config:set \
  recaptcha.secret="6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  google.service_account="$(cat service-account-key.json | jq -c)" \
  google.calendar_id="fixnero-varaukset@group.calendar.google.com" \
  email.user="bookings@gmail.com" \
  email.password="abcdefghijklmnop" \
  email.from="Fixnero <Palvelut@fixnero.fi>"

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
  },
  "email": {
    "user": "bookings@gmail.com",
    "password": "abcdefghijklmnop",
    "from": "Fixnero <Palvelut@fixnero.fi>"
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

// Email credentials
const emailUser = functions.config().email?.user || process.env.EMAIL_USER;
const emailPassword = functions.config().email?.password || process.env.EMAIL_PASSWORD;
const emailFrom = functions.config().email?.from || process.env.EMAIL_FROM;
```

## Configuration Checklist

Before deploying to production, ensure:

- [ ] reCAPTCHA secret key is configured
- [ ] reCAPTCHA domains include: `fixnero.fi`, `fixnero.fi`
- [ ] Email user (Gmail account) is configured
- [ ] Email password (Gmail App Password) is configured
- [ ] Email from address is configured
- [ ] 2-Step Verification is enabled on Gmail account
- [ ] Gmail App Password generated (not regular password)
- [ ] Test email sent successfully
- [ ] Google service account JSON is configured (optional)
- [ ] Google Calendar ID is configured (optional)
- [ ] Service account has access to the calendar (if using Google Calendar)
- [ ] Calendar API is enabled in Google Cloud Console (if using Google Calendar)
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

### Email Not Sending

**Symptom**: Functions log "Email not configured" or "Email transporter not available"

**Solution**:
1. Verify email credentials are configured: `firebase functions:config:get`
2. Check that 2-Step Verification is enabled on Gmail account
3. Use Gmail App Password (not regular password)
4. Test email configuration with verification script (see EMAIL_CONFIGURATION.md)

## Security Best Practices

1. **Never commit secrets**: Add to `.gitignore`:
   ```
   functions/.runtimeconfig.json
   functions/.env
   service-account-key.json
   ```

2. **Rotate keys regularly**: 
   - Regenerate reCAPTCHA keys every 6-12 months
   - Rotate service account keys annually
   - Rotate Gmail App Passwords every 6-12 months

3. **Limit permissions**:
   - Service account should only have Calendar API access
   - Gmail account should be dedicated for sending only
   - Use principle of least privilege

4. **Monitor usage**:
   - Check Google Cloud Console for API usage
   - Monitor Gmail sending limits (500/day for free accounts)
   - Set up billing alerts
   - Monitor Firebase Functions logs

5. **Use environment-specific configs**:
   - Development: Use `.runtimeconfig.json` or `.env`
   - Production: Use `firebase functions:config:set` or Firebase secrets
   - Never mix dev and prod credentials

## Support

For issues with configuration:
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify Google Cloud Console for API status
3. Review this documentation and [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md)
4. Contact the development team

---

**Last Updated**: 2024-11-23
**Configuration Version**: 1.1.0 (Added email configuration)
