# Complete Sport Identification Flow - Documentation

**Date:** 2025-10-11
**Status:** ✅ Complete & Tested

---

## 🎯 Problem Solved

The user reported: *"when I invite a player to join the team and they open their link, the sport isn't saved when collecting the player information"*

**Root Cause:** The collection page (`/collect/[token]/page.tsx`) was querying `team.sport` (text field) which was **NULL** in the database, instead of using the `sport_id` foreign key relationship.

---

## 📊 Database Schema Summary

### Sports Table
```sql
CREATE TABLE public.sports (
  id bigint PRIMARY KEY,
  slug text NOT NULL UNIQUE,  -- 'futbol', 'basquetbol', 'voleibol', 'rugby'
  name text NOT NULL,          -- 'Fútbol', 'Básquetbol', 'Vóleibol', 'Rugby'
  display_name text
);
```

### Teams Table
```sql
CREATE TABLE public.teams (
  id uuid PRIMARY KEY,
  sport_id bigint,              -- ✅ ACTIVE FK to sports.id
  sport text,                   -- ❌ NULL (unused)
  sports text[],                -- For institutions only
  -- ... other fields
  CONSTRAINT teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports(id)
);
```

### Player Info Submissions Table
```sql
CREATE TABLE public.player_info_submissions (
  id uuid PRIMARY KEY,
  team_id uuid NOT NULL,           -- FK to teams.id
  design_request_id bigint,
  user_id uuid,
  player_name text NOT NULL,
  jersey_number text,
  size text NOT NULL,
  position text,                   -- ⚠️ Sport-specific position
  additional_notes text,
  -- NO sport_id field (derives from team_id relationship)
  CONSTRAINT player_info_submissions_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id)
);
```

**Key Insight:** Player positions are sport-specific, but the sport is derived from the `team_id → teams.sport_id → sports.slug` relationship.

---

## ✅ Complete Flow (After Fix)

### 1. Team Creation ✅
**File:** `src/app/mi-equipo/page.tsx` (lines 117-131)

```typescript
const { data: newTeam, error: teamError } = await supabase
  .from('teams')
  .insert({
    slug: teamSlug,
    name: teamName,
    owner_id: user.id,
    current_owner_id: user.id,
    created_by: user.id,
    sport_id: teamSportId,  // ✅ Saves sport_id (FK)
    sports: sportsArray,     // For institutions
    team_type: dbTeamType,
    institution_name: institutionName || null,
  })
```

**Result:** Team is created with `sport_id` correctly set (e.g., `sport_id = 2` for Básquetbol).

---

### 2. Collection Link Generation ✅
**File:** `src/app/api/teams/[id]/collection-link/route.ts` (lines 47-87)

```typescript
// Creates or retrieves collection token from team_settings
const { data: settings } = await supabase
  .from('team_settings')
  .select('info_collection_token')
  .eq('team_id', params.id)
  .maybeSingle();

let token = settings?.info_collection_token;
if (!token) {
  token = randomBytes(32).toString('hex');
  // Insert or update team_settings with token
}

const collectionUrl = `${baseUrl}/collect/${token}`;
```

**Result:** Generates URL like `http://localhost:3000/collect/f0fb159f...`

---

### 3. Collection Page - Sport Retrieval ✅ (FIXED)
**File:** `src/app/collect/[token]/page.tsx` (lines 239-263)

**BEFORE (Broken):**
```typescript
const { data: team } = await supabase
  .from('teams')
  .select('id, name, slug, sport')  // ❌ sport is NULL
  .eq('id', settings.team_id)
  .single();
```

**AFTER (Fixed):**
```typescript
// Get team info with sport via JOIN (teams.sport_id → sports table)
const { data: team } = await supabase
  .from('teams')
  .select(`
    id,
    name,
    slug,
    sports:sport_id (
      id,
      slug,
      name
    )
  `)
  .eq('id', settings.team_id)
  .single();

// Extract sport slug from joined data
const sportSlug = (team as any).sports?.slug || null;
// sportSlug = 'basquetbol', 'futbol', 'voleibol', or 'rugby'

setTeamInfo({
  id: team.id,
  name: team.name,
  slug: team.slug,
  sport: sportSlug,  // ✅ Now has correct Spanish slug
  design_request_id: designRequest?.id || null,
});
```

