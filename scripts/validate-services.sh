#!/bin/bash
# ============================================
# External Services Validation Script
# ============================================
# Tests connectivity and configuration for all external services
# Run this script to verify system setup before deployment
#
# Usage:
#   chmod +x scripts/validate-services.sh
#   ./scripts/validate-services.sh
#
# Created: January 13, 2026
# ============================================

# Don't exit on errors - we want to collect all results
# This allows the script to report all failures rather than stopping at the first one
set +e

# Expected configuration values (update these if they change)
EXPECTED_RECAPTCHA_SITE_KEY="6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr"
EXPECTED_GA_MEASUREMENT_ID="G-SP5R1MN1H9"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}Testing:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

print_failure() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

# ============================================
# Main Script
# ============================================

print_header "External Services Validation Script"
echo "Started: $(date)"
echo "Location: $(pwd)"
echo ""

# ============================================
# 1. Environment Check
# ============================================

print_header "1. Environment Check"

print_test "Node.js version"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_success "Node.js $NODE_VERSION (>= 18 required)"
    else
        print_failure "Node.js $NODE_VERSION (>= 18 required)"
    fi
else
    print_failure "Node.js not found"
fi

print_test "npm version"
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION"
else
    print_failure "npm not found"
fi

print_test "Firebase CLI"
if command -v firebase >/dev/null 2>&1; then
    FIREBASE_VERSION=$(firebase --version)
    print_success "Firebase CLI $FIREBASE_VERSION"
else
    print_failure "Firebase CLI not found. Install: npm install -g firebase-tools"
fi

print_test "Git version"
if command -v git >/dev/null 2>&1; then
    GIT_VERSION=$(git --version)
    print_success "$GIT_VERSION"
else
    print_warning "Git not found (optional but recommended)"
fi

# ============================================
# 2. Firebase Configuration
# ============================================

print_header "2. Firebase Configuration"

print_test "Firebase project"
if [ -f ".firebaserc" ]; then
    PROJECT_ID=$(cat .firebaserc | grep -o '"main": "[^"]*"' | cut -d'"' -f4)
    print_success "Firebase project: $PROJECT_ID"
else
    print_failure ".firebaserc not found"
fi

print_test "firebase.json"
if [ -f "firebase.json" ]; then
    print_success "firebase.json exists"
    
    # Check hosting configuration
    if grep -q '"hosting"' firebase.json; then
        print_success "Hosting configured"
    else
        print_warning "Hosting not configured in firebase.json"
    fi
    
    # Check functions configuration
    if grep -q '"functions"' firebase.json; then
        print_success "Functions configured"
    else
        print_warning "Functions not configured in firebase.json"
    fi
else
    print_failure "firebase.json not found"
fi

# ============================================
# 3. Functions Configuration
# ============================================

print_header "3. Functions Configuration"

print_test "functions directory"
if [ -d "functions" ]; then
    print_success "functions/ directory exists"
else
    print_failure "functions/ directory not found"
    exit 1
fi

