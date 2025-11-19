# Hybrid Calendar Solution - Implementation Guide

## Overview

This document outlines the implementation of a hybrid calendar solution that combines Firebase Realtime Database, FullCalendar UI, and Google Calendar API to create a responsive, lightweight, and professional two-way synchronized appointment system.

## Architecture

### Components

1. **FullCalendar (UI Layer)**
   - Client-side calendar visualization
   - Responsive design for desktop and mobile
   - Shows 2 months (current + next) with weekends hidden
   - Real-time updates from Firebase

2. **Firebase Realtime Database (Data Layer)**
   - Central data store for all appointments
   - Real-time synchronization with clients
   - Unique appointment identifiers
   - Event listeners for changes

3. **Google Calendar API (External Sync)**
   - Two-way synchronization with Google Calendar
   - OAuth2 authentication
   - Webhook notifications for changes
   - API for creating/updating/deleting events

### Data Flow

```
User creates appointment on website
    ↓
Save to Firebase Realtime Database (with unique ID)
    ↓
Push to Google Calendar via API
    ↓
Store Google Calendar Event ID in Firebase
    ↓
Update FullCalendar UI via Firebase listener

---

Admin/User modifies event in Google Calendar
    ↓
Google sends webhook notification
    ↓
Firebase Function receives webhook
    ↓
Update Firebase Realtime Database
    ↓
FullCalendar UI updates automatically
```

## Implementation Plan

### Phase 1: Google Calendar API Setup

#### 1.1 Google Cloud Console Setup

**Steps:**
1. Create/access Google Cloud Project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Configure OAuth consent screen
5. Add authorized redirect URIs

**Files to Create:**
- `google-calendar-config.json` (gitignored - contains secrets)
- `docs/GOOGLE_CALENDAR_SETUP.md` (setup instructions)

#### 1.2 OAuth2 Implementation

**New Files:**
- `functions/google-auth.js` - OAuth2 flow implementation
- `functions/google-calendar-service.js` - Calendar API wrapper

**Features:**
- Server-side OAuth2 flow
- Token storage in Firebase (encrypted)
- Automatic token refresh
- Error handling and retry logic

### Phase 2: Firebase Schema Design

#### 2.1 Realtime Database Structure

```json
{
  "appointments": {
    "{appointmentId}": {
      "id": "unique-uuid",
      "googleCalendarId": "google-event-id",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerPhone": "+358401234567",
      "services": [
        {
          "category": "tire",
          "serviceName": "Rengastyöt",
          "taskName": "Renkaiden vaihto",
          "price": "alkaen 35 €"
        }
      ],
      "startTime": "2024-12-01T09:00:00.000Z",
      "endTime": "2024-12-01T10:00:00.000Z",
      "status": "confirmed",
      "totalPrice": "alkaen 35 €",
      "createdAt": "2024-11-19T10:00:00.000Z",
      "updatedAt": "2024-11-19T10:00:00.000Z",
      "syncStatus": "synced"
    }
  },
  "calendar_sync": {
    "lastSyncTime": "2024-11-19T10:00:00.000Z",
    "syncErrors": []
  }
}
```

#### 2.2 Security Rules

