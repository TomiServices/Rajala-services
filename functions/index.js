exports.calendarWebhook = functions.https.onRequest(async (req, res) => {
    // Handle webhook verification (sent by Google)
    if (req.headers['x-goog-resource-state'] === 'sync') {
        console.log('Webhook verification received.');
        return res.status(200).send('Webhook verified.');
    }

    // Process update notifications
    if (req.headers['x-goog-resource-state'] === 'exists') {
        console.log('Calendar change detected:', req.headers);
        return res.status(200).send('Change processed.');
    }

    res.status(200).send('Webhook received.');
});
