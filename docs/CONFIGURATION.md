# Centralized Configuration System
## Environment Variables and Service Configuration

**Document Version:** 1.0  
**Created:** January 13, 2026  
**Purpose:** Centralized configuration management for all external services

---

## Overview

This document describes the centralized configuration system for managing all external service integrations. The system is designed to be:

- **Secure** - Sensitive credentials stored in Secret Manager
- **Flexible** - Easy to switch between environments
- **Validated** - Configuration validated before use
- **Documented** - Clear documentation for all variables

---

## Configuration Files

### File Structure

```
Rajala-services/
├── .env.example                    # Template (committed to Git)
├── .env                            # Local development (ignored by Git)
├── functions/
│   ├── .env.example               # Functions template (committed to Git)
│   ├── .env                       # Local functions config (ignored by Git)
│   └── .runtimeconfig.json.example # Firebase config template
├── config/
│   ├── config.js                  # Configuration loader (NEW)
│   ├── validate-config.js         # Configuration validator (NEW)
│   └── config.schema.json         # Configuration schema (NEW)
└── docs/
    └── CONFIGURATION.md           # This file
```

---

## Environment Variables Reference

### Frontend Configuration (.env.example)

**Note:** Frontend has minimal configuration as most secrets are server-side.

```bash
# ============================================
# PUBLIC CONFIGURATION (Safe to expose)
# ============================================

# Firebase Project ID
FIREBASE_PROJECT_ID=fxnr-web

# reCAPTCHA Site Key (public)
RECAPTCHA_SITE_KEY=6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM

# Google Analytics Measurement ID (public)
GA_MEASUREMENT_ID=G-SP5R1MN1H9

# Website Domain
DOMAIN=fixnero.fi

# API Endpoint Base URL
API_BASE_URL=https://europe-north1-fxnr-web.cloudfunctions.net

# ============================================
# DEVELOPMENT ONLY
# ============================================

# Use emulators instead of production (true/false)
USE_EMULATORS=false

# Emulator hosts (if USE_EMULATORS=true)
FIRESTORE_EMULATOR_HOST=localhost:8080
FUNCTIONS_EMULATOR_HOST=localhost:5001
```

### Backend Configuration (functions/.env.example)

**Complete reference for all backend environment variables:**

