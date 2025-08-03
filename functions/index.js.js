const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.book = functions.https.onRequest((req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }
    const { name, email, phone, aika } = req.body;
    // Basic validation
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