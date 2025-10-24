# Test Accounts for Enhanced Profile System
**Created:** January 18, 2025
**Purpose:** Testing profile system + player confirmation integration

---

## Test Account Strategy

Create 4 test accounts to cover all user journeys:
1. Player (uses athletic profile)
2. Manager (uses manager profile)
3. Hybrid (uses both profiles)
4. Admin (verifies data visibility)

---

## Account 1: Test Player

**Email:** `testplayer@deserve.test`
**Password:** `TestPlayer123!`
**Role:** `customer` (existing enum)
**User Type:** `player` (new field)

**Athletic Profile:**
```json
{
  "default_size": "M",
  "default_positions": ["Point Guard", "Shooting Guard"],
  "preferred_jersey_number": "23",
  "fabric_preferences": {
    "breathability": "high",
    "fit": "slim"
  },
  "measurements": {
    "height_cm": 180,
    "weight_kg": 75,
    "chest_cm": 95
  }
}
```

**Test Scenarios:**
- ✅ Fill athletic profile completely
- ✅ Create new team → Verify setup pre-fills
- ✅ Fill team setup → Verify confirmed_by_player = TRUE
- ✅ Join existing team → Verify collection link pre-fills
- ✅ Update profile → Verify new teams use new defaults
- ✅ Check roster shows "Confirmado" badge

---

## Account 2: Test Manager

**Email:** `testmanager@deserve.test`
**Password:** `TestManager123!`
**Role:** `customer`
**User Type:** `manager`

**Manager Profile:**
```json
{
  "organization_name": "Springfield High School",
  "organization_type": "school",
  "shipping_addresses": [
    {
      "label": "School Main Office",
      "street": "123 Main St",
      "city": "Springfield",
      "region": "Región Metropolitana de Santiago",
      "postal_code": "8320000",
      "country": "Chile",
      "is_primary": true
    }
  ],
  "billing_info": {
    "tax_id": "76.123.456-7",
    "billing_email": "accounting@springfield.test"
  },
  "primary_contact": {
    "name": "John Manager",
    "phone": "+56 9 8765 4321",
    "email": "john@springfield.test"
  }
}
```

**Test Scenarios:**
- ✅ Fill manager profile completely
- ✅ Create team → Choose "Soy solo el Manager"
- ✅ Verify manager_only_team = TRUE
- ✅ Manually add 3 players
- ✅ Verify players have confirmed_by_player = FALSE
- ✅ Create order → See warning modal
- ✅ Proceed with order → Verify soft enforcement
- ✅ Send collection links
- ✅ Check roster shows "Pendiente" badges

---

## Account 3: Test Hybrid

**Email:** `testhybrid@deserve.test`
**Password:** `TestHybrid123!`
**Role:** `customer`
**User Type:** `hybrid`

**Athletic Profile:**
```json
{
  "default_size": "L",
  "default_positions": ["Midfielder", "Forward"],
  "preferred_jersey_number": "10",
  "fabric_preferences": {
    "breathability": "standard",
    "fit": "regular"
  }
}
```

**Manager Profile:**
```json
{
  "organization_name": "Riverside Soccer Club",
  "organization_type": "club",
  "shipping_addresses": [
    {
      "label": "Club House",
      "street": "456 River Rd",
      "city": "Santiago",
      "region": "Región Metropolitana de Santiago",
      "postal_code": "8330000",
      "country": "Chile",
      "is_primary": true
    }
  ]
}
```

**Test Scenarios:**
- ✅ Fill BOTH athletic AND manager profiles
- ✅ Create team as player-manager
- ✅ Fill setup form → Verify pre-fills from athletic profile
- ✅ Verify confirmed_by_player = TRUE for self
- ✅ Add other players manually
- ✅ Verify mixed confirmation statuses
- ✅ Create design request → Verify role switching works
- ✅ Check both profile sections visible in settings

---

## Account 4: Test Admin

