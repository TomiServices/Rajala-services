# Email Configuration Guide

This guide explains how to configure email confirmation functionality for the Rajala Services booking system.

## Overview

When a customer makes a booking, they automatically receive a confirmation email with:
- Booking date and time
- Customer information
- Selected services and pricing
- Contact information for changes/cancellations

## Email Delivery Architecture

The system uses a three-tier email delivery approach to maximise reliability:

1. **Primary – SendGrid HTTP API** (recommended): Calls SendGrid's REST API directly, avoiding SMTP relay throttling (421 errors). Requires `SENDGRID_API_KEY`.
2. **Fallback – Gmail SMTP via Nodemailer** (STARTTLS port 587): Used when SendGrid is not configured. Requires `EMAIL_USER` and `EMAIL_PASSWORD`.
3. **Last-resort – Firebase Email Extension** (SMTP relay): Retained for backwards compatibility. Not recommended as the sole path due to intermittent 421 throttling errors on `smtp-relay.gmail.com`.

## Recommended Setup: SendGrid API

### Step 1: Create a SendGrid account

1. Go to https://sendgrid.com and create a free account (100 emails/day on the free tier)
2. Verify your sender domain or email address in SendGrid's sender authentication

### Step 2: Create an API key

1. In the SendGrid dashboard, go to **Settings → API Keys**
2. Click **Create API Key**
3. Choose **Restricted Access** → enable only **Mail Send**
4. Copy and save the generated key (starts with `SG.`)

### Step 3: Configure the API key as a Firebase Secret

```bash
# Store the key in Secret Manager (recommended for production)
firebase functions:secrets:set SENDGRID_API_KEY
# Paste the key when prompted
```

Or for local development, add to `functions/.env`:

```env
SENDGRID_API_KEY=SG.your-api-key-here
```

### Step 4: Set the sender address

The `EMAIL_FROM` variable controls the "From" address for all outgoing emails.
It must match a verified sender in your SendGrid account.

```bash
firebase functions:secrets:set EMAIL_FROM
# Enter: Fixnero <Palvelut@fixnero.fi>
```

---

## Fallback Setup: Gmail SMTP (Nodemailer)

Used automatically when `SENDGRID_API_KEY` is not set.

### Step 1: Create a Gmail / Google Workspace account

Use a dedicated account such as `Palvelut@fixnero.fi`.

### Step 2: Enable 2-Step Verification

App Passwords require 2-Step Verification:
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification" and complete setup

