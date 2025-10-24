# Design Wizard Team Creation Flow Analysis
## Manager-Only Implementation Impact Assessment

---

## EXECUTIVE SUMMARY

The design wizard has a **two-tier architecture** depending on team type:

1. **Single Team Flow** (5 steps): Loads team directly from database at entry point
2. **Institution Flow** (6 steps): Allows team selection and new team creation

The wizard **does NOT assume the creator is a player** - it only stores `requested_by: user.id` with the design request. However, there are important implications for implementing a manager-only option.

---

## 1. WIZARD FILE LOCATIONS

### Core Files:
- **Entry Point**: `/src/app/mi-equipo/[slug]/design-request/new/page.tsx`
- **Team Selection**: `/src/app/mi-equipo/[slug]/design-request/new/teams/page.tsx`
- **Products**: `/src/app/mi-equipo/[slug]/design-request/new/products/page.tsx`
- **Designs**: `/src/app/mi-equipo/[slug]/design-request/new/designs/page.tsx`
- **Colors**: `/src/app/mi-equipo/[slug]/design-request/new/colors/page.tsx`
- **Quantities**: `/src/app/mi-equipo/[slug]/design-request/new/quantities/page.tsx`
- **Review**: `/src/app/mi-equipo/[slug]/design-request/new/review/page.tsx`

### State Management:
- **Store**: `/src/store/design-request-wizard.ts` (Zustand with persistence)
- **Layout Component**: `/src/components/institution/design-request/WizardLayout.tsx`

### API Endpoints:
- **Create Sub-Teams**: `/src/app/api/institutions/[slug]/sub-teams/route.ts`

---

## 2. CURRENT TEAM CREATION FLOW

### Step 1: Entry Point (new/page.tsx)

Routes based on team type:
- Single Team: Initialize selectedTeams with current team → Products
- Institution: Route to Teams Selection

**Key Code**:
```typescript
if (team.team_type === 'institution') {
  router.push(`/mi-equipo/${slug}/design-request/new/teams`);
} else {
  setSelectedTeams([{
    id: team.id,
    name: team.name,
    isNew: false,
  }]);
  router.push(`/mi-equipo/${slug}/design-request/new/products`);
}
```

**Observation**: No player data validation at this stage.

### Step 2: Team Selection/Creation (new/teams/page.tsx)

**Institution-Only Flow** - Allows:
1. **Select Existing Sub-Teams**: Display all active sub-teams for the institution
2. **Create New Sub-Teams**: Form on right side with fields:
   - Team Name (required)
   - Sport (required)
   - Gender Category: male/female/both
   - Coach Name (optional - separate fields for male/female if 'both')

**Critical Code Section**:
```typescript
const response = await fetch(`/api/institutions/${slug}/sub-teams`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: newTeamName.trim(),
    slug,
    sport_id: newTeamSportId,
    gender_category: teamGender,
  }),
});
```

**CRITICAL FINDING**: **NO PLAYER DATA IS COLLECTED** during team creation in wizard.

### Step 3: Products Selection (new/products/page.tsx)

For **Single Teams**:
- Resets wizard state with fresh team data from database
- Sets sport_id and gender_category from team record
- Loads products filtered by sport_id

**Key Code**:
```typescript
const { setSport, setGenderCategory, setSelectedTeams, reset } = 
  useDesignRequestWizard.getState();
reset();
setSport(team.sport_id, team.sports.name);
setGenderCategory((team.gender_category || 'male') as 'male' | 'female' | 'both');
```

**Observation**: Wizard assumes gender_category exists on team. For new teams, defaults to 'male'.

---

## 3. WIZARD STATE MANAGEMENT

### Store Structure (design-request-wizard.ts)

```typescript
interface Team {
  id?: string;              // Undefined if newly created
  name: string;
  slug?: string;
  coach?: string;           // Optional coach info
  player_count?: number;    // FIELD EXISTS BUT NOT USED
  isNew: boolean;
  colors?: { primary, secondary, accent };
}
```

**CRITICAL FINDING**: `player_count` field exists in Team interface but is **never populated or used**.

---

## 4. TEAM CREATION API ENDPOINT

### File: `/src/app/api/institutions/[slug]/sub-teams/route.ts`

**Authorization Requirements**:
```typescript
if (membership.institution_role !== 'athletic_director') {
  return 403; // "Only Athletic Directors can create programs"
}
```

**No Player Validation**: Zero checks for player status during team creation.

---

## 5. WIZARD FLOW DIAGRAM

```
Entry: /design-request/new
│
├─ SINGLE TEAM FLOW (5 steps)
│  ├─ [Entry] Load team from DB
│  ├─ [1/5] Products Selection
│  ├─ [2/5] Designs Selection
│  ├─ [3/5] Colors Customization
│  ├─ [4/5] Quantities (Optional)
│  └─ [5/5] Review & Submit
│
└─ INSTITUTION FLOW (6 steps)
   ├─ [1/6] Teams Selection/Creation
   │        ├─ Select existing sub-teams
   │        └─ Create new sub-team
   ├─ [2/6] Products Selection
   ├─ [3/6] Designs Selection
   ├─ [4/6] Colors Customization
   ├─ [5/6] Quantities (Optional)
   └─ [6/6] Review & Submit
```