**Email:** `testadmin@deserve.test`
**Password:** `TestAdmin123!`
**Role:** `customer`
**User Type:** `null` (admins don't need user_type)
**is_admin:** `TRUE`

**Test Scenarios:**
- ✅ View user list → See all 3 test accounts
- ✅ Check user_type badges displayed
- ✅ View athletic profile summaries (read-only)
- ✅ View manager profile summaries (read-only)
- ✅ View team roster → See confirmation badges
- ✅ View orders → See unconfirmed_player_count
- ✅ Verify cannot edit user profiles
- ✅ Verify CAN edit teams/orders

---

## Setup Instructions

### Step 1: Create Accounts

Use Supabase Studio or run SQL:

```sql
-- Create test player
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('testplayer@deserve.test', crypt('TestPlayer123!', gen_salt('bf')), NOW())
RETURNING id;

-- Create profile
INSERT INTO profiles (id, full_name, is_admin, role, user_type, athletic_profile)
VALUES (
  '<USER_ID_FROM_ABOVE>',
  'Test Player',
  FALSE,
  'customer',
  'player',
  '{"default_size": "M", "default_positions": ["Point Guard"], "preferred_jersey_number": "23"}'::jsonb
);

-- Repeat for other accounts...
```

### Step 2: Verify Accounts

```sql
-- Check all test accounts exist
SELECT id, email, full_name, user_type, is_admin
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email LIKE '%@deserve.test';
```

### Step 3: Manual Verification

1. Log in to each account
2. Navigate to `/dashboard/account`
3. Verify profile sections visible based on user_type
4. Fill out profiles
5. Create teams and test scenarios

---

## Testing Checklist

### Profile System Tests

- [ ] Player sees only athletic profile section
- [ ] Manager sees only manager profile section
- [ ] Hybrid sees both sections
- [ ] Admin sees all user profiles (read-only)
- [ ] Profile data saves correctly
- [ ] Validation rejects invalid data

### Smart Defaults Tests

- [ ] Team setup pre-fills from athletic profile
- [ ] Collection link pre-fills if authenticated
- [ ] Design request pre-fills player step
- [ ] Manual player addition does NOT pre-fill
- [ ] User can override all pre-filled values
- [ ] "Smart defaults applied" badge shows

### Confirmation Integration Tests

- [ ] Self-submission marks confirmed_by_player = TRUE
- [ ] Manager-added player has confirmed_by_player = FALSE
- [ ] Roster shows correct badge colors
- [ ] Order creation shows warning modal if unconfirmed
- [ ] Order proceeds anyway (soft enforcement)
- [ ] Order.has_unconfirmed_players tracks correctly

### Multi-Team Tests

- [ ] User can join multiple teams
- [ ] Each team uses current profile defaults
- [ ] Updating profile doesn't change existing submissions
- [ ] Team roster shows all members correctly

### Edge Cases

- [ ] Empty athletic profile → No pre-fill, no errors
- [ ] Partial athletic profile → Pre-fills available fields only
- [ ] User changes user_type → UI sections update
- [ ] Profile with invalid data → Validation errors shown

---

## Cleanup After Testing

```sql
-- Delete test accounts and all related data
DELETE FROM profiles WHERE full_name LIKE 'Test %';
DELETE FROM auth.users WHERE email LIKE '%@deserve.test';

-- Verify cleanup
SELECT COUNT(*) FROM profiles WHERE full_name LIKE 'Test %';
-- Expected: 0
```

---

## Production Account Creation

**DO NOT create test accounts in production.**

Instead:
1. Use staging environment for testing
2. Create real accounts with real emails for production testing
3. Delete test data immediately after verification

---

## Security Notes

- Test passwords use simple patterns for ease of testing
- Production passwords should be strong and unique
- Test accounts should be deleted after implementation
- Never commit actual passwords to git

---

**Last Updated:** January 18, 2025
**Status:** Ready for account creation in Phase 1
