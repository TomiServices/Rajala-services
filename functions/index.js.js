const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { google } = require("googleapis");

// Configure CORS to explicitly allow the production domain
const cors = require("cors")({
    origin: [
        "https://www.rajala-services.com",
        "https://rajala-services.com",
        "https://fxnr-web.web.app",
        "https://fxnr-web.firebaseapp.com"
    ],
    credentials: true,
    optionsSuccessStatus: 200
});

admin.initializeApp();

// ============================================================================
// GOOGLE CALENDAR CONFIGURATION
// ============================================================================

/**
 * Initialize Google Calendar API client with service account credentials
 * Service account credentials should be stored in Firebase Functions config
 * Set with: firebase functions:config:set google.calendar_id="YOUR_CALENDAR_ID"
 *           firebase functions:config:set google.service_account="$(cat service-account-key.json)"
 */
function getCalendarClient() {
    try {
        const serviceAccount = functions.config().google?.service_account;
        const calendarId = functions.config().google?.calendar_id;
        
        if (!serviceAccount || !calendarId) {
            console.warn("Google Calendar not configured - service account or calendar ID missing");
            return null;
        }
        
        // Parse service account JSON if it's a string
        const credentials = typeof serviceAccount === 'string' 
            ? JSON.parse(serviceAccount) 
            : serviceAccount;
        
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar']
        });
        
        const calendar = google.calendar({ version: 'v3', auth });
        
        return { calendar, calendarId };
    } catch (error) {
        console.error("Error initializing Google Calendar client:", error);
        return null;
    }
}

/**
 * Create or update an event in Google Calendar
 * @param {object} booking - Booking data from Firestore
 * @param {string} bookingId - Firestore document ID
 * @returns {Promise<string|null>} - Google Calendar event ID or null on failure
 */
async function syncToGoogleCalendar(booking, bookingId) {
    const client = getCalendarClient();
    if (!client) {
        console.log("Google Calendar not configured, skipping sync");
        return null;
    }
    
    const { calendar, calendarId } = client;
    
    try {
        // Parse the booking time
        const startTime = new Date(booking.aika);
        // Default duration: 1 hour
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        
        // Build service list description
        const serviceList = booking.services
            .map(s => `${s.serviceName} - ${s.taskName}: ${s.price}`)
            .join('\n');
        
        const event = {
            summary: `Varaus: ${booking.name}`,
            description: `Asiakas: ${booking.name}\nPuhelin: ${booking.phone}\nSähköposti: ${booking.email}\n\nPalvelut:\n${serviceList}\n\nYhteensä: ${booking.totalPrice}\n\n[Firestore ID: ${bookingId}]`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'Europe/Helsinki',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'Europe/Helsinki',
            },
            colorId: '11', // Red color for bookings
        };
        
        // Check if this booking already has a Google Calendar event ID
        if (booking.googleEventId) {
            // Update existing event
            const response = await calendar.events.update({
                calendarId: calendarId,
                eventId: booking.googleEventId,
                requestBody: event,
            });
            console.log(`Updated Google Calendar event: ${response.data.id}`);
            return response.data.id;
        } else {
            // Create new event
            const response = await calendar.events.insert({
                calendarId: calendarId,
                requestBody: event,
            });
            console.log(`Created Google Calendar event: ${response.data.id}`);
            return response.data.id;
        }
    } catch (error) {
        console.error("Error syncing to Google Calendar:", error);
        return null;
    }
}

