#!/bin/bash
# Deployment Readiness Validation Script
# This script validates that all prerequisites are met for deployment

set -e

echo "🔍 Validating Deployment Readiness for Google Calendar Integration..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
ERRORS=0
WARNINGS=0

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

# Function to print info
info() {
    echo -e "ℹ $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking File Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "functions/index.js" ]; then
    success "functions/index.js exists"
else
    error "functions/index.js not found"
fi

if [ -f "functions/package.json" ]; then
    success "functions/package.json exists"
else
    error "functions/package.json not found"
fi

if [ -f "booking-system.js" ]; then
    success "booking-system.js exists"
else
    error "booking-system.js not found"
fi

if [ -f ".gitignore" ]; then
    success ".gitignore exists"
else
    warning ".gitignore not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking Node.js and Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "Node.js installed: $NODE_VERSION"
    
    # Check Node version >= 20
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -ge 20 ]; then
        success "Node.js version is 20 or higher"
    else
        error "Node.js version must be 20 or higher (current: $NODE_VERSION)"
    fi
else
    error "Node.js not installed"
fi

if [ -d "functions/node_modules" ]; then
    success "Dependencies installed in functions/"
else
    warning "Dependencies not installed. Run: cd functions && npm install"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking Required Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "functions/package.json" ]; then
    # Check for required dependencies
    REQUIRED_DEPS=("firebase-admin" "firebase-functions" "googleapis" "axios" "cors")
    
    for dep in "${REQUIRED_DEPS[@]}"; do
        if grep -q "\"$dep\"" functions/package.json; then
            success "$dep in package.json"
        else
            error "$dep not found in package.json"
        fi
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking Code Syntax"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v node &> /dev/null && [ -f "functions/index.js" ]; then
    if node -c functions/index.js 2>&1; then
        success "functions/index.js syntax is valid"
    else
        error "functions/index.js has syntax errors"
    fi
fi

if [ -f "booking-system.js" ]; then
    if node -c booking-system.js 2>&1; then
        success "booking-system.js syntax is valid"
    else
        error "booking-system.js has syntax errors"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Checking Security (Secrets Protection)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if sensitive files are in .gitignore
if [ -f ".gitignore" ]; then
    GITIGNORE_CHECKS=("service-account.json" ".runtimeconfig.json" ".env")
    
    for pattern in "${GITIGNORE_CHECKS[@]}"; do
        if grep -q "$pattern" .gitignore; then
            success "$pattern is in .gitignore"
        else
            warning "$pattern not found in .gitignore - ensure secrets are not committed"
        fi
    done
fi

# Check if any service account files exist in the repo
if find . -name "*service-account*.json" -not -path "./node_modules/*" -not -path "./.git/*" | grep -q .; then
    error "Service account JSON files found in repository! Remove them immediately!"
else
    success "No service account JSON files in repository"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Checking Firebase CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    success "Firebase CLI installed: $FIREBASE_VERSION"
else
    error "Firebase CLI not installed. Run: npm install -g firebase-tools"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Checking Firebase Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "firebase.json" ]; then
    success "firebase.json exists"
else
    error "firebase.json not found"
fi

if [ -f ".firebaserc" ] || [ -f ".firebaserc.txt" ]; then
    success "Firebase project configured"
else
    warning "Firebase project not configured (.firebaserc not found)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Checking Implementation Completeness"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for key functions in index.js
if [ -f "functions/index.js" ]; then
    KEY_FUNCTIONS=("exports.bookings" "exports.book" "isSlotAvailable" "verifyRecaptcha" "createGoogleCalendarEvent" "exports.onBookingUpdated" "exports.onBookingDeleted" "exports.calendarWebhook")
    
    for func in "${KEY_FUNCTIONS[@]}"; do
        if grep -q "$func" functions/index.js; then
            success "$func implemented"
        else
            error "$func not found in functions/index.js"
        fi
    done
fi

# Check for double-booking prevention
if [ -f "functions/index.js" ]; then
    if grep -q "runTransaction" functions/index.js; then
        success "Transaction-based booking (double-booking prevention) implemented"
    else
        error "Transaction-based booking not found - double bookings possible!"
    fi
    
    if grep -q "isSlotAvailable" functions/index.js; then
        success "Slot availability checker implemented"
    else
        error "Slot availability checker not implemented"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. Deployment Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "The following must be configured before deployment:"
echo ""
info "  1. Create Google Cloud service account"
info "  2. Enable Google Calendar API"
info "  3. Create Google Calendar for bookings"
info "  4. Share calendar with service account"
info "  5. Configure Firebase Functions:"
echo ""
echo "     firebase functions:config:set recaptcha.secret=\"YOUR_SECRET\""
echo "     firebase functions:config:set google.service_account=\"\$(cat key.json | jq -c)\""
echo "     firebase functions:config:set google.calendar_id=\"your-calendar-id@group.calendar.google.com\""
echo ""
info "  6. Deploy functions: firebase deploy --only functions"
info "  7. Register webhook with Google Calendar"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "✨ The code is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "  1. Review GOOGLE_CALENDAR_SETUP.md for setup instructions"
    echo "  2. Configure Firebase Functions environment variables"
    echo "  3. Deploy: firebase deploy --only functions"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with $WARNINGS warning(s)${NC}"
    echo "⚠️  Review warnings above before deployment."
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "❌ Fix errors above before deployment."
    exit 1
fi
