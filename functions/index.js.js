const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// VARAUKSEN TEKO JA SÄHKÖPOSTI
exports.book = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }
        const { name, email, phone, aika, services, totalPrice, totalNumericPrice } = req.body;
        
        // Validate required fields - services should be an array
        if (!name || !email || !phone || !aika || !services || !Array.isArray(services) || services.length === 0) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Build formatted service list for email display
        const serviceListHtml = services.map(service => 
            `<li><strong>${service.serviceName}</strong> - ${service.taskName}: ${service.price}</li>`
        ).join('');
        
        const serviceListText = services.map(service => 
            `  - ${service.serviceName} - ${service.taskName}: ${service.price}`
        ).join('\n');
        
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
                    text: `Hei ${name},\n\nKiitos paljon tekemästäsi varauksesta! Sinulle on vahvistettu varaus ajalle ${aika}.\n\nValitut palvelut:\n${serviceListText}\n\nYhteensä: ${totalPrice}\n\nTervetuloa asiakkaaksemme!\n\nYstävällisin terveisin,\nFixnero-tiimi\n\nPuhelin: 040 1935001\nSähköposti: info@fixnero.fi\nOsoite: Tiilenvalajantie 6, 02330 Espoo\nAukioloajat: Arkisin 9:00-17:00, viikonloppuisin suljettu`,
                    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">Hei ${name},</h2>
                        <p>Kiitos paljon tekemästäsi varauksesta! Sinulle on vahvistettu varaus ajalle <strong>${aika}</strong>.</p>
                        
                        <h3 style="color: #333; margin-top: 20px;">Valitut palvelut:</h3>
                        <ul style="list-style-type: none; padding: 0;">
                            ${serviceListHtml}
                        </ul>
                        
                        <p style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #4CAF50; font-size: 16px;">
                            <strong>Yhteensä:</strong> ${totalPrice}
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
            res.status(500).json({ error: error.message });
        });
    });
});

// KALENTERIN VARAUKSET
exports.bookings = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        }
        try {
            const snapshot = await admin.firestore().collection("varaukset").get();
            const bookings = [];
            snapshot.forEach(doc => {
                bookings.push({ id: doc.id, ...doc.data() });
            });
            res.json(bookings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});