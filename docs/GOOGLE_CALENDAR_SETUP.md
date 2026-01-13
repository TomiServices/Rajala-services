# Google Calendar Integration Setup Guide

This guide explains how to set up two-way synchronization between the Fixnero booking system and Google Calendar.

## Overview

The integration provides:
- **Automatic sync to Google Calendar** when bookings are made on the website
- **Two-way synchronization** - changes in Google Calendar are reflected in the website
- **Real-time updates** via webhook notifications
- **Complete CRUD support** - Create, Read, Update, Delete operations in both directions

## Prerequisites

1. **Google Cloud Project** with Calendar API enabled
2. **Firebase Project** already set up (existing: `Webbi1`)
3. **Service Account** with Calendar API access
4. **Google Calendar** for storing bookings

## Step 1: Set Up Google Cloud Project

### 1.1 Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing project
3. Note the Project ID for later use

### 1.2 Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click **Enable**

### 1.3 Create Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Fill in the details:
   - **Name**: `fixnero-calendar-sync`
   - **Description**: `Service account for Fixnero calendar synchronization`
4. Click **Create and Continue**
5. Grant the service account the **Editor** role
6. Click **Done**

### 1.4 Create Service Account Key

1. Click on the newly created service account
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON** format
5. Click **Create**
6. **Save the downloaded JSON file securely** - this contains your credentials

## Step 2: Set Up Google Calendar

### 2.1 Create a Calendar for Bookings

