const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Allow all origins, or specify your domain

admin.initializeApp();

exports.book = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }
        const { name, email, phone, aika } = req.body;
        if (!name || !email || !phone || !aika) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Add booking to Firestore
        admin.firestore().collection("varaukset").add({
            name, email, phone, aika,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }).then(doc => {
            // --- ADD THIS: Create mail document for Firebase Trigger Email extension ---
            admin.firestore().collection("mail").add({
                to: email, // send to the customer's email
                message: {
                    subject: "Varausvahvistus – Fixnero",
                    text: `Hei ${name}, varauksesi ajalle ${aika} on vahvistettu! Kiitos varauksestasi.`,
                    html: `<strong>Hei ${name},</strong><br>Varauksesi ajalle <b>${aika}</b> on vahvistettu!<br>Kiitos varauksestasi.`
                }
            }).then(() => {
                res.json({ success: true, id: doc.id });
            }).catch(error => {
                // If email doc failed, still return booking success but log error
                console.error("Failed to create mail doc:", error);
                res.json({ success: true, id: doc.id, emailError: error.message });
            });
            // --- END ADD ---
        }).catch(error => {
            res.status(500).json({ error: error.message });
        });
    });
});

// --- CALENDAR BOOKINGS FUNCTION ---
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