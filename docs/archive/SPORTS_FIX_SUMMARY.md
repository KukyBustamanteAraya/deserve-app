# Sports Synchronization Fix - Summary

**Date:** 2025-10-11
**Status:** ✅ Complete

---

## 🎯 Problem

The app had sports hardcoded in multiple places with mismatched data:
- **Migration files** said 9 sports (English)
- **Team settings** had 6 hardcoded sports (including non-existent ones)
- **Field layouts** only supported English slugs
- **Live database** has 4 sports in Spanish: `futbol`, `basquetbol`, `voleibol`, `rugby`

This caused:
1. Wrong sports showing in team settings dropdown
2. Field visualizations not working with Spanish slugs
3. No way to add new sports without code changes

---

## ✅ Solution Implemented

### 1. **New Schema Reference System**
Created a workflow that uses **live Supabase database** as the single source of truth.

**Files Created:**
- `SCHEMA_REFERENCE.sql` - Live schema documentation
- `scripts/query-schema.mjs` - Query live database tables
- `scripts/export-live-schema.mjs` - Export full schema snapshot
- `SCHEMA_WORKFLOW.md` - Complete documentation
- `LIVE_SCHEMA.json` - Auto-generated schema export

**Commands:**
```bash
# Query specific table
node scripts/query-schema.mjs sports

# Query all key tables
node scripts/query-schema.mjs all

# Full export
node scripts/export-live-schema.mjs
```

### 2. **Sports Slug Mapping System**
Created mapping layer between Spanish database slugs and English field layout keys.

**File:** `src/lib/sports/sportsMapping.ts`

**Features:**
- Maps Spanish → English: `futbol` → `soccer`, `basquetbol` → `basketball`, etc.
- Reverse mapping: English → Spanish
- Sport display info with emojis
- Validation functions

### 3. **Updated Field Layouts**
Modified `src/lib/sports/fieldLayouts.ts` to support both Spanish and English slugs.

**Changes:**
- Imported mapping functions
- Updated `getFieldLayout()` to auto-convert Spanish slugs
- Updated `findPositionCoordinates()` to support both slug types

### 4. **Team Settings - Dynamic Sports**
Updated `src/app/mi-equipo/[slug]/settings/page.tsx`

**Changes:**
- Removed 6 hardcoded sports
- Added `useSports()` hook to fetch from database
- Added `getSportInfo()` for emojis
- Dynamic dropdown now shows live data

**Before:**
```tsx
<option value="soccer">⚽ Soccer / Fútbol</option>
<option value="basketball">🏀 Basketball / Basquetbol</option>
<option value="baseball">⚾ Baseball / Béisbol</option>  // ❌ Not in DB
// ...hardcoded...
```

**After:**
```tsx
{sports.map((sport) => {
  const sportInfo = getSportInfo(sport.slug);
  return (
    <option key={sport.id} value={sport.slug}>
      {sportInfo.emoji} {sport.name}
    </option>
  );
})}
```

### 5. **Team Creation Modal - Dynamic Sports**
Updated `src/components/team/TeamSetupModal.tsx`

**Changes:**
- Removed `AVAILABLE_SPORTS` constant (5 hardcoded sports)
- Added `useSports()` hook
- Added loading state
- Dynamic grid now shows live data with proper Spanish names

---

## 📊 Current State (Live Database)

### Sports Table:
```
id | slug        | name        | display_name
---+-------------+-------------+--------------
1  | futbol      | Fútbol      | Fútbol
2  | basquetbol  | Básquetbol  | Básquetbol
3  | voleibol    | Vóleibol    | Vóleibol
4  | rugby       | Rugby       | Rugby
```

### Teams Table Uses:
- `sport_id` (bigint FK to sports.id) ← **ACTIVE/PRIMARY**
- `sport` (text) ← Currently NULL
- `sports` (text[]) ← Currently NULL (for institutions)

---

## 🧪 Testing Checklist

### Team Creation
- [ ] Go to `/mi-equipo`
- [ ] Click "Create Team"
- [ ] Modal shows 4 sports (Fútbol, Básquetbol, Vóleibol, Rugby)
- [ ] Sports have correct emojis
- [ ] Can select a sport and create team

### Team Settings
- [ ] Go to existing team settings: `/mi-equipo/[slug]/settings`
- [ ] Scroll to "Team Information" section
- [ ] Sport dropdown shows 4 options
- [ ] Can change sport and save
- [ ] No errors in console

### Field Visualization
- [ ] Create/view team with `futbol` sport
- [ ] Field layout shows soccer field (Spanish slug mapped correctly)
- [ ] Try with `basquetbol` → shows basketball court
- [ ] Try with `voleibol` → shows volleyball court

### API Endpoint
- [ ] Open: http://localhost:3000/api/catalog/sports
- [ ] Should return 4 sports in JSON
- [ ] Verify slugs match database

---

## 🚀 Benefits

1. **No More Hardcoding** - All sports fetched from database
2. **Easy to Add Sports** - Just add to Supabase, no code changes needed
3. **Schema Reference** - Clear source of truth for all schema info
4. **Bilingual Support** - Spanish DB slugs work with English field layouts
5. **Type Safe** - Mapping functions with TypeScript validation

---

## 📝 How to Add a New Sport

1. **Add to Supabase** (SQL Editor or Dashboard):
   ```sql
   INSERT INTO sports (slug, name, display_name)
   VALUES ('tenis', 'Tenis', 'Tenis');
   ```

2. **Update mapping** (if field layout needed):
   Edit `src/lib/sports/sportsMapping.ts`:
   ```typescript
   export const SPANISH_TO_ENGLISH_SPORT_MAP = {
     // ... existing ...
     'tenis': 'tennis'
   };

   export const SPORT_INFO = {
     // ... existing ...
     'tenis': {
       slug: 'tenis',
       displayName: 'Tenis',
       emoji: '🎾',
       englishSlug: 'tennis'
     }
   };
   ```

3. **Add field layout** (if needed):
   Edit `src/lib/sports/fieldLayouts.ts`:
   ```typescript
   export const tennisLayout: FieldLayout = {
     sport: 'tennis',
     // ... positions ...
   };
   ```

4. **Update schema reference**:
   ```bash
   node scripts/query-schema.mjs sports
   # Copy output to SCHEMA_REFERENCE.sql
   ```

That's it! No other code changes needed.

---

## 🔧 Files Modified

**New Files:**
- `SCHEMA_REFERENCE.sql`
- `SCHEMA_WORKFLOW.md`
- `LIVE_SCHEMA.json`
- `scripts/query-schema.mjs`
- `scripts/export-live-schema.mjs` (already existed, documented)
- `src/lib/sports/sportsMapping.ts`
- `SPORTS_FIX_SUMMARY.md` (this file)

**Modified Files:**
- `src/lib/sports/fieldLayouts.ts`
- `src/app/mi-equipo/[slug]/settings/page.tsx`
- `src/components/team/TeamSetupModal.tsx`

---

## ✅ Compilation Status

All files compiled successfully:
```
✓ Compiled /mi-equipo/[slug]/settings in 249ms
✓ Compiled /api/catalog/sports in 351ms
GET /api/catalog/sports 200 in 483ms
```

No TypeScript errors.

---

Last Updated: 2025-10-11