1. Go to [Google Calendar](https://calendar.google.com/)
2. On the left sidebar, click **+** next to "Other calendars"
3. Select **Create new calendar**
4. Fill in details:
   - **Name**: `Fixnero Varaukset` (or any name you prefer)
   - **Description**: `Automaattinen varauskalenteri`
   - **Time zone**: `Europe/Helsinki`
5. Click **Create calendar**

### 2.2 Share Calendar with Service Account

1. Find the newly created calendar in the left sidebar
2. Click the **three dots** next to it and select **Settings and sharing**
3. Scroll to **Share with specific people**
4. Click **Add people**
5. Enter the **service account email** from the JSON key file
   - It looks like: `fixnero-calendar-sync@your-project-id.iam.gserviceaccount.com`
6. Set permission to **Make changes to events**
7. Click **Send**

### 2.3 Get Calendar ID

1. In calendar settings, scroll to **Integrate calendar**
2. Copy the **Calendar ID** (looks like an email address)
3. Save this for the next step

## Step 3: Configure Firebase Functions

### 3.1 Install Dependencies

```bash
cd functions
npm install
```

This will install the `googleapis` package that was added to `package.json`.

### 3.2 Configure Service Account Credentials

You need to add the service account JSON to Firebase Functions configuration. There are two methods:

#### Method A: Using Firebase Functions Config (Recommended for Production)

```bash
# Set the service account JSON (minified as a single line)
firebase functions:config:set google.service_account="$(cat /path/to/service-account-key.json | jq -c)"

# Set the calendar ID
firebase functions:config:set google.calendar_id="your-calendar-id@group.calendar.google.com"
```

**Note**: The `jq -c` command minifies the JSON to a single line. If you don't have `jq`, you can use an online JSON minifier.

#### Method B: Using Environment Variables (For Local Testing)

Create a file `functions/.runtimeconfig.json`:

```json
{
  "google": {
    "service_account": {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "your-private-key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "fixnero-calendar-sync@your-project-id.iam.gserviceaccount.com",
      "client_id": "your-client-id",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
    },
    "calendar_id": "your-calendar-id@group.calendar.google.com"
  }
}
```

**Important**: Add `.runtimeconfig.json` to `.gitignore` to prevent committing credentials!

### 3.3 Verify Configuration

```bash
# Check that configuration is set
firebase functions:config:get

# You should see:
# {
#   "google": {
#     "service_account": "{...}",
#     "calendar_id": "your-calendar-id@group.calendar.google.com"
#   },
#   "recaptcha": {
#     "secret": "..."
#   }
# }
```

## Step 4: Deploy Firebase Functions

Deploy the updated functions to Firebase:

```bash
firebase deploy --only functions
```

This will deploy:
- `onBookingCreated` - Syncs new bookings to Google Calendar
- `onBookingUpdated` - Updates Google Calendar when bookings change
- `onBookingDeleted` - Removes events from Google Calendar when bookings are deleted
- `calendarWebhook` - Receives notifications from Google Calendar

## Step 5: Set Up Google Calendar Webhook (Two-Way Sync)

To enable changes from Google Calendar to sync back to Firebase, set up webhook notifications.

### 5.1 Set Up Cloud Pub/Sub Channel

Google Calendar uses Pub/Sub for notifications. You need to set this up manually using the Calendar API.

**Option A: Using curl**

```bash
# Set your variables
CALENDAR_ID="your-calendar-id@group.calendar.google.com"
WEBHOOK_URL="https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook"
ACCESS_TOKEN="your-oauth2-access-token"

# Create a watch request
curl -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/watch" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "fixnero-calendar-sync",
    "type": "web_hook",
    "address": "'${WEBHOOK_URL}'"
  }'
```

**Option B: Using Google Cloud Console**

1. Go to [Google Calendar API reference](https://developers.google.com/calendar/api/v3/reference/events/watch)
2. Use the "Try this API" feature
3. Fill in:
   - **calendarId**: Your calendar ID
   - **Request body**:
     ```json
     {
       "id": "fixnero-calendar-sync",
       "type": "web_hook",
       "address": "https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook"
     }
     ```

### 5.2 Renew Webhook Registration

Google Calendar webhooks expire after some time (typically 1 week to 1 year). You need to renew them periodically.

Consider creating a scheduled Cloud Function to auto-renew:

```javascript
// Add to functions/index.js.js
exports.renewCalendarWebhook = functions.pubsub
    .schedule('every 7 days')
    .onRun(async (context) => {
        // Renew webhook registration
        // Implementation left as an exercise
    });
```

## Step 6: Test the Integration

### 6.1 Test Website → Google Calendar

1. Go to your website booking page
2. Create a test booking
3. Check Google Calendar - you should see the event appear
4. Check Firestore - the booking should have a `googleEventId` field

### 6.2 Test Google Calendar → Website

1. Create a new event directly in Google Calendar
2. Wait a few seconds for the webhook to trigger
3. Check Firestore - a new booking should appear with `syncedFromGoogle: true`
4. Check the website calendar - the booking should appear

### 6.3 Test Updates

1. Update an event in Google Calendar (change time/date)
2. Check Firestore - the booking should be updated
3. Update a booking in Firestore
4. Check Google Calendar - the event should be updated

### 6.4 Test Deletions

1. Delete an event from Google Calendar
2. Check Firestore - the booking should be deleted
3. Delete a booking from Firestore
4. Check Google Calendar - the event should be deleted

## Troubleshooting

### Function Logs

View logs in Firebase Console or using CLI:

```bash
firebase functions:log
```

### Common Issues

#### 1. "Calendar not configured" in logs

**Solution**: Verify that `google.service_account` and `google.calendar_id` are set in Firebase config.

```bash
firebase functions:config:get
```

#### 2. "403 Forbidden" when accessing Calendar

**Solution**: Ensure the service account has been shared with the calendar and has "Make changes to events" permission.

#### 3. Webhook not receiving notifications

**Solution**: 
- Verify the webhook URL is correct
- Check that the webhook registration hasn't expired
- Ensure the Cloud Function is deployed and accessible

#### 4. Events not syncing from Google Calendar

**Solution**:
- Manually trigger the sync function for testing
- Check webhook logs in Firebase Functions
- Verify the calendar ID is correct

### Manual Sync Trigger

For testing, you can manually trigger a sync:

```bash
# Call the webhook endpoint manually
curl -X POST https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook \
  -H "x-goog-resource-state: exists" \
  -H "x-goog-channel-id: test-channel" \
  -H "x-goog-resource-id: test-resource"
```

## Security Considerations

1. **Never commit service account keys** to version control
2. **Use Firebase Functions config** for production credentials
3. **Limit service account permissions** to only Calendar API
4. **Monitor API usage** in Google Cloud Console
5. **Set up alerts** for unusual activity

## Cost Considerations

- **Google Calendar API**: Free tier includes 1,000,000 queries per day
- **Firebase Functions**: Pay only for function executions
- **Firestore**: Pay for reads/writes (minimal with proper caching)

Estimated monthly cost for typical usage (100 bookings/month): **$0-1**

## Maintenance

### Regular Tasks

1. **Monitor webhook expiration** and renew as needed
2. **Check function logs** for errors
3. **Review API quotas** in Google Cloud Console
4. **Test sync** after any calendar changes

### Updates

When updating the integration:

1. Test changes in a development environment first
2. Deploy functions during low-traffic periods
3. Monitor logs for errors after deployment
4. Have a rollback plan ready

## Support

For issues or questions:
- Check Firebase Functions logs
- Review Google Calendar API documentation
- Contact the development team

---

**Last Updated**: 2025-11-19
**Integration Version**: 1.0.0
