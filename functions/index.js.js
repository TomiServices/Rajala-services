const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

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