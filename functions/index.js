const { onRequest } = require("firebase-functions/v2/https");

exports.calendarWebhook = onRequest((req, res) => {
  console.log("Incoming:", req.method, req.headers);

  // Google webhook validation
  if (req.headers["x-goog-resource-state"] === "sync") {
    console.log("Webhook verification received");
    return res.status(200).send("Webhook verified");
  }

  // Calendar change event
  if (req.headers["x-goog-resource-state"] === "exists") {
    console.log("Calendar change detected:", req.headers);
    console.log("Body:", req.body);
    return res.status(200).send("Change processed");
  }

  // Always respond 200 so Google keeps the webhook alive
  res.status(200).send("OK");
});