---

## 6. WHERE PLAYER DATA IS/ISN'T COLLECTED

### Current System
**NO player data is collected in the wizard**. Only:
```typescript
const { data: { user } } = await supabase.auth.getUser();
// Stores in design_requests: requested_by: user.id
```

### Stored Fields in design_requests Table
- team_id → which team
- sub_team_id → which sub-team (for institutions)
- requested_by → user who created request (manager/athletic director)
- status → 'pending', 'in_design', 'approved', etc.
- selected_apparel → JSON of products/designs/colors
- primary_color, secondary_color, accent_color → home team colors

**NO player fields in design_requests table.**

---

## 7. MANAGER-ONLY IMPACT ANALYSIS

### What WILL Work Without Changes
1. Team Creation - No player data collection
2. Product/Design Selection - Doesn't require player knowledge
3. Color Customization - Manager-level decision
4. Quantity Estimation - Managers can estimate

### What NEEDS Changes for Manager-Only

#### 1. **Access Control (CRITICAL)**
**Current State**: No checks in wizard pages
**Required Change**: Verify user has manager/athletic director role before accessing

**Files to Modify**:
- `/src/app/mi-equipo/[slug]/design-request/new/page.tsx`
- `/src/app/mi-equipo/[slug]/design-request/new/teams/page.tsx`

#### 2. **Team Creation Authorization**
**Current**: Only checks in API endpoint
**Issue**: Wizard doesn't enforce same check upfront
**Fix**: Add client-side check that mirrors API requirement

---

## 8. CRITICAL CONFLICTS IDENTIFIED

### Conflict 1: No Player Roster Collection
**Status**: ✓ COMPATIBLE
- Manager-only teams don't need roster at design stage
- Player roster can be added separately via roster management

### Conflict 2: Optional Quantities
**Status**: ? NEEDS DECISION
- Current allows continuing without quantities
- With manager-only: Should this become mandatory?
- Recommendation: Keep optional

### Conflict 3: Single Team vs Institution Flows
**Status**: ✓ ALREADY SUPPORTS
- Single team manager for own team
- Institution manager (athletic director) for sub-teams

### Conflict 4: Coach Field During Team Creation
**Status**: ✓ COMPATIBLE
- Manager knows who coaches
- Keep optional (can update separately)

### Conflict 5: Colors Assumption
**Status**: ✓ COMPATIBLE
- Defaults to white if no colors set
- Manager defines colors during design process

---

## 9. KEY FINDINGS FOR MANAGER-ONLY

### The Good (No Changes Needed)
- Team creation already has no player data requirements
- API endpoint already enforces athletic_director role
- All wizard steps are manager-appropriate
- State management is flexible

### The Missing (Must Add)
- Access control checks in wizard frontend pages
- Verification that user is manager before allowing access

### The Optional (Design Decisions)
- Should quantities become mandatory for managers?
- Should coach information be required?
- Should roster be collected immediately after design or later?

---

## 10. RECOMMENDATIONS FOR MANAGER-ONLY IMPLEMENTATION

1. **ADD CRITICAL ACCESS CONTROL**
   - File: `/src/app/mi-equipo/[slug]/design-request/new/page.tsx`
   - Verify user has manager/athletic_director role
   - Redirect non-managers with appropriate message

2. **ADD ROLE CHECK IN TEAMS PAGE**
   - File: `/src/app/mi-equipo/[slug]/design-request/new/teams/page.tsx`
   - Validate user can create sub-teams before showing form
   - Mirror the API endpoint authorization check

3. **NO CHANGES NEEDED FOR**
   - Team creation process
   - Product/design/color selection
   - Quantity estimation
   - Database structure

4. **CONSIDER FOR FUTURE**
   - Should roster management be mandatory step after design?
   - Should quantities be mandatory for manager submissions?
   - Should coach information be required?

---

## 11. SUMMARY TABLE

| Aspect | Current | Manager-Only | Conflict? |
|--------|---------|-------------|-----------|
| Team Creation | No player data | Not needed | ✓ None |
| Team Selection | Supports selection | Managers select | ✓ None |
| Product Selection | Gender-aware | Manager chooses | ✓ None |
| Design Selection | From catalog | Manager chooses | ✓ None |
| Color Customization | Full control | Manager control | ✓ None |
| Quantity Collection | Optional | Optional/Manager | ? Decide |
| Access Control | NONE | REQUIRED | ! CRITICAL |
| Coach Information | Optional | Usable | ✓ None |
| Player Collection | NONE | NOT NEEDED | ✓ Compatible |

---

## CONCLUSION

The design wizard is **architecturally ready for manager-only team creation** because:

1. ✓ No player data is assumed or collected
2. ✓ Team creation API has role checking (athletic_director)
3. ✓ All workflow steps are manager-appropriate
4. ✓ State management is gender-aware and flexible

**Only critical missing piece**: Access control checks in the wizard frontend pages to prevent unauthorized access.

**Implementation effort**: Low (add authorization checks to 2-3 pages)