/**
 * Delete an event from Google Calendar
 * @param {string} googleEventId - Google Calendar event ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFromGoogleCalendar(googleEventId) {
    const client = getCalendarClient();
    if (!client) {
        console.log("Google Calendar not configured, skipping delete");
        return false;
    }
    
    const { calendar, calendarId } = client;
    
    try {
        await calendar.events.delete({
            calendarId: calendarId,
            eventId: googleEventId,
        });
        console.log(`Deleted Google Calendar event: ${googleEventId}`);
        return true;
    } catch (error) {
        if (error.code === 404) {
            console.log(`Google Calendar event not found: ${googleEventId}`);
            return true; // Already deleted
        }
        console.error("Error deleting from Google Calendar:", error);
        return false;
    }
}

// reCAPTCHA Secret Key - FREE v3 version (NOT Enterprise)
// Should be stored in Firebase environment config
// Set with: firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY"
// IMPORTANT: Secret key must match site key 6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM
const RECAPTCHA_SECRET = functions.config().recaptcha?.secret || process.env.RECAPTCHA_SECRET;

// reCAPTCHA v3 score threshold (0.0 - 1.0)
// Lower threshold = more permissive, Higher threshold = more strict
// Recommended: 0.5 for general use, adjust based on your needs
const RECAPTCHA_SCORE_THRESHOLD = 0.5;

// VARAUKSEN TEKO JA SÄHKÖPOSTI
exports.book = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Handle OPTIONS preflight request
        if (req.method === "OPTIONS") {
            return res.status(200).end();
        }
        
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }
        const { name, email, phone, aika, services, totalPrice, totalNumericPrice, recaptcha } = req.body;
        
        // Validate reCAPTCHA v3 if secret key is configured
        // Using FREE reCAPTCHA v3 siteverify API (NOT Enterprise)
        if (RECAPTCHA_SECRET && recaptcha) {
            try {
                // Free reCAPTCHA v3 verification endpoint (same URL as v2)
                const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
                const verifyResponse = await axios.post(verifyUrl, null, {
                    params: {
                        secret: RECAPTCHA_SECRET,
                        response: recaptcha
                    }
                });
                
                if (!verifyResponse.data.success) {
                    console.error("reCAPTCHA verification failed:", verifyResponse.data['error-codes']);
                    const errorCodes = verifyResponse.data['error-codes'] || [];
                    let finnishError = "Turvavarmennus epäonnistui.";
                    
                    if (errorCodes.includes('timeout-or-duplicate')) {
                        finnishError = "Turvavarmennus vanhentunut tai käytetty jo. Yritä uudelleen.";
                    } else if (errorCodes.includes('invalid-input-response')) {
                        finnishError = "Virheellinen turvavarmennustunnus. Päivitä sivu ja yritä uudelleen.";
                    } else if (errorCodes.includes('missing-input-response')) {
                        finnishError = "Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen.";
                    }
                    
                    return res.status(401).json({ 
                        error: finnishError,
                        technicalDetails: verifyResponse.data['error-codes']
                    });
                }
                
                // v3 returns a score (0.0 - 1.0) indicating likelihood of being human
                // Higher score = more likely human, lower score = more likely bot
                const score = verifyResponse.data.score;
                const action = verifyResponse.data.action;
                
                console.log(`reCAPTCHA v3 score: ${score}, action: ${action}`);
                
                if (score < RECAPTCHA_SCORE_THRESHOLD) {
                    console.warn(`reCAPTCHA score ${score} below threshold ${RECAPTCHA_SCORE_THRESHOLD}`);
                    return res.status(401).json({ 
                        error: "Turvavarmennus epäonnistui. Jos ongelma jatkuu, ota yhteyttä asiakaspalveluun.",
                        technicalDetails: `Score ${score} below threshold ${RECAPTCHA_SCORE_THRESHOLD}`
                    });
                }
                
                // Optional: Verify the action matches what we expect
                if (action !== 'booking') {
                    console.warn(`reCAPTCHA action mismatch: expected 'booking', got '${action}'`);
                }
                
            } catch (error) {
                console.error("Error verifying reCAPTCHA:", error);
                // Return error to user instead of silently proceeding
                return res.status(500).json({
                    error: "Turvavarmennuspalvelun yhteysvirhe. Yritä hetken kuluttua uudelleen.",
                    technicalDetails: error.message
                });
            }
        } else if (!RECAPTCHA_SECRET) {
            console.warn("reCAPTCHA secret not configured - skipping server-side validation");
        } else if (!recaptcha) {
            // No recaptcha token provided by frontend
            return res.status(401).json({
                error: "Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen."
            });
        }
        
        // Validate required fields - services should be an array
        if (!name || !email || !phone || !aika || !services || !Array.isArray(services) || services.length === 0) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Helper function to escape HTML to prevent XSS attacks
        function escapeHtml(unsafe) {
            // Handle null and undefined explicitly
            if (unsafe === null || unsafe === undefined) return '';
            // Convert to string if not already
            const str = String(unsafe);
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        
        // Helper function to sanitize text for email to prevent injection
        function sanitizeText(text) {
            if (typeof text !== 'string') return '';
            // Remove any control characters and limit to printable characters
            return text.replace(/[\x00-\x1F\x7F]/g, '').trim();
        }
        
        // Build formatted service list for email display with proper escaping
        const serviceListHtml = services.map(service => 
            `<li><strong>${escapeHtml(service.serviceName)}</strong> - ${escapeHtml(service.taskName)}: ${escapeHtml(service.price)}</li>`
        ).join('');
        
        const serviceListText = services.map(service => 
            `  - ${sanitizeText(service.serviceName)} - ${sanitizeText(service.taskName)}: ${sanitizeText(service.price)}`
        ).join('\n');
        
        // Format date and time in the required format: 'klo 12:00 11.11.2025'
        function formatDateTime(aikaISO) {
            const date = new Date(aikaISO);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `klo ${hours}:${minutes} ${day}.${month}.${year}`;
        }
        
        // Sanitize user inputs for email
        const safeName = sanitizeText(name);
        const formattedDateTime = formatDateTime(aika);
        const safeFormattedDateTime = sanitizeText(formattedDateTime);
        const safeTotalPrice = sanitizeText(totalPrice);
        
        // Extract date and time components from aika ISO string
        const bookingDate = new Date(aika);
        const bookingDateString = `${bookingDate.getDate()}.${bookingDate.getMonth() + 1}.${bookingDate.getFullYear()}`;
        const bookingTimeString = `${String(bookingDate.getHours()).padStart(2, '0')}:${String(bookingDate.getMinutes()).padStart(2, '0')}`;
        
        // Tallenna varaus Firestoreen with structured service data
        admin.firestore().collection("varaukset").add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(), // When booking was made
            name,
            email,
            phone,
            aika, // Full datetime ISO string (kept for backward compatibility)
            selectedDate: bookingDateString, // Date customer selected (DD.MM.YYYY)
            selectedTime: bookingTimeString, // Time customer selected (HH:MM)
            services, // Array of service objects with category, serviceName, taskName, price, numericPrice
            totalPrice, // Formatted total price string (e.g., "alkaen 75 €")
            totalNumericPrice // Numeric total for calculations and sorting
        }).then(doc => {
            // Luo "mail"-dokumentti sähköpostitriggerille (to array!)
            admin.firestore().collection("mail").add({
                to: [email], // ARRAY, extension vaatii tätä!
                message: {
                    subject: "Varausvahvistus – Fixnero",
                    text: `Hei ${safeName},\n\nKiitos paljon tekemästäsi varauksesta! Sinulle on vahvistettu varaus ajalle ${safeFormattedDateTime}.\n\nValitut palvelut:\n${serviceListText}\n\nYhteensä: ${safeTotalPrice}\n\nTervetuloa asiakkaaksemme!\n\nYstävällisin terveisin,\nFixnero-tiimi\n\nVerkkosivu: www.fixnero.fi\nPuhelin: 040 1935001\nSähköposti: info@fixnero.fi\nOsoite: Tiilenvalajantie 6, 02330 Espoo\nAukioloajat: Arkisin 9:00-17:00, viikonloppuisin suljettu`,
                    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">Hei ${escapeHtml(safeName)},</h2>
                        <p>Kiitos paljon tekemästäsi varauksesta! Sinulle on vahvistettu varaus ajalle <strong>${escapeHtml(safeFormattedDateTime)}</strong>.</p>
                        
                        <h3 style="color: #333; margin-top: 20px;">Valitut palvelut:</h3>
                        <ul style="list-style-type: none; padding: 0;">
                            ${serviceListHtml}
                        </ul>
                        
                        <p style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #4CAF50; font-size: 16px;">
                            <strong>Yhteensä:</strong> ${escapeHtml(safeTotalPrice)}
                        </p>
                        
                        <p style="margin-top: 20px;">Tervetuloa asiakkaaksemme!</p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p style="margin: 0;"><strong>Ystävällisin terveisin,</strong><br>Fixnero-tiimi</p>
                        <p style="margin-top: 15px; color: #666;">
                            <strong>Verkkosivu:</strong> <a href="https://www.fixnero.fi" style="color: #4CAF50;">www.fixnero.fi</a><br>
                            <strong>Puhelin:</strong> 040 1935001<br>
                            <strong>Sähköposti:</strong> <a href="mailto:info@fixnero.fi" style="color: #4CAF50;">info@fixnero.fi</a><br>
                            <strong>Osoite:</strong> Tiilenvalajantie 6, 02330 Espoo<br>
                            <strong>Aukioloajat:</strong> Arkisin 9:00-17:00, viikonloppuisin suljettu
                        </p>
                    </div>`
                }
            }).then(() => {
                res.json({ success: true, id: doc.id });
            }).catch(error => {
                console.error("Failed to create mail doc:", error);
                res.json({ success: true, id: doc.id, emailError: error.message });
            });
        }).catch(error => {
            console.error("Error creating booking:", error);
            res.status(500).json({ 
                error: error.message,
                timestamp: new Date().toISOString()
            });
        });
    });
});

// KALENTERIN VARAUKSET
exports.bookings = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Handle OPTIONS preflight request
        if (req.method === "OPTIONS") {
            return res.status(200).end();
        }
        
        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        }
        
        try {
            const snapshot = await admin.firestore().collection("varaukset").get();
            const bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });
            
            // Add cache control headers to reduce load
            res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
            res.json(bookings);
        } catch (error) {
            console.error("Error fetching bookings:", error);
            res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
        }
    });
});

// ============================================================================
// GOOGLE CALENDAR SYNC - FIRESTORE TRIGGERS
// ============================================================================

/**
 * Firestore trigger: When a booking is created, sync to Google Calendar
 */
