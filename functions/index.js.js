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

// reCAPTCHA Secret Key - should be stored in Firebase environment config
// Set with: firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY"
const RECAPTCHA_SECRET = functions.config().recaptcha?.secret || process.env.RECAPTCHA_SECRET;

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
        
        // Validate reCAPTCHA if secret key is configured
        if (RECAPTCHA_SECRET && recaptcha) {
            try {
                const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
                const verifyResponse = await axios.post(verifyUrl, null, {
                    params: {
                        secret: RECAPTCHA_SECRET,
                        response: recaptcha
                    }
                });
                
                if (!verifyResponse.data.success) {
                    console.error("reCAPTCHA verification failed:", verifyResponse.data['error-codes']);
                    return res.status(401).json({ 
                        error: "reCAPTCHA verification failed",
                        details: verifyResponse.data['error-codes']
                    });
                }
            } catch (error) {
                console.error("Error verifying reCAPTCHA:", error);
                // Log error but don't block booking if reCAPTCHA service is down
                // In production, you might want to block the booking instead
                console.warn("Proceeding with booking despite reCAPTCHA verification error");
            }
        } else if (!RECAPTCHA_SECRET) {
            console.warn("reCAPTCHA secret not configured - skipping server-side validation");
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
        
        // Sanitize user inputs for email
        const safeName = sanitizeText(name);
        const safeAika = sanitizeText(aika);
        const safeTotalPrice = sanitizeText(totalPrice);
        
        // Tallenna varaus Firestoreen with structured service data
        admin.firestore().collection("varaukset").add({
            name,
            email,
            phone,
            aika,
            services, // Array of service objects with serviceName, taskName, price, numericPrice
            totalPrice, // Formatted total price string (e.g., "alkaen 75 €")
            totalNumericPrice, // Numeric total for calculations and sorting
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }).then(doc => {
            // Luo "mail"-dokumentti sähköpostitriggerille (to array!)
            admin.firestore().collection("mail").add({
                to: [email], // ARRAY, extension vaatii tätä!
                message: {
                    subject: "Varausvahvistus – Fixnero",
                    text: `Hei ${safeName},\n\nKiitos paljon tekemästäsi varauksesta! Sinulle on vahvistettu varaus ajalle ${safeAika}.\n\nValitut palvelut:\n${serviceListText}\n\nYhteensä: ${safeTotalPrice}\n\nTervetuloa asiakkaaksemme!\n\nYstävällisin terveisin,\nFixnero-tiimi\n\nPuhelin: 040 1935001\nSähköposti: info@fixnero.fi\nOsoite: Tiilenvalajantie 6, 02330 Espoo\nAukioloajat: Arkisin 9:00-17:00, viikonloppuisin suljettu`,
                    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">Hei ${escapeHtml(safeName)},</h2>
                        <p>Kiitos paljon tekemästäsi varauksesta! Sinulle on vahvistettu varaus ajalle <strong>${escapeHtml(safeAika)}</strong>.</p>
                        
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