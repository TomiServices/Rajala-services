/**
 * Google Analytics Configuration
 * 
 * IMPORTANT: Replace 'G-XXXXXXXXXX' with your actual Google Analytics 4 Measurement ID
 * 
 * To get your Measurement ID:
 * 1. Go to https://analytics.google.com/
 * 2. Select Admin → Data Streams → Web
 * 3. Copy the Measurement ID (format: G-XXXXXXXXXX)
 * 
 * Example: const GA_MEASUREMENT_ID = 'G-ABC123XYZ4';
 */

const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GA_MEASUREMENT_ID };
}