exports.onBookingCreated = functions.firestore
    .document('varaukset/{bookingId}')
    .onCreate(async (snapshot, context) => {
        const booking = snapshot.data();
        const bookingId = context.params.bookingId;
        
        console.log(`New booking created: ${bookingId}`);
        
        // Sync to Google Calendar
        const googleEventId = await syncToGoogleCalendar(booking, bookingId);
        
        // Store the Google Calendar event ID in Firestore
        if (googleEventId) {
            try {
                await snapshot.ref.update({
                    googleEventId: googleEventId,
                    googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Stored Google Calendar event ID for booking ${bookingId}`);
            } catch (error) {
                console.error(`Error storing Google Calendar event ID:`, error);
            }
        }
    });

/**
 * Firestore trigger: When a booking is updated, sync to Google Calendar
 */
exports.onBookingUpdated = functions.firestore
    .document('varaukset/{bookingId}')
    .onUpdate(async (change, context) => {
        const bookingBefore = change.before.data();
        const bookingAfter = change.after.data();
        const bookingId = context.params.bookingId;
        
        // Skip if this update was triggered by us adding the googleEventId
        if (!bookingBefore.googleEventId && bookingAfter.googleEventId && !bookingBefore.googleSyncedAt) {
            console.log(`Skipping Google Calendar sync - update was from sync itself`);
            return null;
        }
        
        console.log(`Booking updated: ${bookingId}`);
        
        // Sync to Google Calendar
        const googleEventId = await syncToGoogleCalendar(bookingAfter, bookingId);
        
        // Update the sync timestamp
        if (googleEventId && googleEventId !== bookingAfter.googleEventId) {
            try {
                await change.after.ref.update({
                    googleEventId: googleEventId,
                    googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error(`Error updating Google Calendar event ID:`, error);
            }
        }
    });

/**
 * Firestore trigger: When a booking is deleted, remove from Google Calendar
 */
exports.onBookingDeleted = functions.firestore
    .document('varaukset/{bookingId}')
    .onDelete(async (snapshot, context) => {
        const booking = snapshot.data();
        const bookingId = context.params.bookingId;
        
        console.log(`Booking deleted: ${bookingId}`);
        
        // Delete from Google Calendar if it was synced
        if (booking.googleEventId) {
            await deleteFromGoogleCalendar(booking.googleEventId);
        }
    });

// ============================================================================
// GOOGLE CALENDAR WEBHOOK - RECEIVE UPDATES FROM GOOGLE CALENDAR
// ============================================================================

/**
 * Webhook endpoint to receive notifications from Google Calendar
 * This enables two-way sync: Google Calendar → Firebase
 * 
 * Setup instructions:
 * 1. Set up Google Calendar Push Notifications (watch endpoint)
 * 2. Configure webhook URL: https://us-central1-fxnr-web.cloudfunctions.net/calendarWebhook
 * 3. Add webhook verification token in Firebase config
 */
exports.calendarWebhook = functions.https.onRequest(async (req, res) => {
    // Handle webhook verification (sent by Google)
    if (req.headers['x-goog-resource-state'] === 'sync') {
        console.log('Google Calendar webhook verification received');
        return res.status(200).send('OK');
    }
    
    // Handle webhook notifications
    if (req.headers['x-goog-resource-state'] === 'exists') {
        const resourceId = req.headers['x-goog-resource-id'];
        const channelId = req.headers['x-goog-channel-id'];
        
        console.log(`Google Calendar change notification received - Channel: ${channelId}, Resource: ${resourceId}`);
        
        // Fetch recent events from Google Calendar and sync to Firebase
        try {
            await syncGoogleCalendarToFirebase();
            return res.status(200).send('OK');
        } catch (error) {
            console.error('Error processing calendar webhook:', error);
            return res.status(500).send('Error processing webhook');
        }
    }
    
    // Unknown webhook type
    console.log('Unknown webhook notification:', req.headers);
    return res.status(200).send('OK');
});

/**
 * Sync Google Calendar events to Firebase Realtime Database
 * This function fetches events from Google Calendar and creates/updates Firebase bookings
 */
async function syncGoogleCalendarToFirebase() {
    const client = getCalendarClient();
    if (!client) {
        console.log("Google Calendar not configured, skipping sync from Google");
        return;
    }
    
    const { calendar, calendarId } = client;
    
    try {
        // Fetch events from the next 30 days
        const now = new Date();
        const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin: now.toISOString(),
            timeMax: futureDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        const events = response.data.items || [];
        console.log(`Fetched ${events.length} events from Google Calendar`);
        
        // Get all existing bookings from Firestore
        const bookingsSnapshot = await admin.firestore().collection("varaukset").get();
        const existingBookings = new Map();
        bookingsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.googleEventId) {
                existingBookings.set(data.googleEventId, { id: doc.id, ...data });
            }
        });
        
        // Process each Google Calendar event
        for (const event of events) {
            // Skip events that don't have Firestore ID in description (manually created in Google Calendar)
            const firestoreIdMatch = event.description?.match(/\[Firestore ID: ([^\]]+)\]/);
            
            if (!firestoreIdMatch) {
                // This is a new event created directly in Google Calendar
                await createBookingFromGoogleEvent(event);
            } else {
                // This event was synced from Firestore, check if it needs updating
                const firestoreId = firestoreIdMatch[1];
                const existingBooking = existingBookings.get(event.id);
                
                if (existingBooking) {
                    // Event exists in both systems, check if we need to update Firestore
                    await updateBookingFromGoogleEvent(event, firestoreId);
                } else {
                    // Event exists in Google Calendar but not in Firestore
                    console.log(`Event ${event.id} exists in Google Calendar but not in Firestore - creating booking`);
                    await createBookingFromGoogleEvent(event);
                }
                
                // Remove from map (events remaining in map after loop are deleted in Google Calendar)
                existingBookings.delete(event.id);
            }
        }
        
        // Handle events that exist in Firestore but not in Google Calendar (deleted in Google)
        for (const [googleEventId, booking] of existingBookings) {
            console.log(`Event ${googleEventId} deleted in Google Calendar - deleting Firestore booking ${booking.id}`);
            try {
                await admin.firestore().collection("varaukset").doc(booking.id).delete();
            } catch (error) {
                console.error(`Error deleting booking ${booking.id}:`, error);
            }
        }
        
    } catch (error) {
        console.error("Error syncing from Google Calendar:", error);
        throw error;
    }
}

/**
 * Create a Firestore booking from a Google Calendar event
 */
async function createBookingFromGoogleEvent(event) {
    try {
        // Parse event details
        const startTime = new Date(event.start.dateTime || event.start.date);
        
        // Extract customer info from description (if available)
        const description = event.description || '';
        const nameMatch = description.match(/Asiakas: ([^\n]+)/);
        const phoneMatch = description.match(/Puhelin: ([^\n]+)/);
        const emailMatch = description.match(/Sähköposti: ([^\n]+)/);
        
        // Parse services from description
        const servicesMatch = description.match(/Palvelut:\n([\s\S]*?)\n\nYhteensä:/);
        const totalPriceMatch = description.match(/Yhteensä: ([^\n]+)/);
        
        let services = [];
        let totalPrice = "0 €";
        
        if (servicesMatch && servicesMatch[1]) {
            const serviceLines = servicesMatch[1].trim().split('\n');
            services = serviceLines.map(line => {
                const parts = line.split(' - ');
                if (parts.length >= 2) {
                    const [serviceName, rest] = parts;
                    const taskParts = rest.split(': ');
                    return {
                        serviceName: serviceName.trim(),
                        taskName: taskParts[0]?.trim() || '',
                        price: taskParts[1]?.trim() || '0 €',
                        numericPrice: 0
                    };
                }
                return null;
            }).filter(Boolean);
        }
        
        if (totalPriceMatch) {
            totalPrice = totalPriceMatch[1];
        }
        
        // Create booking in Firestore
        const bookingData = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            name: nameMatch ? nameMatch[1] : event.summary || 'Asiakas',
            email: emailMatch ? emailMatch[1] : 'ei.sahkopostia@example.com',
            phone: phoneMatch ? phoneMatch[1] : '',
            aika: startTime.toISOString(),
            selectedDate: `${startTime.getDate()}.${startTime.getMonth() + 1}.${startTime.getFullYear()}`,
            selectedTime: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`,
            services: services.length > 0 ? services : [{ 
                serviceName: 'Palvelu', 
                taskName: event.summary || 'Varaus',
                price: totalPrice,
                numericPrice: 0
            }],
            totalPrice: totalPrice,
            totalNumericPrice: 0,
            googleEventId: event.id,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            syncedFromGoogle: true
        };
        
        const docRef = await admin.firestore().collection("varaukset").add(bookingData);
        console.log(`Created Firestore booking ${docRef.id} from Google Calendar event ${event.id}`);
        
        // Update the Google Calendar event description to include Firestore ID
        const client = getCalendarClient();
        if (client) {
            try {
                await client.calendar.events.patch({
                    calendarId: client.calendarId,
                    eventId: event.id,
                    requestBody: {
                        description: `${description}\n\n[Firestore ID: ${docRef.id}]`
                    }
                });
            } catch (error) {
                console.error(`Error updating Google Calendar event description:`, error);
            }
        }
        
    } catch (error) {
        console.error(`Error creating booking from Google Calendar event:`, error);
    }
}

/**
 * Update a Firestore booking from a Google Calendar event
 */
async function updateBookingFromGoogleEvent(event, firestoreId) {
    try {
        const startTime = new Date(event.start.dateTime || event.start.date);
        
        // Parse event details
        const description = event.description || '';
        const nameMatch = description.match(/Asiakas: ([^\n]+)/);
        
        // Update only if the event time or name has changed
        const updateData = {
            aika: startTime.toISOString(),
            selectedDate: `${startTime.getDate()}.${startTime.getMonth() + 1}.${startTime.getFullYear()}`,
            selectedTime: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`,
            googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (nameMatch) {
            updateData.name = nameMatch[1];
        }
        
        await admin.firestore().collection("varaukset").doc(firestoreId).update(updateData);
        console.log(`Updated Firestore booking ${firestoreId} from Google Calendar event ${event.id}`);
        
    } catch (error) {
        console.error(`Error updating booking from Google Calendar event:`, error);
    }
}