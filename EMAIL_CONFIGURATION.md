# Email Configuration Guide

This guide explains how to configure email confirmation functionality for the Rajala Services booking system.

## Overview

When a customer makes a booking, they automatically receive a confirmation email with:
- Booking date and time
- Customer information
- Selected services and pricing
- Contact information for changes/cancellations

## Email Delivery Methods

The system supports two email delivery methods:

1. **Firebase Firestore Send Email Extension (Recommended)** - Uses the official Firebase extension to handle email delivery, retries, and monitoring via Eventarc events.
2. **Direct SMTP via Nodemailer (Legacy Fallback)** - Sends emails directly using Gmail SMTP and Nodemailer.

By default, the system uses the Firebase extension method. You can control this with the `USE_EMAIL_EXTENSION` environment variable.

---

## Option 1: Firebase Firestore Send Email Extension (Recommended)

### Why Use the Extension?

The Firebase Firestore Send Email extension provides:
- **Automatic retries** for failed email deliveries
- **Eventarc event emissions** for monitoring and logging
- **Better separation of concerns** - extension handles delivery logic
- **Easier debugging** via Firestore document inspection
- **Production-ready** solution officially maintained by Firebase

### Extension Configuration

The extension has been configured with the following settings:

- **Extension Name**: Firestore Send Email (trigger-email-from-firestore)
- **Email documents collection**: `mail`
- **Default FROM address**: `tomirajala02@gmail.com`
- **Firestore Instance location**: `eur3` (Europe West 3)
- **SMTP connection URI**: `smtps://tomirajala02@gmail.com@smtp.gmail.com:465`
- **Authentication Type**: Username/Password
- **Event Location**: `europe-west4`

### Installing the Extension

To install the Firestore Send Email extension:

#### Using Firebase Console:
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Extensions** in the left sidebar
4. Click **Install Extension**
5. Search for "Trigger Email from Firestore"
6. Click **Install**
7. Configure with the settings shown above

#### Using Firebase CLI:
```bash
# Install the extension
firebase ext:install firebase/firestore-send-email \
  --project=your-project-id

# During installation, provide the following configuration:
# - Email documents collection: mail
# - Default FROM address: tomirajala02@gmail.com
# - SMTP connection URI: smtps://tomirajala02@gmail.com:YOUR_APP_PASSWORD@smtp.gmail.com:465
# - Event location: europe-west4
```

### Gmail App Password Setup

The extension requires a Gmail App Password (same as Nodemailer method):

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Generate an App Password for "Mail" / "Other"
5. Use this password in the SMTP connection URI

### Environment Variables

Set the following environment variables for the extension integration:

```bash
# Enable/disable the extension (default: true)
USE_EMAIL_EXTENSION=true

# Mail collection name (default: 'mail')
MAIL_COLLECTION_NAME=mail

# Default FROM address (optional, extension default is used if not set)
EMAIL_FROM=tomirajala02@gmail.com
```

For local development, add to `functions/.env`:
```env
USE_EMAIL_EXTENSION=true
MAIL_COLLECTION_NAME=mail
EMAIL_FROM=tomirajala02@gmail.com
```

For production, use Firebase secrets:
```bash
firebase functions:secrets:set USE_EMAIL_EXTENSION
# Enter: true

firebase functions:secrets:set MAIL_COLLECTION_NAME  
# Enter: mail

firebase functions:secrets:set EMAIL_FROM
# Enter: tomirajala02@gmail.com
```

### How It Works

1. When a booking is created in Firestore (`varaukset` collection)
2. The Cloud Function `onBookingCreated` is triggered
3. The function creates a document in the `mail` collection with:
   - `to`: Customer email address
   - `from`: Default FROM address (tomirajala02@gmail.com)
   - `message.subject`: "Varausvahvistus - Rajala Services"
   - `message.html`: Formatted HTML email body
   - `metadata`: Booking ID and timestamp
4. The extension monitors the `mail` collection
5. When a new document is detected, the extension sends the email
6. The extension updates the document with delivery status
7. Eventarc events are emitted for monitoring

### Monitoring and Debugging

#### Check Email Document Status:
```bash
# View documents in the mail collection
firebase firestore:get mail/DOCUMENT_ID
```

