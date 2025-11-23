// emailExtensionAdapter.js - Adapter for Firebase Firestore Send Email Extension
// Creates email documents in Firestore that the extension picks up and sends

const { defineString } = require('firebase-functions/params');

// Environment parameter for mail collection name
const mailCollectionName = defineString('MAIL_COLLECTION_NAME');
const emailFrom = defineString('EMAIL_FROM');

// =======================
// UTILITY: HTML Escaping
// =======================
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// =======================
// UTILITY: Robust date parsing
// =======================
function parseFirestoreDate(val) {
  if (!val) return null;

  // Firestore Timestamp (Admin SDK) has toDate()
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch (e) {
      return null;
    }
  }

  // Proto-like object { seconds, nanos }
  if (typeof val === 'object' && val.seconds !== undefined && val.nanos !== undefined) {
    try {
      return new Date(val.seconds * 1000 + Math.round(val.nanos / 1e6));
    } catch (e) {
      return null;
    }
  }

  // Number: treat < 1e12 as seconds, else milliseconds
  if (typeof val === 'number') {
    if (val < 1e12) return new Date(val * 1000);
    return new Date(val);
  }

  // String: try Date.parse
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  }

  return null;
}

function safeGetParamValue(param, envNameFallback) {
  try {
    const v = param.value();
    if (v === undefined || v === null || v === '') return process.env[envNameFallback] || null;
    return v;
  } catch (e) {
    return process.env[envNameFallback] || null;
  }
}

/**
 * Creates an email document in Firestore for the Firebase Send Email extension
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance
 * @param {Object} booking - Booking data object
 * @param {string} bookingId - Optional booking ID for metadata
 * @returns {Promise<string>} - The created email document ID
 */
async function createEmailDocumentForBooking(db, booking, bookingId = null) {
  try {
    // Get collection name from environment or default to 'mail'
    const collectionName = safeGetParamValue(mailCollectionName, 'MAIL_COLLECTION_NAME') || 'mail';
    
    // Parse booking date
    const startDate = parseFirestoreDate(booking.aika);
    if (!startDate || Number.isNaN(startDate.getTime())) {
      console.warn('Invalid booking date for email document, skipping:', booking);
      throw new Error('Invalid booking date');
    }

    // Format date and time for email
    const formattedDate = startDate.toLocaleDateString('fi-FI', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = startDate.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Escape user input to prevent XSS
    const escapedName = escapeHtml(booking.nimi);
    const escapedEmail = escapeHtml(booking.sahkoposti);
    const escapedPhone = escapeHtml(booking.puhelin);
    const escapedTotalPrice = escapeHtml(booking.totalPrice);

    // Build services text with sanitized data
    const servicesText = (booking.services || [])
      .map(s => `  • ${escapeHtml(s.serviceName || '')} - ${escapeHtml(s.taskName || '')}${s.price ? ': ' + escapeHtml(s.price) : ''}`)
      .join('\n') || '  Palvelu ei määritelty';

    // Build HTML email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c41e3a;">Varausvahvistus</h2>
        <p>Hei ${escapedName || 'asiakas'},</p>
        <p>Olemme vastaanottaneet varauksesi. Tässä varauksen tiedot:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Varauksen tiedot</h3>
          <p><strong>Aika:</strong> ${formattedDate} klo ${formattedTime}</p>
          <p><strong>Asiakas:</strong> ${escapedName}</p>
          <p><strong>Puhelin:</strong> ${escapedPhone}</p>
          <p><strong>Sähköposti:</strong> ${escapedEmail}</p>
        </div>
        
        <div style="background-color: #fff4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Valitut palvelut</h3>
          <p style="white-space: pre-line;">${servicesText}</p>
          <p><strong>Kokonaishinta:</strong> ${escapedTotalPrice || 'Hinta sovittaessa'}</p>
        </div>
        
        <p>Otamme sinuun yhteyttä tarvittaessa ennen varattua aikaa.</p>
        <p>Jos sinun täytyy perua tai muuttaa varausta, ota yhteyttä:</p>
        <ul>
          <li>Puhelin: <a href="tel:+358401234567">+358 40 123 4567</a></li>
          <li>Sähköposti: <a href="mailto:info@rajala-services.com">info@rajala-services.com</a></li>
        </ul>
        
        <p style="margin-top: 30px;">Ystävällisin terveisin,<br><strong>Rajala Services</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Tämä on automaattinen vahvistusviesti. Älä vastaa tähän viestiin.
        </p>
      </div>
    `;

    // Get FROM address from environment or use default
    const fromAddress = safeGetParamValue(emailFrom, 'EMAIL_FROM') || 'tomirajala02@gmail.com';

    // Create email document for the extension
    const emailDoc = {
      to: booking.sahkoposti,
      from: fromAddress,
      message: {
        subject: 'Varausvahvistus - Rajala Services',
        html: htmlBody
      },
      // Metadata for tracking
      ...(bookingId && { 
        metadata: {
          bookingId: bookingId,
          createdAt: new Date().toISOString()
        }
      })
    };

    // Write the document to the mail collection
    const docRef = await db.collection(collectionName).add(emailDoc);
    
    console.log('Email document created in collection:', collectionName, 'with ID:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('Failed to create email document:', err.message || err);
    throw err;
  }
}

module.exports = {
  createEmailDocumentForBooking,
  escapeHtml // Export for testing
};
