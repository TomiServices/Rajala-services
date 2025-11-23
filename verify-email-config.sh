#!/bin/bash
# Email Configuration Verification Script
# This script helps verify the email configuration for booking confirmations

echo "================================================"
echo "Email Configuration Verification"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Nodemailer Package
echo "1. Checking Nodemailer Installation..."
if [ -f "functions/package.json" ]; then
    if grep -q '"nodemailer"' functions/package.json; then
        NODEMAILER_VERSION=$(grep -A 1 '"nodemailer":' functions/package.json | grep -oP '\^?\K[0-9.]+' | head -1)
        echo -e "${GREEN}✓${NC} Nodemailer installed: v$NODEMAILER_VERSION"
    else
        echo -e "${RED}✗${NC} Nodemailer not found in package.json"
    fi
else
    echo -e "${RED}✗${NC} functions/package.json not found"
fi

# Check 2: Email Functions in index.js
echo ""
echo "2. Checking Email Functions..."
if [ -f "functions/index.js" ]; then
    if grep -q "initializeEmailTransporter" functions/index.js; then
        echo -e "${GREEN}✓${NC} initializeEmailTransporter function found"
    else
        echo -e "${RED}✗${NC} initializeEmailTransporter function missing"
    fi
    
    if grep -q "sendBookingConfirmationEmail" functions/index.js; then
        echo -e "${GREEN}✓${NC} sendBookingConfirmationEmail function found"
    else
        echo -e "${RED}✗${NC} sendBookingConfirmationEmail function missing"
    fi
    
    if grep -q "onBookingCreated" functions/index.js; then
        echo -e "${GREEN}✓${NC} onBookingCreated trigger found"
    else
        echo -e "${RED}✗${NC} onBookingCreated trigger missing"
    fi
else
    echo -e "${RED}✗${NC} functions/index.js not found"
fi

# Check 3: Environment Configuration Files
echo ""
echo "3. Checking Configuration Files..."
if [ -f "functions/.env.example" ]; then
    if grep -q "EMAIL_USER" functions/.env.example; then
        echo -e "${GREEN}✓${NC} .env.example includes EMAIL_USER"
    else
        echo -e "${RED}✗${NC} .env.example missing EMAIL_USER"
    fi
    
    if grep -q "EMAIL_PASSWORD" functions/.env.example; then
        echo -e "${GREEN}✓${NC} .env.example includes EMAIL_PASSWORD"
    else
        echo -e "${RED}✗${NC} .env.example missing EMAIL_PASSWORD"
    fi
else
    echo -e "${YELLOW}⚠${NC} functions/.env.example not found"
fi

if [ -f "functions/.runtimeconfig.json.example" ]; then
    if grep -q '"email"' functions/.runtimeconfig.json.example; then
        echo -e "${GREEN}✓${NC} .runtimeconfig.json.example includes email config"
    else
        echo -e "${RED}✗${NC} .runtimeconfig.json.example missing email config"
    fi
else
    echo -e "${YELLOW}⚠${NC} functions/.runtimeconfig.json.example not found"
fi

# Check 4: Local Development Configuration
echo ""
echo "4. Checking Local Configuration..."
if [ -f "functions/.env" ]; then
    if grep -q "EMAIL_USER" functions/.env && [ -n "$(grep 'EMAIL_USER=' functions/.env | cut -d= -f2)" ]; then
        EMAIL_USER=$(grep 'EMAIL_USER=' functions/.env | cut -d= -f2)
        echo -e "${GREEN}✓${NC} EMAIL_USER configured: $EMAIL_USER"
    else
        echo -e "${YELLOW}⚠${NC} EMAIL_USER not configured in .env"
    fi
    
    if grep -q "EMAIL_PASSWORD" functions/.env && [ -n "$(grep 'EMAIL_PASSWORD=' functions/.env | cut -d= -f2)" ]; then
        echo -e "${GREEN}✓${NC} EMAIL_PASSWORD configured (hidden)"
    else
        echo -e "${YELLOW}⚠${NC} EMAIL_PASSWORD not configured in .env"
    fi
else
    echo -e "${YELLOW}⚠${NC} functions/.env not found (copy from .env.example)"
fi

if [ -f "functions/.runtimeconfig.json" ]; then
    if grep -q '"email"' functions/.runtimeconfig.json; then
        echo -e "${GREEN}✓${NC} .runtimeconfig.json includes email config"
        
        # Check specific fields
        if grep -q '"user"' functions/.runtimeconfig.json; then
            echo -e "${GREEN}✓${NC} email.user configured"
        fi
        
        if grep -q '"password"' functions/.runtimeconfig.json; then
            echo -e "${GREEN}✓${NC} email.password configured"
        fi
    else
        echo -e "${YELLOW}⚠${NC} .runtimeconfig.json missing email config"
    fi
else
    echo -e "${YELLOW}⚠${NC} functions/.runtimeconfig.json not found (copy from .runtimeconfig.json.example)"
fi

