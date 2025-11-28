# Rajala Services - Firebase Functions

This directory contains Firebase Cloud Functions (Gen2) for the Rajala Services booking system.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- Firebase CLI: `npm install -g firebase-tools`

### Installation

```bash
cd functions
npm install
```

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your configuration values:
```env
# NOTE: RECAPTCHA_SECRET must be set via Secret Manager, not in .env!
# See: firebase functions:secrets:set RECAPTCHA_SECRET
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
```

### Local Development

Start the Firebase emulator:
```bash
# From project root
firebase emulators:start
```

The emulator will be available at:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Emulator UI: http://localhost:4000

## 📦 Available Functions

### HTTP Functions

#### `bookings` (GET)
Fetches all bookings from Firestore.

**Endpoint**: `GET /bookings`

**Response**:
```json
[
  {
    "id": "booking123",
    "aika": "2024-12-01T10:00:00.000Z",
    "nimi": "John Doe",
    "sahkoposti": "john@example.com",
    "puhelin": "+358 401234567",
    "services": [...],
    "totalPrice": "100€"
  }
]
```

#### `book` (POST)
Creates a new booking with validation and reCAPTCHA verification.

**Endpoint**: `POST /book`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+358 401234567",
  "aika": "2024-12-01T10:00:00.000Z",
  "services": [
    {
      "serviceName": "Pesupalvelut",
      "taskName": "Ulkopesu",
      "price": "50€"
    }
  ],
  "totalPrice": "50€",
  "totalNumericPrice": 50,
  "recaptcha": "recaptcha_token_here"
}
```

**Response**:
```json
{
  "success": true,
  "id": "booking123",
  "message": "Varaus onnistui"
}
```

#### `calendarWebhook` (POST)
Receives notifications from Google Calendar for synchronization.

**Endpoint**: `POST /calendarWebhook`

### Firestore Triggers

#### `onBookingCreated`
Automatically sends confirmation email to customer when a new booking is created.

**Trigger**: `varaukset/{bookingId}` document creation

#### `onBookingUpdated`
Automatically syncs booking updates to Google Calendar.

**Trigger**: `varaukset/{bookingId}` document update

#### `onBookingDeleted`
Removes deleted bookings from Google Calendar.

**Trigger**: `varaukset/{bookingId}` document deletion

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Storage |
|----------|-------------|----------|---------|
| `RECAPTCHA_SECRET` | reCAPTCHA v3 secret key from Google | Yes | **Secret Manager only** |
| `EMAIL_USER` | Gmail account for sending confirmation emails | Yes** | `.env` or Secret Manager |
| `EMAIL_PASSWORD` | Gmail App Password (not regular password) | Yes** | Secret Manager recommended |
| `EMAIL_FROM` | Display name and email for sent emails | Optional** | `.env` |
| `GOOGLE_SERVICE_ACCOUNT` | Google service account JSON (stringified) | Optional* | `.env` or Secret Manager |
| `GOOGLE_CALENDAR_ID` | Google Calendar ID for sync | Optional* | `.env` |
| `WATCH_CALLBACK_URL` | Calendar webhook callback URL | Optional* | `.env` |

*Optional: Google Calendar sync features will be disabled if not configured
**Required for email confirmations: Email features will be disabled if not configured

> ⚠️ **IMPORTANT / TÄRKEÄÄ:** `RECAPTCHA_SECRET` must ONLY be set via Secret Manager!
> Do not add it to the `.env` file, as this will cause deployment failures.
> See: [docs/SECRET_MANAGER.md](../docs/SECRET_MANAGER.md) (in Finnish)

### Setting Production Variables

```bash
# RECAPTCHA_SECRET - Must use Secret Manager (required)
firebase functions:secrets:set RECAPTCHA_SECRET

# Optional: Other secrets can also use Secret Manager
firebase functions:secrets:set EMAIL_PASSWORD
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
```

## 🚢 Deployment

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Function
```bash
firebase deploy --only functions:bookings
firebase deploy --only functions:book
```

## 🧪 Testing

### Manual Testing with curl

```bash
# Test bookings endpoint
curl http://localhost:5001/your-project/us-central1/bookings

# Test book endpoint
curl -X POST http://localhost:5001/your-project/us-central1/book \
  -H "Content-Type: application/json" \
  -d @test-booking.json
```

### Emulator Testing

1. Start the emulator: `firebase emulators:start`
2. Open the Emulator UI: http://localhost:4000
3. Use the Firestore tab to create/update/delete documents
4. Watch function logs in the Functions tab

## 📚 Documentation

- [Secret Manager Guide](../docs/SECRET_MANAGER.md) - **IMPORTANT:** Secret management instructions (in Finnish)
- [Email Configuration Guide](../EMAIL_CONFIGURATION.md) - Complete email setup instructions
- [Gen2 Migration Guide](../FIREBASE_FUNCTIONS_GEN2_MIGRATION.md) - Complete migration documentation
- [Migration Summary](../FIREBASE_GEN2_MIGRATION_SUMMARY.md) - Quick overview of changes
- [Firebase Functions Docs](https://firebase.google.com/docs/functions) - Official documentation

## 🔒 Security

- All endpoints use CORS protection
- reCAPTCHA v3 verification for booking submissions
- Input validation for email and phone numbers
- Business hours and date validation
- Secure environment variable handling

## 🐛 Troubleshooting

### Functions not starting locally
- Ensure all dependencies are installed: `npm install`
- Check `.env` file exists with required variables
- Verify Firebase CLI is up to date: `npm install -g firebase-tools@latest`

### CORS errors
- Verify the requesting origin is in `ALLOWED_ORIGINS` array
- For local testing, you may need to temporarily add `http://localhost:*`

### Environment variables not found
- Local: Check `.env` file exists in `functions/` directory
- Production: Verify secrets are set with `firebase functions:config:get`

## 🏗️ Architecture

```
functions/
├── index.js              # Main functions file (Gen2)
├── package.json          # Dependencies
├── .env                  # Local environment variables (gitignored)
├── .env.example          # Environment variable template
└── node_modules/         # Dependencies (gitignored)
```

## 📝 Code Quality

- ✅ ESLint compatible
- ✅ JSDoc comments for all functions
- ✅ Error handling with try-catch blocks
- ✅ Consistent 2-space indentation
- ✅ Security scanned with CodeQL

## 🔄 Version History

### v2.0.0 (Nov 22, 2024)
- Migrated all functions to Gen2 syntax
- Replaced `functions.config()` with environment variables
- Added native CORS support
- Improved error handling
- Added comprehensive documentation

### v1.0.0
- Initial implementation with Gen1 syntax

## 📞 Support

For issues or questions:
1. Check the [troubleshooting guide](../FIREBASE_FUNCTIONS_GEN2_MIGRATION.md#troubleshooting)
2. Review function logs in Firebase Console
3. Check the emulator logs for local testing

---

**Last Updated**: November 22, 2024  
**Firebase Functions Version**: Gen2  
**Node.js Version**: 20
