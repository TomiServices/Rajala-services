#!/bin/bash

# Google Calendar Integration - Verification Script
# This script checks if the Google Calendar integration is properly set up

echo "================================================"
echo "Google Calendar Integration - Setup Verification"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_CHECKS_PASSED=true

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ALL_CHECKS_PASSED=false
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "Checking Prerequisites..."
echo ""

# Check if we're in the right directory
if [ ! -f "functions/package.json" ]; then
    echo -e "${RED}✗${NC} Not in the correct directory. Please run this from the project root."
    exit 1
fi

print_status 0 "In correct directory"

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    print_status 0 "Node.js installed: $NODE_VERSION"
else
    print_status 1 "Node.js not installed"
fi

# Check Firebase CLI
FIREBASE_VERSION=$(firebase --version 2>/dev/null)
if [ $? -eq 0 ]; then
    print_status 0 "Firebase CLI installed: $FIREBASE_VERSION"
else
    print_status 1 "Firebase CLI not installed"
fi

echo ""
echo "Checking Dependencies..."
echo ""

# Check if node_modules exists
if [ -d "functions/node_modules" ]; then
    print_status 0 "Node modules installed"
else
    print_status 1 "Node modules not installed (run: cd functions && npm install)"
fi

# Check if googleapis is installed
if [ -d "functions/node_modules/googleapis" ]; then
    print_status 0 "googleapis package installed"
else
    print_status 1 "googleapis package not installed"
fi

echo ""
echo "Checking Configuration..."
echo ""

# Check Firebase configuration
firebase functions:config:get > /tmp/firebase-config.json 2>/dev/null
if [ $? -eq 0 ]; then
    print_status 0 "Can read Firebase Functions config"
    
    # Check for Google Calendar configuration
    if grep -q "google" /tmp/firebase-config.json; then
        print_status 0 "Google Calendar config found"
        
        # Check for service account
        if grep -q "service_account" /tmp/firebase-config.json; then
            print_status 0 "Service account configured"
        else
            print_status 1 "Service account not configured"
        fi
        
        # Check for calendar ID
        if grep -q "calendar_id" /tmp/firebase-config.json; then
            print_status 0 "Calendar ID configured"
        else
            print_status 1 "Calendar ID not configured"
        fi
    else
        print_status 1 "Google Calendar config not found"
        print_warning "Run: firebase functions:config:set google.service_account=... google.calendar_id=..."
    fi
    
    # Check for reCAPTCHA configuration
    if grep -q "recaptcha" /tmp/firebase-config.json; then
        print_status 0 "reCAPTCHA config found"
    else
        print_warning "reCAPTCHA config not found (optional)"
    fi
    
    rm -f /tmp/firebase-config.json
else
    print_status 1 "Cannot read Firebase Functions config (not logged in?)"
    print_warning "Run: firebase login"
fi

echo ""
echo "Checking Code..."
echo ""

# Check JavaScript syntax
node -c functions/index.js.js 2>/dev/null
print_status $? "JavaScript syntax valid"

# Check for required functions in code
if grep -q "onBookingCreated" functions/index.js.js; then
    print_status 0 "onBookingCreated function found"
else
    print_status 1 "onBookingCreated function not found"
fi

if grep -q "onBookingUpdated" functions/index.js.js; then
    print_status 0 "onBookingUpdated function found"
else
    print_status 1 "onBookingUpdated function not found"
fi

if grep -q "onBookingDeleted" functions/index.js.js; then
    print_status 0 "onBookingDeleted function found"
else
    print_status 1 "onBookingDeleted function not found"
fi

if grep -q "calendarWebhook" functions/index.js.js; then
    print_status 0 "calendarWebhook function found"
else
    print_status 1 "calendarWebhook function not found"
fi

echo ""
echo "Checking Documentation..."
echo ""

# Check if documentation exists
for doc in "GOOGLE_CALENDAR_SETUP.md" "ENVIRONMENT_VARIABLES.md" "GOOGLE_CALENDAR_DEPLOYMENT_CHECKLIST.md" "GOOGLE_CALENDAR_TROUBLESHOOTING.md"; do
    if [ -f "$doc" ]; then
        print_status 0 "$doc exists"
    else
        print_status 1 "$doc missing"
    fi
done

echo ""
echo "Checking Security..."
echo ""

# Check .gitignore
if grep -q ".runtimeconfig.json" .gitignore; then
    print_status 0 ".runtimeconfig.json in .gitignore"
else
    print_status 1 ".runtimeconfig.json not in .gitignore"
fi

if grep -q "service-account" .gitignore; then
    print_status 0 "service-account patterns in .gitignore"
else
    print_status 1 "service-account patterns not in .gitignore"
fi

# Check if credentials are committed (they shouldn't be)
if git ls-files | grep -q "service-account.*\.json"; then
    print_status 1 "Service account files found in git (SECURITY RISK!)"
else
    print_status 0 "No service account files in git"
fi

if [ -f "functions/.runtimeconfig.json" ]; then
    if git ls-files | grep -q ".runtimeconfig.json"; then
        print_status 1 ".runtimeconfig.json is tracked by git (SECURITY RISK!)"
    else
        print_status 0 ".runtimeconfig.json exists but not tracked by git"
    fi
fi

echo ""
echo "================================================"
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Complete Google Cloud setup (see GOOGLE_CALENDAR_SETUP.md)"
    echo "2. Configure Firebase Functions (see ENVIRONMENT_VARIABLES.md)"
    echo "3. Deploy: firebase deploy --only functions"
    echo "4. Set up webhook (see GOOGLE_CALENDAR_SETUP.md Step 5)"
else
    echo -e "${YELLOW}Some checks failed. Please review above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Install dependencies: cd functions && npm install"
    echo "- Login to Firebase: firebase login"
    echo "- Configure Google Calendar: firebase functions:config:set ..."
    echo "- See GOOGLE_CALENDAR_SETUP.md for detailed instructions"
fi
echo "================================================"
