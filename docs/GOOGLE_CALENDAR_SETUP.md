# Google Calendar API Setup Guide

This guide will walk you through setting up Google Calendar API integration for the hybrid calendar solution.

## Prerequisites

- Google Account (with Google Calendar access)
- Firebase project with billing enabled  
- Admin access to the Firebase Console

## Quick Setup Steps

### 1. Create Google Cloud Project and Enable API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Fixnero Calendar Sync"
3. Enable Google Calendar API

### 2. Create OAuth 2.0 Credentials

1. Configure OAuth consent screen
2. Add scopes: `calendar` and `calendar.events`
3. Create OAuth Client ID (Web application)
4. Add redirect URI: `https://us-central1-fxnr-web.cloudfunctions.net/oauth2callback`
5. Copy Client ID and Client Secret

### 3. Configure Firebase Environment

```bash
firebase functions:config:set \
  google.client_id="YOUR_CLIENT_ID" \
  google.client_secret="YOUR_CLIENT_SECRET"
```

### 4. Deploy Functions

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

### 5. Authorize

Visit: `https://us-central1-fxnr-web.cloudfunctions.net/generateAuthUrl`

## Verification

Check status: `https://us-central1-fxnr-web.cloudfunctions.net/checkAuthStatus`

---

For detailed instructions, see HYBRID_CALENDAR_IMPLEMENTATION.md