print_test "functions/package.json"
if [ -f "functions/package.json" ]; then
    print_success "package.json exists"
    
    # Check Node.js engine version
    ENGINE_VERSION=$(cat functions/package.json | grep -o '"node": "[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$ENGINE_VERSION" ]; then
        print_success "Node.js engine: $ENGINE_VERSION"
    else
        print_warning "Node.js engine version not specified"
    fi
else
    print_failure "functions/package.json not found"
fi

print_test "functions/node_modules"
if [ -d "functions/node_modules" ]; then
    print_success "Dependencies installed"
else
    print_warning "Dependencies not installed. Run: cd functions && npm install"
fi

print_test "functions/.env file"
if [ -f "functions/.env" ]; then
    print_success ".env file exists"
else
    print_warning ".env file not found. Copy from .env.example and configure"
fi

print_test "functions/.env.example"
if [ -f "functions/.env.example" ]; then
    print_success ".env.example exists"
else
    print_failure ".env.example not found"
fi

# ============================================
# 4. Environment Variables Check
# ============================================

print_header "4. Environment Variables Check"

if [ -f "functions/.env" ]; then
    print_test "EMAIL_USER"
    if grep -q "EMAIL_USER=" functions/.env && ! grep -q "EMAIL_USER=your-email" functions/.env; then
        EMAIL_USER=$(grep "EMAIL_USER=" functions/.env | cut -d'=' -f2)
        print_success "EMAIL_USER is set: $EMAIL_USER"
    else
        print_failure "EMAIL_USER not configured"
    fi
    
    print_test "EMAIL_PASSWORD"
    if grep -q "EMAIL_PASSWORD=" functions/.env && ! grep -q "EMAIL_PASSWORD=your-" functions/.env; then
        print_success "EMAIL_PASSWORD is set"
    else
        print_warning "EMAIL_PASSWORD not configured (or stored in Secret Manager)"
    fi
    
    print_test "EMAIL_FROM"
    if grep -q "EMAIL_FROM=" functions/.env && ! grep -q "EMAIL_FROM=Rajala Services <noreply@fixnero.fi>" functions/.env; then
        EMAIL_FROM=$(grep "EMAIL_FROM=" functions/.env | cut -d'=' -f2)
        print_success "EMAIL_FROM is set: $EMAIL_FROM"
    else
        print_warning "EMAIL_FROM using default value"
    fi
    
    print_test "GOOGLE_CALENDAR_ID"
    if grep -q "GOOGLE_CALENDAR_ID=" functions/.env && ! grep -q "GOOGLE_CALENDAR_ID=your_calendar" functions/.env; then
        CALENDAR_ID=$(grep "GOOGLE_CALENDAR_ID=" functions/.env | cut -d'=' -f2)
        print_success "GOOGLE_CALENDAR_ID is set: $CALENDAR_ID"
    else
        print_failure "GOOGLE_CALENDAR_ID not configured"
    fi
    
    print_test "GOOGLE_SERVICE_ACCOUNT"
    if grep -q "GOOGLE_SERVICE_ACCOUNT=" functions/.env && ! grep -q "GOOGLE_SERVICE_ACCOUNT={\"type\":\"service_account\",\"project_id\":\"your-project\"" functions/.env; then
        print_success "GOOGLE_SERVICE_ACCOUNT is set"
        
        # Try to validate JSON (if jq available)
        if command -v jq >/dev/null 2>&1; then
            SERVICE_ACCOUNT=$(grep "GOOGLE_SERVICE_ACCOUNT=" functions/.env | cut -d'=' -f2-)
            if echo "$SERVICE_ACCOUNT" | jq empty 2>/dev/null; then
                print_success "GOOGLE_SERVICE_ACCOUNT is valid JSON"
            else
                print_warning "GOOGLE_SERVICE_ACCOUNT may not be valid JSON"
            fi
        fi
    else
        print_failure "GOOGLE_SERVICE_ACCOUNT not configured"
    fi
else
    print_warning "Skipping environment variable checks (no .env file)"
fi

# ============================================
# 5. Website Files Check
# ============================================

print_header "5. Website Files Check"

print_test "index.html"
if [ -f "index.html" ]; then
    print_success "index.html exists"
    
    # Check for reCAPTCHA site key
    if grep -q "$EXPECTED_RECAPTCHA_SITE_KEY" index.html; then
        print_success "reCAPTCHA site key found"
    else
        print_warning "reCAPTCHA site key not found or different"
    fi
    
    # Check for Google Analytics
    if grep -q "$EXPECTED_GA_MEASUREMENT_ID" index.html || grep -q "$EXPECTED_GA_MEASUREMENT_ID" static/js/cookie-consent.js 2>/dev/null; then
        print_success "Google Analytics measurement ID found"
    else
        print_warning "Google Analytics measurement ID not found"
    fi
else
    print_failure "index.html not found"
fi

print_test "static/js/booking-system.js"
if [ -f "static/js/booking-system.js" ]; then
    print_success "booking-system.js exists"
    
    # Check for reCAPTCHA configuration
    if grep -q "RECAPTCHA_SITE_KEY" static/js/booking-system.js; then
        print_success "reCAPTCHA configuration found"
    else
        print_warning "reCAPTCHA configuration not found"
    fi
else
    print_failure "booking-system.js not found"
fi

print_test "static/js/cookie-consent.js"
if [ -f "static/js/cookie-consent.js" ]; then
    print_success "cookie-consent.js exists"
else
    print_warning "cookie-consent.js not found (optional)"
fi

# ============================================
# 6. Documentation Check
# ============================================

print_header "6. Documentation Check"

print_test "README files"
if [ -f "README.md" ] || [ -f "functions/README.md" ]; then
    print_success "README documentation exists"
else
    print_warning "No README files found"
fi

print_test "Migration guide"
if [ -f "docs/MIGRATION_GUIDE.md" ]; then
    print_success "MIGRATION_GUIDE.md exists"
else
    print_warning "MIGRATION_GUIDE.md not found"
fi

print_test "Administrator guide"
if [ -f "docs/ADMINISTRATOR_SETUP_GUIDE.md" ]; then
    print_success "ADMINISTRATOR_SETUP_GUIDE.md exists"
else
    print_warning "ADMINISTRATOR_SETUP_GUIDE.md not found"
fi

print_test "Configuration guide"
if [ -f "docs/CONFIGURATION.md" ]; then
    print_success "CONFIGURATION.md exists"
else
    print_warning "CONFIGURATION.md not found"
fi

print_test "External services audit"
if [ -f "docs/EXTERNAL_SERVICES_AUDIT.md" ]; then
    print_success "EXTERNAL_SERVICES_AUDIT.md exists"
else
    print_warning "EXTERNAL_SERVICES_AUDIT.md not found"
fi

# ============================================
# 7. Security Check
# ============================================

print_header "7. Security Check"

print_test ".gitignore configuration"
if [ -f ".gitignore" ]; then
    print_success ".gitignore exists"
    
    # Check for .env in gitignore
    if grep -q "\.env" .gitignore; then
        print_success ".env files are ignored by Git"
    else
        print_failure ".env files NOT ignored by Git (SECURITY RISK!)"
    fi
    
    # Check for service account files
    if grep -q "service-account" .gitignore; then
        print_success "Service account files are ignored"
    else
        print_warning "Service account files may not be ignored"
    fi
else
    print_failure ".gitignore not found (SECURITY RISK!)"
fi

# ============================================
# Summary
# ============================================

print_header "Validation Summary"

echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review any warnings above"
    echo "  2. Configure missing environment variables if needed"
    echo "  3. Test booking flow manually"
    echo "  4. Run: firebase deploy"
    echo ""
    exit 0
elif [ $FAILED -le 3 ]; then
    echo -e "${YELLOW}⚠️  Some tests failed, but system may still work${NC}"
    echo ""
    echo "Please review failed tests above and fix critical issues."
    echo ""
    exit 1
else
    echo -e "${RED}❌ Multiple critical tests failed${NC}"
    echo ""
    echo "Please fix the issues above before deployment."
    echo "See documentation in docs/ for help."
    echo ""
    exit 1
fi