**Result:** `teamInfo.sport` now correctly contains `'basquetbol'` instead of `null`.

---

### 4. PlayerInfoForm - Position Selection ✅
**File:** `src/components/team-hub/PlayerInfoForm.tsx` (lines 91-111)

```typescript
export function PlayerInfoForm({ sport, ... }: PlayerInfoFormProps) {
  // sport = 'basquetbol' (from collection page)

  const normalizedSport = sport || 'futbol';
  const positions = SPORT_POSITIONS[normalizedSport] || SPORT_POSITIONS['futbol'] || [];

  // For basquetbol:
  // positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center']

  console.log('[PlayerInfoForm] Sport value:', sport);
  console.log('[PlayerInfoForm] Available positions:', positions);
}
```

**In Collection Page (line 582-589):**
```typescript
<PlayerInfoForm
  teamId={teamInfo.id}
  userId=""
  sport={teamInfo.sport}  // ✅ Now 'basquetbol' instead of null
  onSubmit={handleSubmit}
  requireEmail={true}
  teamName={teamInfo.name}
/>
```

**Result:** Players selecting positions for a basketball team now see basketball positions, not soccer positions.

---

### 5. Player Submission ✅
**File:** `src/app/collect/[token]/page.tsx` (lines 377-417)

```typescript
async function handleSubmit(data: PlayerInfoData) {
  const insertData = {
    team_id: teamInfo.id,                  // ✅ Links to team (which has sport_id)
    design_request_id: teamInfo.design_request_id,
    player_name: data.player_name,
    jersey_number: data.jersey_number || null,
    size: data.size,
    position: data.position,               // ✅ 'Point Guard' for basketball
    additional_notes: data.additional_notes || null,
    submitted_by_manager: false,
    submission_token: params.token,
    user_id: null,
  };

  const { data: submission } = await supabase
    .from('player_info_submissions')
    .insert(insertData)
    .select()
    .single();
}
```

**Result:** Player info is saved with correct sport-specific position.

---

### 6. Players Page - Manager View ✅
**File:** `src/app/mi-equipo/[slug]/players/page.tsx` (lines 78-96, 252-257)

```typescript
// Get team with sport info (join with sports table)
const { data: teamData } = await supabase
  .from('teams')
  .select(`
    *,
    sports:sport_id (
      id,
      slug,
      name
    )
  `)
  .eq('slug', params.slug)
  .single();

// Extract sport slug from joined data
const sportSlug = (teamData as any).sports?.slug || null;
setTeam({ ...teamData, sport: sportSlug });

// Position dropdown in add player form:
<select value={formData.position} ...>
  <option value="">Seleccionar posición (opcional)</option>
  {getFieldLayout(mapSportToSlug(team?.sport)).positions.map((pos) => (
    <option key={pos.name} value={pos.name}>
      {pos.name} ({pos.abbr})
    </option>
  ))}
</select>
```

**Result:** Managers see correct positions when manually adding players.

---

### 7. Team Settings Page ✅
**File:** `src/app/mi-equipo/[slug]/settings/page.tsx` (lines 58-76)

```typescript
// Get team with sport info (join with sports table)
const { data: teamData } = await supabase
  .from('teams')
  .select(`
    *,
    sports:sport_id (
      id,
      slug,
      name
    )
  `)
  .eq('slug', params.slug)
  .single();

// Extract sport slug from joined data
const sportSlug = (teamData as any).sports?.slug || null;
setTeam({ ...teamData, sport: sportSlug });
```

**Result:** Sport dropdown shows correct selected sport and allows changes.

---

### 8. My Teams Page ✅
**File:** `src/app/mi-equipo/page.tsx` (lines 73-94)

