const functions = require("firebase-functions");
const axios = require("axios");

exports.googleApiProxy = functions.https.onRequest(async (req, res) => {
  const apiKey = functions.config().google.api_key; // Access the API key stored in Firebase
  const endpoint = req.query.endpoint || "https://www.googleapis.com/some-api"; // Replace with your API endpoint

  try {
    const response = await axios.get(endpoint, {
      params: req.query, // Pass any query parameters from the frontend
      headers: {
        Authorization: `Bearer ${req.headers.authorization || apiKey}`, // Use the API key or Authorization header
      },
    });
    res.status(200).send(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).send(error.message);
  }
});