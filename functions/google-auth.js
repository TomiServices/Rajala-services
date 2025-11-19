/**
 * Google OAuth2 Authentication Handler
 * 
 * This module handles the OAuth2 flow for Google Calendar API access.
 */

const functions = require('firebase-functions');
const { getOAuth2Client, storeTokens } = require('./google-calendar-service');

// OAuth2 scopes needed for Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Generate OAuth2 authorization URL
 * 
 * This function initiates the OAuth flow by generating a URL
 * that admins can visit to grant calendar access.
 */
exports.generateAuthUrl = functions.https.onRequest((req, res) => {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent to get refresh token
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Google Calendar Authorization</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #4285f4;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #357ae8;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Google Calendar Authorization</h1>
        <div class="warning">
          <strong>⚠️ Important:</strong> This page should only be accessed by system administrators.
        </div>
        <p>
          Click the button below to authorize this application to access your Google Calendar.
          This is required for two-way synchronization between your website and Google Calendar.
        </p>
        <p>
          <strong>Permissions requested:</strong>
        </p>
        <ul>
          <li>View and manage your Google Calendar</li>
          <li>Create, update, and delete calendar events</li>
        </ul>
        <p>
          <a href="${authUrl}" class="btn">Authorize Google Calendar Access</a>
        </p>
        <p style="margin-top: 30px; font-size: 0.9rem; color: #999;">
          After authorization, you'll be redirected back to complete the setup.
        </p>
      </div>
    </body>
    </html>
  `);
});

/**
 * OAuth2 callback handler
 * 
 * This function handles the redirect from Google after the user
 * grants access. It exchanges the authorization code for access tokens.
 */
exports.oauth2callback = functions.https.onRequest(async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 20px;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Authorization Error</h2>
          <p>No authorization code received. Please try again.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const oauth2Client = getOAuth2Client();
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in Firebase
    await storeTokens(tokens);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Successful</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
          }
          h1 {
            color: #155724;
            margin-bottom: 20px;
          }
          p {
            color: #155724;
            line-height: 1.6;
          }
          .checkmark {
            font-size: 48px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <div class="checkmark">✅</div>
          <h1>Authorization Successful!</h1>
          <p>
            Google Calendar has been successfully connected to your booking system.
            Two-way synchronization is now active.
          </p>
          <p style="margin-top: 20px; font-size: 0.9rem; color: #666;">
            You can close this window and return to your admin panel.
          </p>
        </div>
      </body>
      </html>
    `);

    // Set up webhook for calendar changes
    const { setupWebhook } = require('./google-calendar-service');
    try {
      await setupWebhook();
      console.log('Webhook setup completed during OAuth callback');
    } catch (error) {
      console.error('Failed to setup webhook during OAuth callback:', error);
      // Don't fail the whole OAuth flow if webhook setup fails
      // Admin can manually trigger webhook setup later
    }

  } catch (error) {
    console.error('Error during OAuth callback:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 20px;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Authorization Error</h2>
          <p>Failed to complete authorization: ${error.message}</p>
          <p>Please try again or contact support if the issue persists.</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * Check OAuth status
 * 
 * Admin endpoint to check if OAuth tokens are configured
 */
exports.checkAuthStatus = functions.https.onRequest(async (req, res) => {
  try {
    const { getStoredTokens } = require('./google-calendar-service');
    const tokens = await getStoredTokens();

    const hasTokens = tokens && tokens.access_token;
    const isExpired = tokens && tokens.expiry_date && tokens.expiry_date < Date.now();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Status</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          .status {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .status-item {
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
          }
          .ok {
            background: #d4edda;
            border-left: 4px solid #28a745;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
          }
          .error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
          }
        </style>
      </head>
      <body>
        <div class="status">
          <h1>🔐 Google Calendar OAuth Status</h1>
          
          <div class="status-item ${hasTokens ? 'ok' : 'error'}">
            <strong>OAuth Tokens:</strong> ${hasTokens ? '✅ Configured' : '❌ Not configured'}
          </div>
          
          ${hasTokens ? `
            <div class="status-item ${isExpired ? 'warning' : 'ok'}">
              <strong>Token Status:</strong> ${isExpired ? '⚠️ Expired (will auto-refresh)' : '✅ Valid'}
            </div>
            <div class="status-item ok">
              <strong>Last Updated:</strong> ${tokens.updated_at || 'Unknown'}
            </div>
          ` : `
            <div class="status-item error">
              <p><strong>Action Required:</strong> OAuth is not configured.</p>
              <p>Please visit <code>/generateAuthUrl</code> to complete OAuth setup.</p>
            </div>
          `}
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <body>
        <h2>Error checking OAuth status</h2>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

module.exports = {
  SCOPES
};