```typescript
// Get team details with sport info (join with sports table)
const { data: teamsData } = await supabase
  .from('teams')
  .select(`
    *,
    sports:sport_id (
      id,
      slug,
      name
    )
  `)
  .in('id', teamIds);

// Extract sport names from joined data
const teamsWithSportNames = teamsData?.map(team => ({
  ...team,
  sport: (team as any).sports?.name || 'Sin deporte'
})) || [];
```

**Result:** Team cards display sport labels correctly.

---

## 🔄 Spanish-English Slug Mapping

**File:** `src/lib/sports/sportsMapping.ts`

The database uses Spanish slugs, but field layouts use English keys:

```typescript
export const SPANISH_TO_ENGLISH_SPORT_MAP = {
  'futbol': 'soccer',
  'basquetbol': 'basketball',
  'voleibol': 'volleyball',
  'rugby': 'rugby'
};

export const SPORT_INFO = {
  'futbol': {
    slug: 'futbol',
    displayName: 'Fútbol',
    emoji: '⚽',
    englishSlug: 'soccer'
  },
  'basquetbol': {
    slug: 'basquetbol',
    displayName: 'Básquetbol',
    emoji: '🏀',
    englishSlug: 'basketball'
  },
  // ...
};

export function toEnglishSlug(spanishSlug: string): string {
  return SPANISH_TO_ENGLISH_SPORT_MAP[spanishSlug as SpanishSportSlug] || spanishSlug;
}
```

**Usage:** `getFieldLayout(toEnglishSlug('basquetbol'))` returns basketball field layout.

---

## 📋 Standard Query Pattern

**ALWAYS use this pattern when reading team data:**

```typescript
const { data: teamData } = await supabase
  .from('teams')
  .select(`
    *,
    sports:sport_id (
      id,
      slug,
      name
    )
  `)
  .eq('slug', teamSlug)  // or .eq('id', teamId)
  .single();

// Extract sport slug
const sportSlug = (teamData as any).sports?.slug || null;
const team = { ...teamData, sport: sportSlug };
```

**NEVER query `team.sport` directly** - it's NULL in the database!

---

## 🧪 Testing Checklist

### ✅ Collection Link Flow
1. Create a basketball team
2. Go to Players page → click "Enlace de Recolección"
3. Open collection link in incognito window
4. Verify position dropdown shows basketball positions (Point Guard, Shooting Guard, etc.)
5. Submit player info
6. Verify submission appears in Players table with correct position

### ✅ Manager Add Player
1. Go to team Players page
2. Click "Agregar Jugador"
3. Verify position dropdown shows correct sport positions
4. Add player and verify it's saved

### ✅ Team Settings
1. Go to team Settings page
2. Verify sport dropdown shows current sport selected
3. Change sport and verify it saves to `sport_id`

### ✅ Team Cards
1. Go to "Mis Equipos" page
2. Verify each team card shows sport name

---

## 🎉 Result

**Before Fix:**
- Collection page: `team.sport = null` → Players see soccer positions for all sports ❌
- Wrong positions saved for players ❌

**After Fix:**
- Collection page: `team.sport = 'basquetbol'` → Players see correct basketball positions ✅
- Correct positions saved ✅
- Full sport propagation throughout the app ✅

---

## 📝 Files Modified

1. **`src/app/collect/[token]/page.tsx`** - Fixed team query to JOIN with sports table
2. **`src/app/mi-equipo/[slug]/players/page.tsx`** - Already had correct JOIN (earlier fix)
3. **`src/app/mi-equipo/[slug]/settings/page.tsx`** - Already had correct JOIN (earlier fix)
4. **`src/app/mi-equipo/page.tsx`** - Already had correct JOIN (earlier fix)
5. **`SPORT_FLOW_COMPLETE.md`** - This documentation

---

## 🔑 Key Takeaways

1. **Always JOIN with sports table** when querying teams
2. **Use `sport_id` FK**, not `sport` (text) field
3. **Spanish database slugs** map to English field layouts
4. **Player positions** derive sport from `team_id → teams.sport_id`
5. **No sport_id in submissions table** - it's inferred from team relationship

---

Last Updated: 2025-10-11
Author: Claude Code
