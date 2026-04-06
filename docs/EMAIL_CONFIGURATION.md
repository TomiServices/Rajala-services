# Email Configuration Guide

This guide explains how to configure email confirmation functionality for the Rajala Services booking system.

## Overview

When a customer makes a booking, they automatically receive a confirmation email with:
- Booking date and time
- Customer information
- Selected services and pricing
- Contact information for changes/cancellations

## Email Delivery Architecture

The system uses a two-tier email delivery approach:

1. **Primary – Firebase Trigger Email from Firestore extension**: Writes a document to the `mail` collection. The extension picks it up and delivers the email via its configured SMTP server. The booking document is updated with `emailQueued: true` and `emailState: 'QUEUED'` immediately, and the `onMailDeliveryUpdated` Cloud Function trigger syncs the final delivery result (`SENT` / `ERROR`) back to the booking automatically.
2. **Fallback – SendGrid HTTP API**: Used in two situations:
   - When the Firebase Extension path fails to write the mail document (`onBookingCreated`).
   - When the Firebase Extension reports `ERROR` state after attempting delivery (`onMailDeliveryUpdated`). This covers SMTP misconfiguration (e.g. "Missing credentials for PLAIN").
   Requires `SENDGRID_API_KEY`. When SendGrid sends the email, the booking is updated with `emailSent: true` and `emailState: 'SENT'`.

> **Important**: `emailQueued: true` on a booking means the email was queued for delivery – it does **not** guarantee the email was delivered. Check `emailState` on the booking document to see the actual delivery result (`QUEUED` → `SENT` or `ERROR`).

## Firebase Extension Setup (Primary Path)

### Why "Missing credentials for PLAIN" happens

The `Error: Missing credentials for "PLAIN"` error appears in the `delivery` map of the `mail` document (and in Firebase Functions logs) when the Firebase "Trigger Email from Firestore" extension is not configured with valid SMTP credentials. The extension tries to authenticate to the SMTP server using the `PLAIN` mechanism but has no username/password to send.

**Solution**: Set the correct SMTP connection URI in the extension configuration in Firebase Console.

### Configure the Extension SMTP URI

1. Go to **Firebase Console → Extensions → Trigger Email from Firestore → Reconfigure**
2. Set the **SMTP connection URI** field. Example format:

   | Provider | URI format |
   |---|---|
   | Gmail / Google Workspace | `smtps://user%40gmail.com:APP_PASSWORD@smtp.gmail.com:465` |
   | Gmail STARTTLS | `smtp://user%40gmail.com:APP_PASSWORD@smtp.gmail.com:587?tls=true` |
   | SendGrid SMTP | `smtp://apikey:SG.YOUR_KEY@smtp.sendgrid.net:587` |

   > **Note**: `@` in the username must be URL-encoded as `%40`.
   > **Note**: Use a Gmail **App Password** (16 characters), not your regular password. Requires 2-Step Verification.

3. Set the **Default FROM address** (e.g. `Fixnero <Palvelut@fixnero.fi>`)
4. Set the **Mail collection** to `mail`
5. Click **Save**

### How to verify the Extension is working

1. Check the **Firebase Console → Extensions → Trigger Email from Firestore → Logs** for errors
2. Check Firestore: open a document in the `mail` collection and look at the `delivery` map:
   - `state: "SUCCESS"` → email was delivered
   - `state: "ERROR"` + `error: "Error: Missing credentials for \"PLAIN\""` → SMTP credentials missing/wrong
   - `state: "PROCESSING"` → extension is currently trying to send
3. Check the corresponding booking document (by the `bookingId` field in the `mail` document):
   - `emailState: "SENT"` → delivered successfully
   - `emailState: "ERROR"` + `emailError` → delivery failed; reason is in `emailError`

## Booking Document Email Fields

After a booking is created the following fields are set on the booking document:

| Field | Type | Description |
|---|---|---|
| `emailQueued` | boolean | `true` if a mail document was created (queued for the Extension) or SendGrid was attempted |
| `emailState` | string | Current delivery state: `QUEUED` / `PROCESSING` / `SENT` / `ERROR` / `FAILED` |
| `emailMethod` | string | `firebase-extension` or `sendgrid` |
| `emailSent` | boolean | `true` only after confirmed delivery (SENT state or synchronous SendGrid send) |
| `emailSentAt` | timestamp | Set when `emailState` becomes `SENT` |
| `emailError` | string | Error message when `emailState` is `ERROR` |
| `emailAttempts` | number | Number of delivery attempts by the Extension |

The `onMailDeliveryUpdated` Cloud Function trigger watches the `mail` collection for updates written by the Extension and syncs `emailState`, `emailError`, `emailSentAt`, and `emailAttempts` back to the booking document automatically.