```json
{
  "rules": {
    "appointments": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Phase 3: Google Calendar Integration

#### 3.1 Calendar Event Creation

**Function:** `createGoogleCalendarEvent(appointmentData)`

**Features:**
- Create event in Google Calendar
- Include customer info in description
- Set proper timezone (Europe/Helsinki)
- Return Google Calendar event ID

**File:** `functions/google-calendar-service.js`

```javascript
async function createGoogleCalendarEvent(appointmentData) {
  const event = {
    summary: `${appointmentData.services[0].serviceName} - ${appointmentData.customerName}`,
    description: formatEventDescription(appointmentData),
    start: {
      dateTime: appointmentData.startTime,
      timeZone: 'Europe/Helsinki'
    },
    end: {
      dateTime: appointmentData.endTime,
      timeZone: 'Europe/Helsinki'
    }
  };
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event
  });
  
  return response.data.id;
}
```

#### 3.2 Webhook Handler

**Function:** `handleGoogleCalendarWebhook(notification)`

**Features:**
- Receive notifications from Google Calendar
- Fetch changed events
- Update Firebase database
- Handle event deletions

**File:** `functions/index.js.js`

```javascript
exports.googleCalendarWebhook = functions.https.onRequest(async (req, res) => {
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];
  
  if (resourceState === 'sync') {
    return res.status(200).send('OK');
  }
  
  // Fetch and process changes
  await syncGoogleCalendarChanges();
  
  res.status(200).send('OK');
});
```

### Phase 4: FullCalendar Optimizations

#### 4.1 Two-Month View Configuration

**File:** `booking-system.js`

```javascript
calendar = new FullCalendar.Calendar(calendarEl, {
  initialView: 'dayGridMonth',
  visibleRange: {
    start: new Date(),
    end: new Date(new Date().setMonth(new Date().getMonth() + 2))
  },
  hiddenDays: [0, 6], // Hide Sunday and Saturday
  // ... other options
});
```

#### 4.2 Real-time Firebase Sync

```javascript
// Listen for Firebase changes
const appointmentsRef = firebase.database().ref('appointments');
appointmentsRef.on('value', (snapshot) => {
  const appointments = snapshot.val();
  updateCalendarEvents(appointments);
});
```

### Phase 5: Conflict Resolution

#### 5.1 Double Booking Prevention

**Strategy:**
1. Check Firebase for existing appointments at selected time
2. Check Google Calendar for conflicts
3. Only allow booking if both are clear
4. Use Firebase transactions for atomicity

**Implementation:**

```javascript
async function checkTimeSlotAvailability(startTime) {
  // Check Firebase
  const firebaseCheck = await checkFirebaseAvailability(startTime);
  
  // Check Google Calendar
  const googleCheck = await checkGoogleCalendarAvailability(startTime);
  
  return firebaseCheck && googleCheck;
}
```

### Phase 6: Performance Optimization

#### 6.1 Data Caching

- Cache Google Calendar events in Firebase
- Update cache every 5 minutes via scheduled function
- Reduce API calls during high traffic

#### 6.2 API Call Batching

- Batch multiple Firebase updates
- Use Google Calendar batch API when available
- Implement exponential backoff for retries

### Phase 7: Testing Strategy

#### 7.1 Unit Tests

- Test Google Calendar API wrapper functions
- Test Firebase database operations
- Test conflict detection logic

#### 7.2 Integration Tests

- Test full booking flow (Website → Firebase → Google Calendar)
- Test sync flow (Google Calendar → Firebase → Website)
- Test conflict scenarios

#### 7.3 Manual Testing

- Create appointment on website
- Verify it appears in Google Calendar
- Modify event in Google Calendar
- Verify changes reflect on website
- Delete event in Google Calendar
- Verify deletion on website

## Security Considerations

### 1. OAuth2 Token Security

- Store tokens encrypted in Firebase
- Use environment variables for client secrets
- Implement token rotation
- Monitor for unauthorized access

### 2. API Rate Limiting

- Implement rate limiting on booking endpoints
- Use Firebase quota management
- Monitor API usage

### 3. Data Validation

- Validate all input data
- Sanitize customer information
- Verify reCAPTCHA tokens
- Check for SQL injection attempts

## Monitoring and Maintenance

### 1. Logging

- Log all Google Calendar API calls
- Log sync operations
- Track errors and retries
- Monitor webhook notifications

### 2. Error Handling

- Graceful degradation if Google Calendar is unavailable
- Retry failed sync operations
- Alert admin of sync failures
- Provide user-friendly error messages

### 3. Health Checks

- Monitor Firebase connection
- Check Google Calendar API availability
- Verify webhook channel is active
- Test end-to-end booking flow daily

## Documentation

### Files to Create

1. `docs/GOOGLE_CALENDAR_SETUP.md` - Google Cloud setup guide
2. `docs/OAUTH2_CONFIGURATION.md` - OAuth2 setup instructions
3. `docs/MAINTENANCE_GUIDE.md` - System maintenance guide
4. `docs/TROUBLESHOOTING.md` - Common issues and solutions
5. `docs/API_REFERENCE.md` - API endpoint documentation

## Deployment Checklist

- [ ] Google Cloud Project created
- [ ] Calendar API enabled
- [ ] OAuth2 credentials configured
- [ ] Firebase Functions deployed
- [ ] Database schema created
- [ ] Security rules applied
- [ ] Webhook channel established
- [ ] Initial sync completed
- [ ] Testing completed
- [ ] Documentation finalized
- [ ] Monitoring set up

## Timeline Estimate

- Phase 1: Google Calendar Setup - 2 hours
- Phase 2: Firebase Schema - 1 hour
- Phase 3: API Integration - 4 hours
- Phase 4: UI Optimization - 2 hours
- Phase 5: Conflict Resolution - 2 hours
- Phase 6: Performance Optimization - 2 hours
- Phase 7: Testing - 3 hours
- Documentation - 2 hours

**Total:** ~18 hours

## Support and Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Firebase Realtime Database Guide](https://firebase.google.com/docs/database)
- [FullCalendar Documentation](https://fullcalendar.io/docs)
- [OAuth 2.0 Guide](https://oauth.net/2/)

---

**Last Updated:** 2024-11-19
**Status:** Implementation in progress