The extension adds these fields to email documents:
- `delivery.state`: Current state (PENDING, PROCESSING, SUCCESS, ERROR)
- `delivery.attempts`: Number of delivery attempts
- `delivery.startTime`: When processing started
- `delivery.endTime`: When processing completed
- `delivery.error`: Error message if delivery failed

#### Eventarc Events:
The extension emits the following Eventarc events in `europe-west4`:
- `firebase.extensions.firestore-send-email.v1.onStart` - Email processing started
- `firebase.extensions.firestore-send-email.v1.onSuccess` - Email sent successfully
- `firebase.extensions.firestore-send-email.v1.onError` - Email delivery failed

You can create Cloud Functions to listen to these events for custom logging or notifications.

### Service Account Permissions

The extension creates its own service account. Ensure it has:
- **Firestore read/write permissions** on the `mail` collection
- **Secret Manager access** if using secrets for SMTP credentials

These permissions are usually granted automatically during installation.

### Fallback to Nodemailer

If the extension fails or is not configured, the system automatically falls back to the direct Nodemailer method. You can also explicitly disable the extension:

```bash
# Disable extension and use Nodemailer only
firebase functions:config:set email.use_extension=false
# or set environment variable
USE_EMAIL_EXTENSION=false
```

---

## Option 2: Direct SMTP via Nodemailer (Legacy Fallback)

The system uses Gmail SMTP for sending emails. You'll need:
1. A Gmail account (or Google Workspace account)
2. An App Password (not your regular Gmail password)

### Step 1: Create a Gmail Account

If you don't already have one:
1. Go to https://accounts.google.com
2. Create a new Gmail account
3. Use something like `noreply@your-domain.com` or `bookings@your-domain.com`

### Step 2: Enable 2-Step Verification

App Passwords require 2-Step Verification to be enabled:
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the setup process

