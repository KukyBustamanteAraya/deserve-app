# Team Colors - Quick Start Guide

## ✅ Implementation Complete

All code changes have been made to create **automatic bidirectional color sync** for:
- ✅ **Single Teams:** Wizard ↔ Settings (single source: teams.colors)
- ✅ **Institution Teams:** Sub-teams ↔ Parent Institution ↔ Settings (auto-propagating)
- ✅ **Catalog Flow:** Catalog → Team Creation → Settings ↔ Wizard (fixed 3 critical bugs)

---

## 🚀 Next Steps (You Need to Do)

### Step 1: Run the Migration

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- File: supabase/migrations/20251021_consolidate_team_colors.sql
-- Copy the entire contents of that file and execute it
```

**What this does:**
- Syncs existing colors from team_settings → teams.colors
- Ensures all teams have colors in teams.colors
- Marks team_settings color columns as deprecated

---

### Step 2: Test the Flow

**Quick Test (5 minutes):**

1. **Go to Team Settings:**
   - Navigate to any team's settings page
   - Change the primary color to bright red (#FF0000)
   - Click Save
   - Refresh the page
   - ✅ Verify: Red color persists

2. **Test Wizard:**
   - Start a new design request
   - Go to Colors step
   - ✅ Verify: Red color appears (synced from settings!)
   - Change to blue (#0000FF)
   - Complete wizard
   - Go back to Settings page
   - ✅ Verify: Blue color appears (synced from wizard!)

**If both tests pass: You're done! 🎉**

3. **For Institutions:** Test sub-team sync
   - Create institution design request for sub-team
   - Set colors → Submit
   - Go to Institution Settings
   - ✅ Verify: Colors appear from wizard
   - Change colors in Settings → Save
   - Create new design request for different sub-team
   - ✅ Verify: New colors appear (propagated to all sub-teams)

4. **For Catalog Flow:** Test catalog → team creation
   - Browse catalog → select any design
   - Choose "Create new team"
   - Enter team name and set colors: Red (#FF0000), Blue (#0000FF), Yellow (#FFFF00)
   - Complete organization step → Submit
   - ✅ Verify: Redirected to team page
   - Go to team Settings
   - ✅ Verify: Red, Blue, Yellow colors appear
   - Browse catalog → select different design
   - Select the team you just created from dropdown
   - ✅ Verify: Colors auto-populate (Red, Blue, Yellow)
   - Submit design request
   - ✅ Verify: Design request created successfully

---

## 📊 What Was Fixed

### Single Teams

**Before (Broken):**
```
Wizard saves colors → teams.colors
Settings reads colors → team_settings
❌ NEVER SYNCED = DATA LOSS
```

**After (Fixed):**
```
Wizard saves colors → teams.colors
Settings reads colors → teams.colors
Settings saves colors → teams.colors (+ team_settings backup)
✅ ALWAYS SYNCED
```

### Institution Teams

**Before (Broken):**
```
Wizard saves colors → institution_sub_teams.colors (sub-team only)
Settings saves colors → teams.colors (parent only)
❌ NO CONNECTION = COLORS NEVER APPEAR
```

**After (Fixed):**
```
Wizard saves colors → sub-team + parent institution
Settings saves colors → parent + ALL sub-teams
Wizard loads colors → sub-team or inherits from parent
✅ BIDIRECTIONAL AUTO-SYNC
```

### Catalog Flow (Quick Design)

**Before (Broken):**
```
User creates team via catalog → saves tertiary (not accent)
User selects team for another design → reads accent (undefined!)
❌ ACCENT COLOR MISSING = DISPLAYS AS BLACK
```

**After (Fixed):**
```
User creates team via catalog → saves both accent AND tertiary
User selects team → reads accent OR tertiary (fallback)
API backfills team_settings for backwards compatibility
✅ COLORS ALWAYS AVAILABLE EVERYWHERE
```

---

## 🔍 Files Changed

### Single Teams
1. **Migration:** `supabase/migrations/20251021_consolidate_team_colors.sql`
   - Syncs existing data from team_settings → teams.colors

2. **Hook:** `src/app/mi-equipo/[slug]/hooks/useTeamData.ts`
   - Now reads from teams.colors instead of team_settings

3. **Settings:** `src/app/mi-equipo/[slug]/settings/page.tsx`
   - Now writes to teams.colors (primary) + team_settings (backup)

### Institution Teams
4. **Wizard Review:** `design-request/new/review/page.tsx`
   - Saves to sub-team + parent institution (both)

5. **Settings:** `settings/page.tsx`
   - Propagates colors to all sub-teams when institution

6. **Teams Selection:** `design-request/new/teams/page.tsx`
   - Sub-teams inherit parent colors if missing

### Catalog Flow
7. **Quick Design API:** `src/app/api/quick-design-request/route.ts`
   - Now saves both accent AND tertiary fields (line 275-280)
   - Backfills team_settings with colors (line 317-333)

8. **Design Detail Client:** `src/app/designs/[slug]/DesignDetailClient.tsx`
   - Updated to read accent OR tertiary (fallback logic, line 170)
   - Added tertiary to Team interface (line 17)

---

## ⚠️ If Something Breaks

**Symptom:** Colors not saving
**Fix:** Check browser console and Supabase logs

**Symptom:** Colors show as white after migration
**Fix:** Re-run the migration SQL

**Symptom:** Wizard colors don't appear in settings
**Fix:** Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

---

## 📚 Full Documentation

**Single Teams:**
- `docs/TEAM_COLORS_CONSOLIDATION_GUIDE.md` - Complete guide for dashboard flow

**Institution Teams:**
- `docs/INSTITUTION_COLORS_COMPLETE.md` - Bidirectional sync implementation

**Catalog Flow:**
- `docs/CATALOG_FLOW_COLORS_FIX.md` - 3 critical bugs fixed for catalog → team creation flow

---

## ✨ Benefits

- ✅ No more color data loss
- ✅ Wizard and Settings always in sync
- ✅ Consistent with institution sub-teams
- ✅ Future-proof (JSONB allows gradients, multiple accents, etc.)
- ✅ Single source of truth
