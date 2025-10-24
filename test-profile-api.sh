#!/bin/bash
# Quick API test script for Phase 2 - Enhanced Profile API Routes
# Run this after logging in to get a valid session cookie

echo "======================================"
echo "Testing Enhanced Profile API Routes"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo "${YELLOW}IMPORTANT: You must be logged in for these tests to work!${NC}"
echo "Please log in at: ${BASE_URL}/login"
echo ""
read -p "Press Enter when you're logged in and ready to test..."
echo ""

# Test 1: GET user-type (should return null initially)
echo "Test 1: GET /api/profile/user-type"
echo "Expected: null user_type for new users"
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/profile/user-type" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt)
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "user_type"; then
  echo -e "${GREEN}✓ PASS${NC} - User type endpoint working"
else
  echo -e "${RED}✗ FAIL${NC} - User type endpoint error"
fi
echo ""

# Test 2: PATCH user-type to 'player'
echo "Test 2: PATCH /api/profile/user-type"
echo "Setting user_type to 'player'"
RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/profile/user-type" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt \
  -d '{"user_type":"player"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"user_type":"player"'; then
  echo -e "${GREEN}✓ PASS${NC} - User type updated successfully"
else
  echo -e "${RED}✗ FAIL${NC} - User type update failed"
fi
echo ""

# Test 3: GET athletic profile (should be empty object)
echo "Test 3: GET /api/profile/athletic"
echo "Expected: Empty athletic profile"
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/profile/athletic" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt)
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "athletic_profile"; then
  echo -e "${GREEN}✓ PASS${NC} - Athletic profile endpoint working"
else
  echo -e "${RED}✗ FAIL${NC} - Athletic profile endpoint error"
fi
echo ""

# Test 4: PATCH athletic profile
echo "Test 4: PATCH /api/profile/athletic"
echo "Setting athletic profile with size M and position"
RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/profile/athletic" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt \
  -d '{
    "default_size": "M",
    "default_positions": ["Point Guard"],
    "preferred_jersey_number": "23",
    "fabric_preferences": {
      "breathability": "high",
      "fit": "slim"
    }
  }')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"default_size":"M"'; then
  echo -e "${GREEN}✓ PASS${NC} - Athletic profile updated successfully"
else
  echo -e "${RED}✗ FAIL${NC} - Athletic profile update failed"
fi
echo ""

# Test 5: GET manager profile
echo "Test 5: GET /api/profile/manager"
echo "Expected: Empty manager profile"
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/profile/manager" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt)
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "manager_profile"; then
  echo -e "${GREEN}✓ PASS${NC} - Manager profile endpoint working"
else
  echo -e "${RED}✗ FAIL${NC} - Manager profile endpoint error"
fi
echo ""

# Test 6: PATCH preferences
echo "Test 6: PATCH /api/profile/preferences"
echo "Setting notification preferences"
RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/profile/preferences" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt \
  -d '{
    "notifications": {
      "email": true,
      "order_updates": true,
      "design_updates": false
    },
    "language": "es",
    "theme": "dark"
  }')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"language":"es"'; then
  echo -e "${GREEN}✓ PASS${NC} - Preferences updated successfully"
else
  echo -e "${RED}✗ FAIL${NC} - Preferences update failed"
fi
echo ""

# Test 7: Verify data persists
echo "Test 7: Verify data persistence"
echo "Re-fetching user-type to confirm it saved"
RESPONSE=$(curl -s -X GET "${BASE_URL}/api/profile/user-type" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt)
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"user_type":"player"'; then
  echo -e "${GREEN}✓ PASS${NC} - Data persists correctly"
else
  echo -e "${RED}✗ FAIL${NC} - Data persistence issue"
fi
echo ""

# Test 8: Test validation (should reject invalid size)
echo "Test 8: Test validation"
echo "Attempting to set invalid size 'XXXL' (should fail)"
RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/profile/athletic" \
  -H "Content-Type: application/json" \
  --cookie cookies.txt \
  -d '{"default_size": "XXXL"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "error\|Invalid"; then
  echo -e "${GREEN}✓ PASS${NC} - Validation working correctly"
else
  echo -e "${RED}✗ FAIL${NC} - Validation not working"
fi
echo ""

# Cleanup
rm -f cookies.txt

echo "======================================"
echo "API Testing Complete!"
echo "======================================"
echo ""
echo "${YELLOW}Note: All tests assume you were logged in.${NC}"
echo "If tests failed, make sure:"
echo "  1. Dev server is running (npm run dev)"
echo "  2. You're logged in to the app"
echo "  3. Database migration ran successfully"
echo ""
