const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();

exports.bookings = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const data = req.body;
  if (!data.start || !data.end || !data.title) {
    return res.status(400).send("Missing required fields: start, end, title");
  }

  try {
    const bookingRef = await admin.firestore().collection("bookings").add({
      title: data.title,
      description: data.description || "",
      start: admin.firestore.Timestamp.fromDate(new Date(data.start)),
      end: admin.firestore.Timestamp.fromDate(new Date(data.end)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ id: bookingRef.id, message: "Booking saved" });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).send("Internal Server Error");
  }
});
