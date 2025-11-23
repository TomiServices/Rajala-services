#!/bin/bash
# test-email-extension.sh - Test script for Firebase Firestore Send Email Extension
# This script creates a test booking document and verifies that an email document is created in the mail collection
# 
# IMPORTANT: Only run this script in a TEST/DEVELOPMENT environment, never in production!
#
# Usage: ./scripts/test-email-extension.sh [project-id]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default project ID (can be overridden)
PROJECT_ID="${1:-fxnr-web}"

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Email Extension Test Script${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""

# Safety check
echo -e "${RED}WARNING: This script will create test data in Firestore!${NC}"
echo -e "${YELLOW}Project: ${PROJECT_ID}${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${GREEN}Starting test...${NC}"
echo ""

# Generate a unique test email
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_NAME="Test User $(date +%H:%M:%S)"
TEST_PHONE="+358 40 1234567"

# Create a booking time in the future (tomorrow at 10:00 AM)
TOMORROW=$(date -d "tomorrow 10:00" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -v+1d -u +"%Y-%m-%dT10:00:00Z" 2>/dev/null || echo "2025-12-01T10:00:00Z")

echo "Test booking details:"
echo "  Name: $TEST_NAME"
echo "  Email: $TEST_EMAIL"
echo "  Phone: $TEST_PHONE"
echo "  Time: $TOMORROW"
echo ""

# Create the test booking document
echo -e "${YELLOW}Step 1: Creating test booking document...${NC}"

BOOKING_DATA=$(cat <<EOF
{
  "nimi": "$TEST_NAME",
  "sahkoposti": "$TEST_EMAIL",
  "puhelin": "$TEST_PHONE",
  "aika": "$TOMORROW",
  "services": [
    {
      "serviceName": "Test Service",
      "taskName": "Test Task",
      "price": "50€"
    }
  ],
  "totalPrice": "50€",
  "totalNumericPrice": 50,
  "syncedFromGoogle": false,
  "googleEventId": null,
  "syncedToGoogle": false
}
EOF
)

# Use Firebase CLI to add the document
BOOKING_ID=$(firebase firestore:add varaukset "$BOOKING_DATA" --project="$PROJECT_ID" 2>&1 | grep "Document ID:" | sed 's/.*Document ID: //' || echo "")

if [ -z "$BOOKING_ID" ]; then
    echo -e "${RED}Failed to create booking document. Make sure Firebase CLI is installed and authenticated.${NC}"
    echo -e "${YELLOW}Trying alternative method...${NC}"
    
    # Alternative: use REST API if CLI fails
    echo "Please manually create a test booking through your application or Firebase console."
    exit 1
fi

echo -e "${GREEN}✓ Booking created with ID: $BOOKING_ID${NC}"
echo ""

# Wait for Cloud Function to process
echo -e "${YELLOW}Step 2: Waiting for Cloud Function to process (5 seconds)...${NC}"
sleep 5

# Check if email document was created in mail collection
echo -e "${YELLOW}Step 3: Checking for email document in 'mail' collection...${NC}"

# Query mail collection for documents with our test email
MAIL_QUERY=$(cat <<EOF
{
  "structuredQuery": {
    "from": [{"collectionId": "mail"}],
    "where": {
      "fieldFilter": {
        "field": {"fieldPath": "to"},
        "op": "EQUAL",
        "value": {"stringValue": "$TEST_EMAIL"}
      }
    },
    "limit": 5
  }
}
EOF
)

# Try to get the mail document
sleep 2  # Additional wait
MAIL_DOCS=$(firebase firestore:query mail --where "to==$TEST_EMAIL" --project="$PROJECT_ID" 2>&1 || echo "")

if [ -z "$MAIL_DOCS" ] || [[ "$MAIL_DOCS" == *"No documents"* ]] || [[ "$MAIL_DOCS" == *"error"* ]]; then
    echo -e "${RED}✗ No email document found in 'mail' collection${NC}"
    echo -e "${YELLOW}This could mean:${NC}"
    echo "  1. The email extension is not installed or not configured"
    echo "  2. USE_EMAIL_EXTENSION is set to 'false'"
    echo "  3. The Cloud Function hasn't processed yet (wait longer)"
    echo "  4. There was an error in the Cloud Function"
    echo ""
    echo -e "${YELLOW}Check Cloud Function logs:${NC}"
    echo "  firebase functions:log --project=$PROJECT_ID"
    echo ""
    echo -e "${YELLOW}Cleaning up: Deleting test booking...${NC}"
    firebase firestore:delete "varaukset/$BOOKING_ID" --project="$PROJECT_ID" --force 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓ Email document(s) found in 'mail' collection!${NC}"
echo ""

# Display the email document details
echo -e "${YELLOW}Step 4: Verifying email document structure...${NC}"
echo ""
echo "Email documents found:"
echo "$MAIL_DOCS"
echo ""

# Verify required fields
REQUIRED_FIELDS=("to" "subject" "message" "html")
ALL_FIELDS_PRESENT=true

for field in "${REQUIRED_FIELDS[@]}"; do
    if [[ "$MAIL_DOCS" == *"$field"* ]]; then
        echo -e "${GREEN}✓ Field '$field' present${NC}"
    else
        echo -e "${RED}✗ Field '$field' missing${NC}"
        ALL_FIELDS_PRESENT=false
    fi
done

echo ""

# Final status
if [ "$ALL_FIELDS_PRESENT" = true ]; then
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✓ TEST PASSED${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "Email extension integration is working correctly!"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Check the email document in Firebase Console"
    echo "  2. Verify the extension processes the email (check delivery.state field)"
    echo "  3. Monitor Eventarc events in Cloud Logging"
else
    echo -e "${RED}================================${NC}"
    echo -e "${RED}✗ TEST FAILED${NC}"
    echo -e "${RED}================================${NC}"
    echo ""
    echo "Email document is missing required fields."
fi

echo ""
echo -e "${YELLOW}Cleanup:${NC}"
read -p "Delete test booking document? (yes/no): " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    firebase firestore:delete "varaukset/$BOOKING_ID" --project="$PROJECT_ID" --force
    echo -e "${GREEN}✓ Test booking deleted${NC}"
else
    echo "Test booking kept: varaukset/$BOOKING_ID"
fi

echo ""
echo -e "${YELLOW}Note: Mail collection documents are processed by the extension.${NC}"
echo "The extension will mark them as delivered and you may want to clean them up manually."
echo ""
echo "Done!"
