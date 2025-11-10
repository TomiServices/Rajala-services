#!/bin/bash
# Booking Calendar Configuration Verification Script
# This script helps verify the booking calendar configuration

echo "================================================"
echo "Booking Calendar Configuration Verification"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Firebase Functions CORS Configuration
echo "1. Checking Firebase Functions CORS Configuration..."
if grep -q "https://www.rajala-services.com" functions/index.js.js; then
    echo -e "${GREEN}✓${NC} CORS includes www.rajala-services.com"
else
    echo -e "${RED}✗${NC} CORS missing www.rajala-services.com"
fi

if grep -q "https://rajala-services.com" functions/index.js.js; then
    echo -e "${GREEN}✓${NC} CORS includes rajala-services.com"
else
    echo -e "${RED}✗${NC} CORS missing rajala-services.com"
fi

# Check 2: OPTIONS Request Handling
echo ""
echo "2. Checking OPTIONS Request Handling..."
OPTIONS_COUNT=$(grep -c 'req.method === "OPTIONS"' functions/index.js.js)
if [ "$OPTIONS_COUNT" -eq 2 ]; then
    echo -e "${GREEN}✓${NC} Both endpoints handle OPTIONS requests ($OPTIONS_COUNT handlers)"
else
    echo -e "${YELLOW}⚠${NC} Found $OPTIONS_COUNT OPTIONS handlers (expected 2)"
fi

# Check 3: CSP Configuration
echo ""
echo "3. Checking Content Security Policy..."
if grep -q "https://us-central1-fxnr-web.cloudfunctions.net" firebase.json; then
    echo -e "${GREEN}✓${NC} CSP allows Firebase Functions endpoint"
else
    echo -e "${RED}✗${NC} CSP missing Firebase Functions endpoint"
fi

if grep -q "https://www.google.com" firebase.json && grep -q "https://www.gstatic.com" firebase.json; then
    echo -e "${GREEN}✓${NC} CSP allows reCAPTCHA domains"
else
    echo -e "${RED}✗${NC} CSP missing reCAPTCHA domains"
fi

# Check 4: reCAPTCHA Configuration
echo ""
echo "4. Checking reCAPTCHA Configuration..."
RECAPTCHA_KEY=$(grep -oP 'data-sitekey="\K[^"]+' index.html)
if [ -n "$RECAPTCHA_KEY" ]; then
    echo -e "${GREEN}✓${NC} reCAPTCHA site key found: $RECAPTCHA_KEY"
    echo -e "${YELLOW}ℹ${NC} Verify this key is registered at: https://www.google.com/recaptcha/admin"
else
    echo -e "${RED}✗${NC} reCAPTCHA site key not found"
fi

# Check 5: Error Handling
echo ""
echo "5. Checking Enhanced Error Handling..."
if grep -q "Palvelu ei ole tällä hetkellä saatavilla" booking-system.js; then
    echo -e "${GREEN}✓${NC} 503 error handling present"
else
    echo -e "${YELLOW}⚠${NC} 503 error handling missing"
fi

if grep -q "reCAPTCHA ei ole latautunut" booking-system.js; then
    echo -e "${GREEN}✓${NC} reCAPTCHA loading check present"
else
    echo -e "${YELLOW}⚠${NC} reCAPTCHA loading check missing"
fi

# Check 6: Dependencies
echo ""
echo "6. Checking Dependencies..."
if [ -f "functions/package-lock.json" ]; then
    AXIOS_VERSION=$(grep -A 1 '"axios":' functions/package-lock.json | grep '"version":' | head -1 | grep -oP '"\K[0-9.]+')
    if [ -n "$AXIOS_VERSION" ]; then
        echo -e "${GREEN}✓${NC} axios version: $AXIOS_VERSION"
        # Check if version is >= 1.7.9 (security fix)
        if [ "$(printf '%s\n' "1.7.9" "$AXIOS_VERSION" | sort -V | head -n1)" = "1.7.9" ]; then
            echo -e "${GREEN}✓${NC} axios version is secure (>= 1.7.9)"
        else
            echo -e "${RED}✗${NC} axios version is vulnerable (< 1.7.9)"
        fi
    fi
fi

# Check 7: Syntax Validation
echo ""
echo "7. Validating JavaScript Syntax..."
if command -v node &> /dev/null; then
    if node -c functions/index.js.js 2>/dev/null; then
        echo -e "${GREEN}✓${NC} functions/index.js.js syntax valid"
    else
        echo -e "${RED}✗${NC} functions/index.js.js has syntax errors"
    fi
    
    if node -c booking-system.js 2>/dev/null; then
        echo -e "${GREEN}✓${NC} booking-system.js syntax valid"
    else
        echo -e "${RED}✗${NC} booking-system.js has syntax errors"
    fi
else
    echo -e "${YELLOW}⚠${NC} Node.js not found, skipping syntax validation"
fi

# Summary
echo ""
echo "================================================"
echo "Next Steps:"
echo "================================================"
echo "1. Deploy Firebase Functions: cd functions && firebase deploy --only functions"
echo "2. Deploy Firebase Hosting: firebase deploy --only hosting"
echo "3. Verify reCAPTCHA key at: https://www.google.com/recaptcha/admin"
echo "4. Test booking from: https://www.rajala-services.com"
echo "5. Monitor logs at: Firebase Console > Functions > Logs"
echo ""
echo "For detailed instructions, see BOOKING_CALENDAR_FIXES.md"
echo ""
