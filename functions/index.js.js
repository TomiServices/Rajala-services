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
        const { name, email, phone, aika, palvelu, palvelunTyyppi } = req.body;
        if (!name || !email || !phone || !aika || !palvelu || !palvelunTyyppi) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Tallenna varaus Firestoreen
        admin.firestore().collection("varaukset").add({
            name,
            email,
            phone,
            aika,
            palvelu,
            palvelunTyyppi,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }).then(doc => {
            // Luo "mail"-dokumentti sähköpostitriggerille (to array!)
            admin.firestore().collection("mail").add({
                to: [email], // ARRAY, extension vaatii tätä!
                message: {
                    subject: "Varausvahvistus – Fixnero",
                    text: `Hei ${name},\n\nVarauksesi ajalle ${aika} palveluun ${palvelu} (${palvelunTyyppi}) on vahvistettu! Kiitos varauksestasi ja tervetuloa.\n\nYhteystietomme:\nPuhelin: 040 1935001\nSähköposti: info@fixnero.fi\nOsoite: Tiilenvalajantie 6, 02330 Espoo\nAukioloajat: Arkisin 9:00-17:00, viikonloppuisin suljettu`,
                    html: `<strong>Hei ${name},</strong><br><br>Varauksesi ajalle <b>${aika}</b> palveluun <b>${palvelu}</b> (<i>${palvelunTyyppi}</i>) on vahvistettu!<br><br>Kiitos varauksestasi ja tervetuloa.<br><br><strong>Yhteystietomme:</strong><br>Puhelin: 040 1935001<br>Sähköposti: <a href="mailto:info@fixnero.fi">info@fixnero.fi</a><br>Osoite: Tiilenvalajantie 6, 02330 Espoo<br>Aukioloajat: Arkisin 9:00-17:00, viikonloppuisin suljettu`
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