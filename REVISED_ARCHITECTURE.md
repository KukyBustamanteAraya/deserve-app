# Deserve App - Revised Architecture & Implementation Plan

## Core Architecture Principles

### 1. Three Separate Systems (NOT Permissions)

#### A. `user_type` (Profile Data Type)
**Purpose:** Determines what profile data the user has filled out
**Values:** `player`, `manager`, `athletic_director`, `hybrid`

- **player**: Has `athletic_profile` (sports, positions, jersey number)
- **manager**: Has `manager_profile` (organization, contact info)
- **athletic_director**: Has `manager_profile` + can manage multiple institution teams
- **hybrid**: Has BOTH `athletic_profile` AND `manager_profile`

**NOT a permission system!** Any user_type can create any team type.

#### B. `team_type` (Team Structure)
**Purpose:** Determines the organizational structure of the team
**Values:** `single_team`, `institution`

- **single_team**: One standalone team (e.g., "Los Cabros" soccer team)
- **institution**: Parent organization with multiple sub-teams (e.g., "Universidad de Chile" with soccer, basketball, volleyball teams)

**Any user can create any team_type!** The type determines structure, not permissions.

#### C. `team_membership.role` (Role Within Specific Team)
**Purpose:** Determines responsibilities WITHIN a specific team
**Values:** `player`, `manager`, `owner`