# Check 5: Production Configuration (if Firebase CLI available)
echo ""
echo "5. Checking Production Configuration..."
if command -v firebase &> /dev/null; then
    echo -e "${YELLOW}ℹ${NC} Checking Firebase Functions config..."
    CONFIG_OUTPUT=$(firebase functions:config:get 2>&1)
    
    if echo "$CONFIG_OUTPUT" | grep -q '"email"'; then
        echo -e "${GREEN}✓${NC} Email config exists in production"
        
        if echo "$CONFIG_OUTPUT" | grep -q '"user"'; then
            echo -e "${GREEN}✓${NC} email.user configured in production"
        fi
        
        if echo "$CONFIG_OUTPUT" | grep -q '"password"'; then
            echo -e "${GREEN}✓${NC} email.password configured in production"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Email config not found in production"
        echo -e "${YELLOW}ℹ${NC} Set with: firebase functions:config:set email.user=\"your@email.com\" email.password=\"your-app-password\""
    fi
else
    echo -e "${YELLOW}⚠${NC} Firebase CLI not installed, skipping production config check"
fi

# Check 6: Documentation
echo ""
echo "6. Checking Documentation..."
if [ -f "EMAIL_CONFIGURATION.md" ]; then
    echo -e "${GREEN}✓${NC} EMAIL_CONFIGURATION.md exists"
else
    echo -e "${RED}✗${NC} EMAIL_CONFIGURATION.md missing"
fi

if [ -f "BOOKING_SYSTEM_INTEGRATION.md" ]; then
    echo -e "${GREEN}✓${NC} BOOKING_SYSTEM_INTEGRATION.md exists"
else
    echo -e "${RED}✗${NC} BOOKING_SYSTEM_INTEGRATION.md missing"
fi

# Check 7: Syntax Validation
echo ""
echo "7. Validating JavaScript Syntax..."
if command -v node &> /dev/null; then
    if node -c functions/index.js 2>/dev/null; then
        echo -e "${GREEN}✓${NC} functions/index.js syntax valid"
    else
        echo -e "${RED}✗${NC} functions/index.js has syntax errors"
        node -c functions/index.js
    fi
else
    echo -e "${YELLOW}⚠${NC} Node.js not found, skipping syntax validation"
fi

# Check 8: Security Checks
echo ""
echo "8. Security Checks..."
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore; then
        echo -e "${GREEN}✓${NC} .env in .gitignore"
    else
        echo -e "${RED}✗${NC} .env NOT in .gitignore (SECURITY RISK!)"
    fi
    
    if grep -q ".runtimeconfig.json" .gitignore; then
        echo -e "${GREEN}✓${NC} .runtimeconfig.json in .gitignore"
    else
        echo -e "${RED}✗${NC} .runtimeconfig.json NOT in .gitignore (SECURITY RISK!)"
    fi
else
    echo -e "${RED}✗${NC} .gitignore not found"
fi

# Check if credentials are accidentally committed
if git rev-parse --git-dir > /dev/null 2>&1; then
    if git ls-files | grep -q "functions/.env$"; then
        echo -e "${RED}✗${NC} functions/.env is tracked by git (REMOVE IMMEDIATELY!)"
    else
        echo -e "${GREEN}✓${NC} functions/.env not tracked by git"
    fi
    
    if git ls-files | grep -q "functions/.runtimeconfig.json$"; then
        echo -e "${RED}✗${NC} functions/.runtimeconfig.json is tracked by git (REMOVE IMMEDIATELY!)"
    else
        echo -e "${GREEN}✓${NC} functions/.runtimeconfig.json not tracked by git"
    fi
fi

# Summary
echo ""
echo "================================================"
echo "Configuration Summary"
echo "================================================"

# Determine overall status
if [ -f "functions/.env" ] || [ -f "functions/.runtimeconfig.json" ]; then
    echo -e "${GREEN}✓${NC} Local development configuration found"
else
    echo -e "${YELLOW}⚠${NC} No local configuration found"
fi

echo ""
echo "================================================"
echo "Next Steps"
echo "================================================"
echo ""
echo "For Local Development:"
echo "  1. Copy configuration template:"
echo "     cd functions"
echo "     cp .env.example .env"
echo "  2. Edit .env and add your Gmail credentials"
echo "  3. See EMAIL_CONFIGURATION.md for Gmail App Password setup"
echo ""
echo "For Production Deployment:"
echo "  1. Set email configuration:"
echo "     firebase functions:config:set \\"
echo "       email.user=\"your-email@gmail.com\" \\"
echo "       email.password=\"your-app-password\" \\"
echo "       email.from=\"Rajala Services <noreply@rajala-services.com>\""
echo "  2. Deploy functions:"
echo "     firebase deploy --only functions"
echo ""
echo "To Test Email Configuration:"
echo "  1. See EMAIL_CONFIGURATION.md for test scripts"
echo "  2. Start emulator: firebase emulators:start"
echo "  3. Create a test booking"
echo "  4. Check function logs for email status"
echo ""
echo "Documentation:"
echo "  • EMAIL_CONFIGURATION.md - Complete setup guide"
echo "  • BOOKING_SYSTEM_INTEGRATION.md - Integration overview"
echo "  • ENVIRONMENT_VARIABLES.md - All configuration variables"
echo ""