### Step 3: Create an App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device and name it "Rajala Services Booking"
4. Click "Generate"
5. **Save the generated 16-character password** (you'll need this for configuration)

## Configuration

### Local Development (.env)

Create a `.env` file in the `functions/` directory:

```bash
cd functions
cp .env.example .env
```

Edit `.env` and add your email credentials:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=Rajala Services <noreply@rajala-services.com>
```

**Important**: 
- `EMAIL_PASSWORD` is the App Password (16 characters with spaces), not your Gmail password
- `EMAIL_FROM` can be a display name with email, or just an email address

### Legacy Configuration (.runtimeconfig.json)

For Firebase Functions Gen1 compatibility, also update `.runtimeconfig.json`:

```json
{
  "email": {
    "user": "your-email@gmail.com",
    "password": "abcdefghijklmnop",
    "from": "Rajala Services <noreply@rajala-services.com>"
  }
}
```

### Production Deployment

For production, set the configuration using Firebase CLI:

#### Option 1: Using Firebase Secrets (Gen2 - Recommended)

```bash
firebase functions:secrets:set EMAIL_USER
# Enter: your-email@gmail.com

firebase functions:secrets:set EMAIL_PASSWORD
# Enter: your-app-password

firebase functions:secrets:set EMAIL_FROM
# Enter: Rajala Services <noreply@rajala-services.com>
```

#### Option 2: Using Functions Config (Gen1 - Legacy)

```bash
firebase functions:config:set \
  email.user="your-email@gmail.com" \
  email.password="abcdefghijklmnop" \
  email.from="Rajala Services <noreply@rajala-services.com>"

# Verify configuration
firebase functions:config:get
```

## Email Template

The confirmation email includes:
- Professional HTML formatting
- Rajala Services branding
- Booking details (date, time, customer info)
- Service details with pricing
- Contact information
- Finnish language (fi-FI locale)

### Customization

To customize the email template, edit the `sendBookingConfirmationEmail` function in `functions/index.js`:

```javascript
async function sendBookingConfirmationEmail(bookingData) {
  // ... email configuration ...
  
  const mailOptions = {
    from: emailFromVal,
    to: bookingData.sahkoposti,
    subject: 'Varausvahvistus - Rajala Services',
    html: `
      <!-- Customize your HTML template here -->
    `
  };
  
  // ... send email ...
}
```

## Testing

### Local Testing with Emulator

1. Start the Firebase emulator:
```bash
firebase emulators:start
```

2. Create a test booking through the web interface or API
3. Check the Functions logs in the emulator UI (http://localhost:4000)
4. Verify the email was sent (check inbox of the email used in booking)

### Testing Email Configuration

Test if your credentials work:

```bash
cd functions
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});
transporter.verify((error, success) => {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});
"
```

## Troubleshooting

### "Email not configured" in logs

**Cause**: `EMAIL_USER` or `EMAIL_PASSWORD` environment variables are not set.

**Solution**: 
1. Verify `.env` file exists in `functions/` directory
2. Check that variables are correctly set
3. Restart the emulator or redeploy functions

### "Invalid login" or "Username and Password not accepted"

**Cause**: Using regular Gmail password instead of App Password, or 2-Step Verification not enabled.

**Solution**:
1. Ensure 2-Step Verification is enabled on your Google account
2. Generate a new App Password
3. Update `EMAIL_PASSWORD` with the App Password (not your regular password)

### Emails not being sent

**Cause**: Multiple possible reasons.

**Solution**:
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify email credentials are correct
3. Check Gmail account isn't blocked or limited
4. Ensure "Less secure app access" is NOT enabled (use App Passwords instead)
5. Check if emails are in spam folder

### "Email transporter not available - skipping email"

**Cause**: Email configuration is incomplete or failed to initialize.

**Solution**:
1. Check all email environment variables are set
2. Verify App Password is correct (no spaces in .env, spaces OK in .runtimeconfig.json)
3. Check function logs for initialization errors

### Emails sent but not received

**Cause**: Emails may be blocked, in spam, or Gmail limits reached.

**Solution**:
1. Check spam/junk folder
2. Verify recipient email address is correct
3. Check Gmail's sending limits (500 emails/day for free Gmail)
4. Consider using a professional email service for production (SendGrid, Mailgun, etc.)

## Gmail Sending Limits

Be aware of Gmail's sending limits:
- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2,000 emails per day

For higher volume needs, consider:
- SendGrid (12,000 free emails/month)
- Mailgun (5,000 free emails/month)
- Amazon SES (62,000 free emails/month)

## Security Best Practices

1. ✅ **Never commit credentials**: Add `.env` and `.runtimeconfig.json` to `.gitignore`
2. ✅ **Use App Passwords**: Never use your main Gmail password
3. ✅ **Limit permissions**: Use a dedicated Gmail account for sending only
4. ✅ **Monitor usage**: Check Gmail account regularly for suspicious activity
5. ✅ **Rotate passwords**: Change App Passwords every 6-12 months
6. ✅ **Enable 2FA**: Always use 2-Step Verification

## Production Deployment Checklist

Before deploying to production:

- [ ] Gmail account created and configured
- [ ] 2-Step Verification enabled
- [ ] App Password generated
- [ ] Environment variables set in Firebase (secrets or config)
- [ ] Email template tested and customized
- [ ] Contact information in email is correct
- [ ] Test email sent successfully
- [ ] Spam folder checked
- [ ] Sending limits appropriate for expected volume
- [ ] `.env` and `.runtimeconfig.json` in `.gitignore`

## Alternative Email Services

For production, you may want to use a professional email service:

### SendGrid

```javascript
// Install: npm install @sendgrid/mail
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: bookingData.sahkoposti,
  from: 'noreply@rajala-services.com',
  subject: 'Varausvahvistus - Rajala Services',
  html: emailHtml,
};
await sgMail.send(msg);
```

### Mailgun

```javascript
// Install: npm install mailgun-js
const mailgun = require('mailgun-js');
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

await mg.messages().send({
  from: 'noreply@rajala-services.com',
  to: bookingData.sahkoposti,
  subject: 'Varausvahvistus - Rajala Services',
  html: emailHtml
});
```

## Support

For issues with email configuration:
1. Check Firebase Functions logs: `firebase functions:log`
2. Review this documentation
3. Test with the verification script above
4. Check Google Account security settings

## Version Information

- **Email Feature Version**: 1.0.0
- **Node.js Version**: 20
- **Nodemailer Version**: 7.0.x
- **Last Updated**: 2024-11-23

---

**For general Firebase Functions setup, see [functions/README.md](functions/README.md)**
