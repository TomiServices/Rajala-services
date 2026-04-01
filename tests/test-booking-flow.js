#!/usr/bin/env node
/**
 * Test Script for reCAPTCHA Booking Flow
 * 
 * This script simulates booking requests to test reCAPTCHA validation.
 * It does NOT use real reCAPTCHA tokens - it's for testing backend validation logic.
 * 
 * Usage:
 *   node test-booking-flow.js --test missing-token
 *   node test-booking-flow.js --test empty-token
 *   node test-booking-flow.js --test invalid-token
 *   node test-booking-flow.js --test mock-valid
 *   node test-booking-flow.js --endpoint http://localhost:5001/webbi1/europe-north1/book
 */

const https = require('https');
const http = require('http');

// Constants
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Parse command line arguments
const args = process.argv.slice(2);
const testIndex = args.indexOf('--test');
const endpointIndex = args.indexOf('--endpoint');
const testType = testIndex >= 0 ? args[testIndex + 1] : 'missing-token';
const customEndpoint = endpointIndex >= 0 ? args[endpointIndex + 1] : undefined;

// Default endpoint (production)
const DEFAULT_ENDPOINT = 'https://europe-north1-webbi1.cloudfunctions.net/book';
const endpoint = customEndpoint || DEFAULT_ENDPOINT;

// Parse endpoint URL
const url = new URL(endpoint);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

console.log('='.repeat(60));
console.log('reCAPTCHA Booking Flow Test Script');
console.log('='.repeat(60));
console.log(`Test Type: ${testType}`);
console.log(`Endpoint:  ${endpoint}`);
console.log('='.repeat(60));
console.log('');

// Base booking data (valid structure)
const baseBookingData = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+358 40 1234567',
  aika: new Date(Date.now() + ONE_DAY_MS).toISOString(), // Tomorrow
  services: [
    {
      category: 'washing',
      serviceName: 'Pesupalvelut',
      taskName: 'Käsinpesu',
      price: 'alkaen 25 €',
      numericPrice: 25
    }
  ],
  totalPrice: 'alkaen 25 €',
  totalNumericPrice: 25
};

// Test scenarios
const testScenarios = {
  'missing-token': {
    description: 'Missing reCAPTCHA token',
    data: baseBookingData, // No recaptcha field
    expectedStatus: 400,
    expectedError: 'missing recaptcha token'
  },
  
  'empty-token': {
    description: 'Empty reCAPTCHA token',
    data: { ...baseBookingData, recaptcha: '' },
    expectedStatus: 400,
    expectedError: 'missing recaptcha token'
  },
  
  'invalid-token': {
    description: 'Invalid reCAPTCHA token format',
    data: { ...baseBookingData, recaptcha: 'invalid-token-12345' },
    expectedStatus: 401,
    expectedError: 'recaptcha verification failed'
  },
  
  'mock-valid': {
    description: 'Mock valid token (will fail at Google verify)',
    data: { 
      ...baseBookingData, 
      recaptcha: 'mock-token-this-will-fail-at-google-verify-but-pass-format-check'
    },
    expectedStatus: 401,
    expectedError: 'recaptcha verification failed'
  }
};

// Select test scenario
const scenario = testScenarios[testType];
if (!scenario) {
  console.error(`Unknown test type: ${testType}`);
  console.error(`Available tests: ${Object.keys(testScenarios).join(', ')}`);
  process.exit(1);
}

console.log(`Test: ${scenario.description}`);
console.log('');
console.log('Request Data:');
console.log(JSON.stringify(scenario.data, null, 2));
console.log('');
console.log('-'.repeat(60));

// Make HTTP request
const postData = JSON.stringify(scenario.data);

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Origin': 'https://www.fixnero.fi'
  }
};

const req = client.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    clearTimeout(timeoutId); // Clear timeout on successful response
    console.log('\nResponse:');
    console.log('-'.repeat(60));
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('');
    
    try {
      const jsonResponse = JSON.parse(responseData);
      console.log('Body:');
      console.log(JSON.stringify(jsonResponse, null, 2));
      
      // Validate response
      console.log('');
      console.log('='.repeat(60));
      console.log('Validation:');
      console.log('='.repeat(60));
      
      const statusMatch = res.statusCode === scenario.expectedStatus;
      const errorMatch = jsonResponse.error === scenario.expectedError;
      
      console.log(`✓ Status Code: ${statusMatch ? 'PASS' : 'FAIL'} (expected ${scenario.expectedStatus}, got ${res.statusCode})`);
      console.log(`✓ Error Field:  ${errorMatch ? 'PASS' : 'FAIL'} (expected "${scenario.expectedError}", got "${jsonResponse.error}")`);
      
      if (jsonResponse.message) {
        console.log(`  Message: "${jsonResponse.message}"`);
      }
      
      if (jsonResponse.details) {
        console.log('  Details:', JSON.stringify(jsonResponse.details, null, 2));
      }
      
      console.log('');
      
      if (statusMatch && errorMatch) {
        console.log('✅ TEST PASSED');
        process.exit(0);
      } else {
        console.log('❌ TEST FAILED');
        process.exit(1);
      }
      
    } catch (parseError) {
      console.log('Body (raw):');
      console.log(responseData);
      console.log('');
      console.log('⚠️  Response is not valid JSON');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  clearTimeout(timeoutId); // Clear timeout on error
  console.error('');
  console.error('❌ Request Error:');
  console.error(error.message);
  console.error('');
  
  if (error.code === 'ECONNREFUSED') {
    console.error('💡 Tip: Make sure the Firebase Functions are running');
    console.error('   For local testing: firebase emulators:start');
    console.error('   For production: ensure functions are deployed');
  }
  
  process.exit(1);
});

// Send request
req.write(postData);
req.end();

// Timeout after 30 seconds
const timeoutId = setTimeout(() => {
  console.error('');
  console.error('❌ Request timed out after 30 seconds');
  process.exit(1);
}, 30000);
