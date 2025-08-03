const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Allow all origins, or specify your domain

admin.initializeApp();

exports.book = functions.https.onRequest((req, res) => {
    cors(req, res, () => { // Wrap your function logic in cors
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }
        const { name, email, phone, aika } = req.body;
        if (!name || !email || !phone || !aika) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        admin.firestore().collection("varaukset").add({
            name, email, phone, aika,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }).then(doc => {
            res.json({ success: true, id: doc.id });
        }).catch(error => {
            res.status(500).json({ error: error.message });
        });
    });
});