- **player**: Member on the roster, can view team, submit info
- **manager**: Handles uniforms, orders, roster management (transferable)
- **owner**: Full control - creator of team (permanent, can't be removed, has all manager permissions)

**Roles are team-specific. Only 'owner' role is permanent - others can be reassigned!**
**Note:** Each user can only have ONE role per team in team_memberships.

---

## Key Scenarios

### Scenario 1: Player Creates a Team
**User:** user_type = 'player'
**Action:** Creates "Los Cabros" soccer team

**What Happens:**
1. ✅ User CAN create the team (any user_type can create any team_type)
2. ✅ Team creation pre-fills sport from user's `athletic_profile.primary_sport`
3. ✅ User is automatically added to team with TWO roles:
   - `team_memberships`: role = 'admin' (creator, can't be removed)
   - `team_memberships`: role = 'manager' (handles orders)
   - `team_players`: Added as a player on roster
4. ✅ User can later transfer 'manager' role to another player
5. ✅ User remains as 'admin' (creator) permanently

### Scenario 2: Athletic Director Creates Institution
**User:** user_type = 'athletic_director'
**Action:** Creates "Universidad de Chile" institution with 3 sub-teams

**What Happens:**
1. ✅ User CAN create institution team (any user_type can create any team_type)
2. ✅ Team creation pre-fills org name from user's `manager_profile.organization_name`
3. ✅ User becomes 'admin' + 'manager' of parent institution
4. ✅ User can create multiple sub-teams under the institution
5. ✅ User might ALSO be a player on one of the sub-teams (if they have athletic_profile)

### Scenario 3: Hybrid User
**User:** user_type = 'hybrid'
**Action:** Creates any team

**What Happens:**
1. ✅ Has BOTH athletic_profile AND manager_profile
2. ✅ Can choose to pre-fill from either profile during team creation
3. ✅ Can be both a player on roster AND manager of the team
4. ✅ Perfect for player-coaches or team captains who manage uniforms

---

## Implementation Plan (Revised)

### Phase 1: Profile Foundation ✅ COMPLETE
- ✅ Created `useProfile()` hook
- ✅ Created profile setup wizard with user_type selection
- ✅ Redirect new users to profile setup after registration
- ✅ Store athletic_profile and manager_profile as JSONB

### Phase 2: Smart Team Creation (NEXT)
**Goal:** Pre-fill team creation from profile, assign appropriate roles

#### 2.1 Team Creation Pre-filling
- **ANY user_type can create ANY team_type** (no restrictions)
- Pre-fill based on user_type:
  - `player` → Pre-fill sport from athletic_profile.primary_sport
  - `manager`/`athletic_director` → Pre-fill org name from manager_profile
  - `hybrid` → Offer choice: "Create as player" or "Create as organization"

#### 2.2 Automatic Role Assignment
When creating a team:
- **Creator always gets:**
  - `team_memberships`: role = 'admin' (permanent, can't be removed)
  - `team_memberships`: role = 'manager' (can be transferred later)

- **If creator has athletic_profile (player/hybrid):**
  - Also added to `team_players` with their positions from profile

#### 2.3 Team Page Role Management
- Show "Transfer Manager Role" button to allow reassigning manager responsibilities
- Show team_membership roles clearly
- Allow managers to promote players to manager role

### Phase 3: Design Wizard Pre-filling
**Goal:** Use profile data to speed up design wizard

#### 3.1 Pre-fill from User Profile
- If user has athletic_profile → Pre-fill sport selection
- If team exists → Pre-fill sport from team.sport_id
- Pre-fill player info if they're adding themselves

#### 3.2 Pre-fill from Team Data
- When designing for a team, use team.sport_id
- Use team roster for player suggestions
- Use team colors if already defined

### Phase 4: Orders & Checkout
**Goal:** Payment mode and addresses based on team_type (NOT user_type)

#### 4.1 Payment Mode Logic
```typescript
// Determined by TEAM TYPE, not user type
if (team.team_type === 'single_team') {
  payment_mode = 'full_payment'; // Players pay individually
} else if (team.team_type === 'institution') {
  payment_mode = 'invoiced'; // Institution pays centrally
}
```

#### 4.2 Shipping Address Logic
- **single_team**: Show player's personal addresses
- **institution**: Show organization's shipping addresses from `shipping_addresses` table
- Manager role can add/edit shipping addresses for the team

### Phase 5: User Flow Optimization
**Goal:** Smooth experience from homepage → catalog → design

- Persist sport selection across pages
- Use profile.athletic_profile.primary_sport as default
- Remember last-used sport in session
- Smooth transitions with sport context

---

## Database Schema Alignment

### profiles table
```sql
- user_type: 'player' | 'manager' | 'athletic_director' | 'hybrid'
- athletic_profile: jsonb  -- Only if player/hybrid
- manager_profile: jsonb   -- Only if manager/athletic_director/hybrid
```

### teams table
```sql
- team_type: 'single_team' | 'institution'
- sport_id: references sports(id)  -- Can be NULL for institutions
- created_by: references profiles(id)
```

### team_memberships table
```sql
- role: 'player' | 'manager' | 'admin'
- Multiple roles per user per team (user can be both manager AND player)
```

### team_players table
```sql
- Separate from memberships
- Tracks roster position, jersey number, starter status
- Used for field visualization
```

### orders table
```sql
- payment_mode: 'full_payment' | 'invoiced'
- Determined by team.team_type at order creation
```

---

## Key Implementation Rules

1. ✅ **Never block actions based on user_type alone**
2. ✅ **Use user_type to determine what data to pre-fill**
3. ✅ **Use team_type to determine payment/shipping flow**
4. ✅ **Use team_memberships.role to control team-specific permissions**
5. ✅ **Allow role transfers within teams (except 'admin')**
6. ✅ **Pre-fill aggressively to reduce user friction**
7. ✅ **Always check profile exists before pre-filling**

---

## Testing Checklist

- [ ] Player (user_type) can create single_team
- [ ] Player (user_type) can create institution team
- [ ] Athletic director can create single_team (for their personal weekend team)
- [ ] Manager without athletic_profile can't see athletic form fields
- [ ] Hybrid user sees both profile forms
- [ ] Team creator gets both admin + manager roles
- [ ] Manager role can be transferred to another team member
- [ ] Payment mode correct for single_team (full_payment)
- [ ] Payment mode correct for institution (invoiced)
- [ ] Profile data pre-fills team creation correctly
- [ ] Profile data pre-fills design wizard correctly

---

**Last Updated:** 2025-10-18
**Status:** Phase 1 Complete, Starting Phase 2