```bash
# ============================================
# RECAPTCHA CONFIGURATION
# ============================================
# ⚠️ IMPORTANT: RECAPTCHA_SECRET MUST be set via Secret Manager!
# Do NOT add RECAPTCHA_SECRET to this file.
# 
# To set the secret:
#   firebase functions:secrets:set RECAPTCHA_SECRET
# 
# Get your reCAPTCHA v3 secret key from:
#   https://www.google.com/recaptcha/admin
# 
# The secret key should be 40 characters long
# Example format: 6LdmOggsAAAAAExample_Secret_Key_Here
# ============================================

# ============================================
# EMAIL CONFIGURATION
# ============================================
# Gmail account used for sending booking confirmation emails
# Format: your-email@gmail.com
# Example: bookings@fixnero.fi
EMAIL_USER=your-email@gmail.com

# Gmail App Password (not your regular Gmail password)
# ⚠️ RECOMMENDED: Store this in Secret Manager instead:
#   firebase functions:secrets:set EMAIL_PASSWORD
# 
# How to generate App Password:
#   1. Go to https://myaccount.google.com/apppasswords
#   2. Enable 2-Step Verification if not already enabled
#   3. Select app: "Mail"
#   4. Select device: "Other (Custom name)" - enter "Rajala Booking System"
#   5. Generate and copy the 16-character password
#   6. Paste below (remove spaces)
# 
# Format: 16 lowercase letters (no spaces)
# Example: abcdefghijklmnop
EMAIL_PASSWORD=your-16-char-app-password

# Display name and email address for outgoing emails
# This appears as "From" in customer emails
# Format: Display Name <email@domain.com>
# Example: Rajala Services <noreply@fixnero.fi>
EMAIL_FROM=Rajala Services <noreply@fixnero.fi>

# ============================================
# GOOGLE CALENDAR CONFIGURATION
# ============================================
# Google Service Account JSON (stringified, minified)
# ⚠️ RECOMMENDED: Store this in Secret Manager for production
# 
# How to get Service Account JSON:
#   1. Go to https://console.cloud.google.com
#   2. Select project: fxnr-web
#   3. IAM & Admin > Service Accounts
#   4. Create or select service account
#   5. Keys > Add Key > Create new key > JSON
#   6. Download JSON file
#   7. Minify: cat service-account.json | jq -c '.'
#   8. Paste minified JSON as single line below
# 
# Format: {"type":"service_account","project_id":"..."}
# Must be valid JSON on a single line
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Google Calendar ID for booking synchronization
# How to find Calendar ID:
#   1. Go to https://calendar.google.com
#   2. Settings (gear icon) > Settings for my calendars
#   3. Select your booking calendar
#   4. Scroll to "Integrate calendar"
#   5. Copy "Calendar ID"
# 
# Format: xxxxxxx@group.calendar.google.com
# Example: c_1234567890abcdef@group.calendar.google.com
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com

# Calendar webhook callback URL (for push notifications)
# This is your Cloud Function URL for calendar sync
# Format: https://REGION-PROJECT_ID.cloudfunctions.net/calendarWebhook
# Example: https://europe-north1-fxnr-web.cloudfunctions.net/calendarWebhook
WATCH_CALLBACK_URL=https://europe-north1-your-project.cloudfunctions.net/calendarWebhook

# ============================================
# FIREBASE CONFIGURATION
# ============================================
# Firebase project ID (usually auto-detected, but can be set explicitly)
# Get from: Firebase Console > Project Settings
# Format: lowercase-with-dashes
# Example: fxnr-web
FIREBASE_PROJECT_ID=fxnr-web

# Firebase region for Cloud Functions
# Default: europe-north1
# Other options: europe-west1, asia-northeast1, etc.
# See: https://cloud.google.com/functions/docs/locations
FIREBASE_REGION=europe-north1

# ============================================
# CORS CONFIGURATION
# ============================================
# Allowed origins for CORS (comma-separated)
# These domains can make requests to your Cloud Functions
# Format: https://domain1.com,https://domain2.com
ALLOWED_ORIGINS=https://fixnero.fi,https://www.fixnero.fi,https://fixnero.fi,https://fxnr-web.firebaseapp.com

# ============================================
# BUSINESS CONFIGURATION
# ============================================
# Business timezone for calendar events
# Format: IANA timezone identifier
# Example: Europe/Helsinki
# See: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
TIMEZONE=Europe/Helsinki

# Business hours for bookings (24-hour format)
# Format: HH:MM
BUSINESS_HOURS_START=09:00
BUSINESS_HOURS_END=17:00

# Business days (comma-separated, 0=Sunday, 1=Monday, ..., 6=Saturday)
# Example: 1,2,3,4,5 (Monday to Friday)
BUSINESS_DAYS=1,2,3,4,5

# Booking slot duration in minutes
# Default: 60 (1 hour)
BOOKING_SLOT_DURATION=60

# Minimum advance booking time in hours
# Prevents bookings too close to current time
# Default: 2 (customers must book at least 2 hours in advance)
MIN_ADVANCE_BOOKING_HOURS=2

# Maximum advance booking time in days
# Prevents bookings too far in the future
# Default: 90 (customers can book up to 90 days ahead)
MAX_ADVANCE_BOOKING_DAYS=90

# ============================================
# FEATURE FLAGS
# ============================================
# Enable/disable specific features (true/false)

# Enable email notifications
ENABLE_EMAIL=true

# Enable Google Calendar sync
ENABLE_CALENDAR_SYNC=true

# Enable reCAPTCHA validation
ENABLE_RECAPTCHA=true

# Enable webhook notifications
ENABLE_WEBHOOKS=true

# Debug mode (enables verbose logging)
# ⚠️ WARNING: Do not enable in production!
DEBUG_MODE=false

# ============================================
# TESTING CONFIGURATION (Optional)
# ============================================
# Test email address (receives all emails in test mode)
# Only used if DEBUG_MODE=true
TEST_EMAIL_RECIPIENT=test@example.com

# Bypass reCAPTCHA in test mode
# Only used if DEBUG_MODE=true
# ⚠️ WARNING: Never use in production!
BYPASS_RECAPTCHA=false

# ============================================
# MONITORING AND LOGGING
# ============================================
# Log level (error, warn, info, debug)
# Default: info
LOG_LEVEL=info

# Enable performance monitoring
# Logs execution time for functions
ENABLE_PERFORMANCE_MONITORING=true

# ============================================
# NOTES AND BEST PRACTICES
# ============================================
# 
# 1. Security:
#    - NEVER commit this file with real values to Git
#    - Use Secret Manager for sensitive values in production
#    - Rotate credentials regularly (quarterly recommended)
#    - Use strong, unique passwords
# 
# 2. Environment Separation:
#    - Use different .env files for dev/staging/production
#    - Never mix credentials between environments
#    - Test thoroughly in dev before production deployment
# 
# 3. Validation:
#    - Run validation script before deployment:
#      node config/validate-config.js
#    - Check for missing required variables
#    - Verify email/calendar connectivity
# 
# 4. Documentation:
#    - Document any custom variables you add
#    - Update this template when adding new services
#    - Keep comments up-to-date
# 
# 5. Backup:
#    - Keep secure backup of production credentials
#    - Store in password manager (1Password, LastPass, etc.)
#    - Document credential locations for disaster recovery
# 
# ============================================
```