### Step 3: Create an App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app and "Other" as the device
3. Name it "Rajala Services Booking" and click "Generate"
4. **Save the 16-character password** (you'll need this for configuration)

### Step 4: Configure credentials

```bash
# Production (Secret Manager - recommended)
firebase functions:secrets:set EMAIL_USER
# Enter: Palvelut@fixnero.fi

firebase functions:secrets:set EMAIL_PASSWORD
# Enter: your-16-char-app-password

firebase functions:secrets:set EMAIL_FROM
# Enter: Fixnero <Palvelut@fixnero.fi>
```

Local development (`functions/.env`):

```env
EMAIL_USER=Palvelut@fixnero.fi
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=Fixnero <Palvelut@fixnero.fi>
```

> **Note**: The Nodemailer path uses explicit STARTTLS on port 587 (not the SMTP relay) to avoid 421 throttling errors. An exponential-backoff retry (up to 3 attempts) is applied automatically.

---

## Email Template

The confirmation email is built by the shared `buildBookingEmailHtml()` helper in `functions/index.js`. It includes:
- Professional HTML formatting
- Booking details (date, time, customer info)
- Service details with pricing
- Directions and contact information
- Finnish language (fi-FI locale)
- All user input is HTML-escaped to prevent XSS

---

## Configuration Summary

| Variable | Required | Description |
|---|---|---|
| `SENDGRID_API_KEY` | If using SendGrid (recommended) | SendGrid Mail Send API key (`SG.…`) |
| `EMAIL_USER` | If using Nodemailer fallback | Gmail/Workspace address |
| `EMAIL_PASSWORD` | If using Nodemailer fallback | Gmail App Password (16 chars) |
| `EMAIL_FROM` | Optional | From address (defaults to `EMAIL_USER`) |

---

## Testing

### Run unit tests

```bash
cd functions
npm test
```

This runs `test-email-helpers.js` which validates `escapeHtml`, `withRetry`, `buildBookingEmailHtml`, and email method tracking logic.

### Local testing with emulator

1. Start the Firebase emulator:
```bash
firebase emulators:start
```

2. Create a test booking through the web interface or API
3. Check the Functions logs in the emulator UI (http://localhost:4000)
4. Verify the email was sent (check the recipient's inbox)

### Verify SendGrid credentials

```bash
cd functions
node -e "
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.send({
  to: 'test@example.com',
  from: process.env.EMAIL_FROM || 'Palvelut@fixnero.fi',
  subject: 'SendGrid test',
  text: 'Test email from Rajala Services'
}).then(() => console.log('✅ SendGrid OK')).catch(err => console.error('❌', err.message));
" 
```

---

## Troubleshooting

### 421 errors / "Server terminates connection (EHLO)"

**Cause**: Google Workspace SMTP relay (`smtp-relay.gmail.com`) throttling bursty connections.

**Solution**: Configure `SENDGRID_API_KEY` to use the SendGrid API path (no SMTP). The Nodemailer fallback now uses `smtp.gmail.com:587` (STARTTLS) instead of the relay.

### "Email not configured" in logs

**Cause**: `EMAIL_USER` or `EMAIL_PASSWORD` environment variables are not set (and `SENDGRID_API_KEY` is also absent).

**Solution**:
1. Set `SENDGRID_API_KEY` in Secret Manager (preferred)
2. Or set `EMAIL_USER` + `EMAIL_PASSWORD` in Secret Manager or `.env`
3. Restart emulator or redeploy functions

### "Invalid login" / "Username and Password not accepted"

**Cause**: Using the regular Gmail password instead of an App Password, or 2-Step Verification is not enabled.

**Solution**:
1. Ensure 2-Step Verification is enabled on the Google account
2. Generate a new App Password (16 characters)
3. Update `EMAIL_PASSWORD` with the App Password

### SendGrid 403 / authentication error

**Cause**: The API key is incorrect, has been revoked, or lacks the "Mail Send" permission.

**Solution**:
1. Verify the key in SendGrid Dashboard → Settings → API Keys
2. Ensure the key has "Mail Send" access
3. Re-run `firebase functions:secrets:set SENDGRID_API_KEY`

---

## Gmail Sending Limits

If using the Nodemailer Gmail path, be aware of sending limits:
- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2,000 emails per day

For higher volume, **SendGrid free tier** provides 100 emails/day; paid plans start at $19.95/month for 50,000 emails.

---

## Security Best Practices

1. ✅ **Never commit credentials**: `.env` and `.runtimeconfig.json` are in `.gitignore`
2. ✅ **Use Secret Manager for production**: `firebase functions:secrets:set`
3. ✅ **Use App Passwords or API keys**: Never use your main account password
4. ✅ **Limit API key permissions**: Grant only "Mail Send" for SendGrid keys
5. ✅ **Enable 2FA**: On both Gmail and SendGrid accounts
6. ✅ **Rotate keys regularly**: Quarterly rotation recommended

---

## Production Deployment Checklist

- [ ] `SENDGRID_API_KEY` set in Secret Manager **or** `EMAIL_USER` + `EMAIL_PASSWORD` set
- [ ] `EMAIL_FROM` configured with a verified sender address
- [ ] SendGrid sender domain/email verified (if using SendGrid)
- [ ] Gmail 2-Step Verification enabled and App Password generated (if using Nodemailer fallback)
- [ ] Test email sent successfully after deployment
- [ ] Spam folder checked
- [ ] Firebase Functions logs checked for errors

---

## Version Information

- **Email Feature Version**: 2.0.0
- **Node.js Version**: 20
- **@sendgrid/mail Version**: 8.1.x
- **Nodemailer Version**: 7.0.x
- **Last Updated**: 2025-02-26