## Fallback Setup: SendGrid API

Used automatically when the Firebase Extension path fails.

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

## Email Template

The confirmation email is built by the `createEmailDocument()` function in `functions/index.js`. It writes to the `mail` collection with the schema expected by the Firebase Extension:

```json
{
  "to": "<customer email>",
  "message": {
    "subject": "Varausvahvistus - Fixnero",
    "html": "<HTML email body>"
  },
  "bookingId": "<booking document ID>",
  "createdAt": "<server timestamp>"
}
```

All user input is HTML-escaped to prevent XSS. The email is in Finnish (fi-FI locale).

---

## Configuration Summary

| Variable | Required | Description |
|---|---|---|
| Extension SMTP URI | **Yes** (for primary path) | Set in Firebase Console Extension settings |
| `SENDGRID_API_KEY` | If using SendGrid fallback | SendGrid Mail Send API key (`SG.…`) |
| `EMAIL_FROM` | Optional | From address used by SendGrid fallback |

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

### Manual end-to-end test (staging / production)

1. Make a test booking on the website
2. Open **Firestore → mail collection** → find the document with your booking ID
3. Check `delivery.state`:
   - `SUCCESS` → Extension delivered the email ✅
   - `ERROR` → see `delivery.error` for the cause ❌
4. Open **Firestore → bookings collection** → find the booking document
5. Check `emailState`:
   - `SENT` → delivery confirmed ✅
   - `ERROR` + `emailError` → delivery failed ❌
   - `QUEUED` → Extension hasn't processed it yet (wait a few seconds) ⏳

---

## Troubleshooting

### "Missing credentials for PLAIN" / `Error: Missing credentials for "PLAIN"`

**Cause**: The Firebase "Trigger Email from Firestore" extension does not have a valid SMTP URI configured. The extension is attempting to authenticate using the `PLAIN` SASL mechanism but has no credentials.

**Solution**:
1. Open **Firebase Console → Extensions → Trigger Email from Firestore → Reconfigure**
2. Set the **SMTP connection URI** to a valid value (see "Configure the Extension SMTP URI" above)
3. If using Gmail: make sure you are using a **16-character App Password**, not your regular account password
4. If using Gmail: make sure **2-Step Verification** is enabled on the account
5. Save and wait for the extension to restart (about 1 minute)
6. Create a test booking and check the `mail` document's `delivery.state`

### `emailState: 'QUEUED'` stays on the booking (never updates to SENT/ERROR)

**Cause**: The `onMailDeliveryUpdated` Cloud Function is not deployed, or the Extension is not writing back to the `mail` document.

**Solution**:
1. Run `firebase deploy --only functions:onMailDeliveryUpdated` to deploy the trigger
2. Check that the Extension's *Mail collection* setting matches `MAIL_COLLECTION` in `functions/index.js` (default: `mail`)

### `emailState: 'ERROR'` on booking (extension failed, SendGrid also not configured)

**Cause**: The Firebase Extension reported a delivery error (e.g. "Missing credentials for PLAIN") **and** `SENDGRID_API_KEY` is not configured, so both paths failed.

**Solution** (pick one):
1. Fix the Extension SMTP URI (see "Configure the Extension SMTP URI" above) — preferred
2. Set `SENDGRID_API_KEY` in Secret Manager so the automatic fallback in `onMailDeliveryUpdated` can deliver the email

### "Email not configured" in logs

**Cause**: Neither the Firebase Extension nor SendGrid is configured.

**Solution**:
1. Configure the Extension SMTP URI (preferred)
2. Or set `SENDGRID_API_KEY` in Secret Manager as a fallback
3. Restart emulator or redeploy functions

### "Invalid login" / "Username and Password not accepted"

**Cause**: Using the regular Gmail password instead of an App Password, or 2-Step Verification is not enabled.

**Solution**:
1. Ensure 2-Step Verification is enabled on the Google account
2. Generate a new App Password (16 characters) at https://myaccount.google.com/apppasswords
3. Update the SMTP URI in the Extension settings with the new App Password

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

- [ ] Firebase Extension SMTP URI configured in Firebase Console
- [ ] Extension "Mail collection" set to `mail`
- [ ] Extension "Default FROM address" set to a verified sender
- [ ] Test booking made and `mail` document shows `delivery.state: "SUCCESS"`
- [ ] Booking document shows `emailState: "SENT"`
- [ ] (Optional) `SENDGRID_API_KEY` set in Secret Manager as fallback
- [ ] Firebase Functions logs checked for errors after deployment

---

## Version Information

- **Email Feature Version**: 3.0.0
- **Node.js Version**: 20
- **@sendgrid/mail Version**: 8.1.x
- **Last Updated**: 2026-03-29


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