---

## Configuration Schema

### Required Variables by Feature

| Feature | Required Variables |
|---------|-------------------|
| **Basic Functions** | `FIREBASE_PROJECT_ID` |
| **Booking API** | `RECAPTCHA_SECRET` (Secret Manager) |
| **Email Notifications** | `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` |
| **Calendar Sync** | `GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_CALENDAR_ID` |
| **Calendar Webhooks** | `WATCH_CALLBACK_URL` |

### Optional Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `FIREBASE_REGION` | `europe-north1` | Cloud Functions region |
| `TIMEZONE` | `Europe/Helsinki` | Business timezone |
| `BUSINESS_HOURS_START` | `09:00` | Opening time |
| `BUSINESS_HOURS_END` | `17:00` | Closing time |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `DEBUG_MODE` | `false` | Development debugging |

---

## Secret Manager Best Practices

### When to Use Secret Manager

**ALWAYS use Secret Manager for:**
- API secret keys (reCAPTCHA secret)
- Passwords (email, database)
- Private keys (service account JSON)
- Tokens (OAuth, API)

**Can use .env for:**
- Non-sensitive IDs (calendar ID, project ID)
- Public keys (reCAPTCHA site key)
- Feature flags
- Business configuration

### Setting Secrets

```bash
# Set a secret
firebase functions:secrets:set SECRET_NAME

# Access a secret (for verification)
firebase functions:secrets:access SECRET_NAME

# List all secrets
firebase functions:secrets:list

# Delete a secret
firebase functions:secrets:destroy SECRET_NAME
```

### Using Secrets in Code

```javascript
// functions/index.js
const { defineSecret } = require('firebase-functions/params');

// Define secret
const recaptchaSecret = defineSecret('RECAPTCHA_SECRET');

// Use in function
exports.book = onRequest({ secrets: [recaptchaSecret] }, async (req, res) => {
  const secret = recaptchaSecret.value();
  // Use secret...
});
```

---

## Configuration Validation

### Automatic Validation

Run validation before deployment:

```bash
# Navigate to project root
cd /path/to/Rajala-services

# Run validation
node config/validate-config.js

# Or with npm script (if configured)
npm run validate-config
```

### Manual Validation Checklist

- [ ] All required variables are set
- [ ] Email credentials are valid
- [ ] Service account JSON is valid
- [ ] Calendar ID exists and is accessible
- [ ] reCAPTCHA keys match the site
- [ ] URLs are correctly formatted
- [ ] Feature flags are appropriately set
- [ ] No secrets in .env (use Secret Manager)

---

## Multi-Environment Setup

### Development Environment

```bash
# functions/.env.development
FIREBASE_PROJECT_ID=fxnr-web-dev
DEBUG_MODE=true
ENABLE_EMAIL=false
ENABLE_CALENDAR_SYNC=false
ENABLE_RECAPTCHA=false
```

### Staging Environment

```bash
# functions/.env.staging
FIREBASE_PROJECT_ID=fxnr-web-staging
DEBUG_MODE=false
ENABLE_EMAIL=true
ENABLE_CALENDAR_SYNC=true
ENABLE_RECAPTCHA=true
TEST_EMAIL_RECIPIENT=staging-tests@fixnero.fi
```

### Production Environment

```bash
# functions/.env.production (or use Secret Manager entirely)
FIREBASE_PROJECT_ID=fxnr-web
DEBUG_MODE=false
ENABLE_EMAIL=true
ENABLE_CALENDAR_SYNC=true
ENABLE_RECAPTCHA=true
# All sensitive values in Secret Manager
```

### Switching Environments

```bash
# Copy appropriate config
cp functions/.env.development functions/.env

# Or use environment variable
export NODE_ENV=production
# Code reads from .env.production
```

---

## Migration from Old to New System

### Step 1: Audit Current Configuration

```bash
# List current environment variables
cat functions/.env

# List secrets
firebase functions:secrets:list

# Document everything
```

### Step 2: Create New Configuration

```bash
# Copy template
cp functions/.env.example functions/.env

# Fill in values from old configuration
nano functions/.env
```

### Step 3: Migrate Secrets

```bash
# Set secrets that were in .env
firebase functions:secrets:set RECAPTCHA_SECRET
firebase functions:secrets:set EMAIL_PASSWORD

# Remove from .env file
nano functions/.env
# Delete EMAIL_PASSWORD line
```

### Step 4: Validate and Test

```bash
# Validate configuration
node config/validate-config.js

# Test locally
firebase emulators:start

# Test booking flow
# Verify email sends
# Verify calendar syncs

# Deploy if tests pass
firebase deploy --only functions
```

---

## Troubleshooting Configuration Issues

### "Environment variable not found"

**Cause:** Variable not set in .env or Secret Manager

**Solution:**
```bash
# Check .env file
cat functions/.env | grep VARIABLE_NAME

# Check secrets
firebase functions:secrets:access VARIABLE_NAME

# Set if missing
echo "VARIABLE_NAME=value" >> functions/.env
# Or for secrets:
firebase functions:secrets:set VARIABLE_NAME
```

### "Invalid JSON in GOOGLE_SERVICE_ACCOUNT"

**Cause:** JSON is malformed or has extra whitespace

**Solution:**
```bash
# Validate JSON
echo $GOOGLE_SERVICE_ACCOUNT | jq .

# Re-minify if needed
cat service-account.json | jq -c '.' > minified.json
cat minified.json
# Copy output to .env
```

### "Email authentication failed"

**Cause:** Incorrect email password or settings

**Solution:**
```bash
# Verify app password is correct (16 chars, no spaces)
# Generate new app password if needed
# Update secret
firebase functions:secrets:set EMAIL_PASSWORD
```

### "Calendar permission denied"

**Cause:** Service account doesn't have calendar access

**Solution:**
```
1. Go to Google Calendar
2. Settings > Your calendar settings
3. Share with specific people
4. Add service account email
5. Grant "Make changes to events" permission
6. Save
```

---

## Security Checklist

### Before Deployment

- [ ] No secrets in .env file (use Secret Manager)
- [ ] .env file is in .gitignore
- [ ] Service account JSON is minified and secured
- [ ] Strong passwords used (20+ characters)
- [ ] 2FA enabled on all accounts
- [ ] API keys restricted to specific domains
- [ ] CORS properly configured
- [ ] HTTPS enforced

### Regular Maintenance

- [ ] Rotate service account keys (quarterly)
- [ ] Update email app passwords (annually)
- [ ] Review and remove unused secrets
- [ ] Audit access logs
- [ ] Update dependencies
- [ ] Review and update configuration documentation

---

## Additional Resources

- Firebase Environment Configuration: https://firebase.google.com/docs/functions/config-env
- Secret Manager Guide: `docs/SECRET_MANAGER.md`
- Migration Guide: `docs/MIGRATION_GUIDE.md`
- Administrator Guide: `docs/ADMINISTRATOR_SETUP_GUIDE.md`

---

**Document Prepared By:** GitHub Copilot Coding Agent  
**Review Status:** Ready for Review  
**Last Updated:** January 13, 2026
