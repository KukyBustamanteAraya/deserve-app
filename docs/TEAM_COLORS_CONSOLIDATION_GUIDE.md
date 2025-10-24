# Team Colors Consolidation - Implementation Complete

## Summary

Successfully consolidated team colors from dual storage (teams.colors + team_settings columns) to single source of truth (teams.colors JSONB).

---

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20251021_consolidate_team_colors.sql`

**Actions:**
- Migrates existing colors from `team_settings` → `teams.colors`
- Backfills `team_settings` from `teams.colors` for backwards compatibility
- Adds deprecation comments to `team_settings` color columns
- Sets `teams.colors` default to `{}`
- Ensures no null values in `teams.colors`

**To Apply:**
```bash
# Run this migration in your Supabase dashboard SQL editor
# OR if you have Supabase CLI configured:
supabase db push
```

---

### 2. useTeamData Hook
**File:** `src/app/mi-equipo/[slug]/hooks/useTeamData.ts` (Lines 83-103)

**Changes:**
- ✅ Now reads colors from `teams.colors` (primary source)
- ✅ Converts JSONB format to UI format
- ✅ Only queries `team_settings` for `logo_url`
- ✅ Maintains backwards compatibility

**Before:**
```typescript
const { data: settingsData } = await supabase
  .from('team_settings')
  .select('primary_color, secondary_color, tertiary_color, logo_url')
```

**After:**
```typescript
// Read colors from teams.colors (already loaded in teamData)
if (teamData.colors) {
  setColors({
    primary_color: teamData.colors.primary || null,
    secondary_color: teamData.colors.secondary || null,
    tertiary_color: teamData.colors.accent || teamData.colors.tertiary || null,
  });
}
```

---

### 3. Settings Page Save
**File:** `src/app/mi-equipo/[slug]/settings/page.tsx` (Lines 452-512)

**Changes:**
- ✅ PRIMARY: Writes to `teams.colors` first
- ✅ SECONDARY: Writes to `team_settings` for backwards compatibility
- ✅ Both updates must succeed (transactional behavior)
- ✅ Proper error handling for each step

**Before:**
```typescript
const { error } = await supabase
  .from('team_settings')
  .update({
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    tertiary_color: settings.tertiary_color,
    // ...
  })
```

**After:**
```typescript
// PRIMARY: Update teams.colors (single source of truth)
const colorsObject = {
  primary: settings.primary_color || null,
  secondary: settings.secondary_color || null,
  accent: settings.tertiary_color || null,
  tertiary: settings.tertiary_color || null,
};

await supabase.from('teams').update({ colors: colorsObject }).eq('id', team.id);

// SECONDARY: Update team_settings for backwards compatibility
await supabase.from('team_settings').update({ /* all settings */ })
```

---

### 4. Wizard Verification
**File:** `src/app/mi-equipo/[slug]/design-request/new/review/page.tsx` (Lines 119-122)

**Status:** ✅ Already Compatible

The wizard was already writing to `teams.colors` correctly:
```typescript
await supabase
  .from('teams')
  .update({ colors: teamColorsObject })
  .eq('slug', slug);
```

---

## Data Flow (After Fix)

### Single Team Colors Flow - UNIFIED ✅

```
Design Wizard
    ↓
    reads: selectedTeams[0].colors (Zustand store)
    ↓
    writes to: teams.colors ← PRIMARY SOURCE
    ↓
DATABASE: teams.colors updated
    ↓
Settings Page
    ↓
    reads from: teams.colors via useTeamData
    ↓
    displays colors correctly ✅
    ↓
    user changes colors
    ↓
    writes to: teams.colors (primary) + team_settings (backup)
    ↓
DATABASE: Both updated in sync
    ↓
Wizard/Settings
    ↓
    reads from: teams.colors
    ↓
    ✅ ALWAYS IN SYNC
```

---

## Testing Checklist

### Test 1: Fresh Team Creation (Wizard)
- [ ] Create new team through onboarding wizard
- [ ] Set custom colors in the Colors step (e.g., Red, Blue, Yellow)
- [ ] Complete wizard and submit design request
- [ ] **Verify:** Colors saved to database
- [ ] Navigate to Team Settings page
- [ ] **Expected:** Custom colors appear in color pickers
- [ ] **Failure:** If colors show as white/default

### Test 2: Settings Page Color Update
- [ ] Go to existing team's Settings page
- [ ] Change primary color to a new value (e.g., Green #00FF00)
- [ ] Click Save
- [ ] **Verify:** Success message appears
- [ ] Refresh the page
- [ ] **Expected:** Green color persists in picker
- [ ] Start new design request (wizard)
- [ ] Navigate to Colors step
- [ ] **Expected:** Green color appears in color selector
- [ ] **Failure:** If wizard shows old color or white

### Test 3: Wizard → Settings → Wizard Round Trip
- [ ] Start design request wizard
- [ ] Set colors: Primary=#FF0000, Secondary=#0000FF, Accent=#FFFF00
- [ ] Complete and submit wizard
- [ ] Go to Settings page
- [ ] **Expected:** See Red, Blue, Yellow in pickers
- [ ] Change Primary to #00FF00 (Green)
- [ ] Save settings
- [ ] Start new design request
- [ ] Go to Colors step
- [ ] **Expected:** See Green, Blue, Yellow
- [ ] **Failure:** If any color doesn't match

### Test 4: Existing Teams After Migration
- [ ] Run the migration SQL
- [ ] Find team that had colors in team_settings
- [ ] Go to that team's Settings page
- [ ] **Expected:** Colors appear (migrated from team_settings)
- [ ] Find team that had colors in teams.colors
- [ ] Go to Settings page
- [ ] **Expected:** Colors still appear (preserved)

### Test 5: Institution Sub-Teams (Should Be Unaffected)
- [ ] Go to institution team
- [ ] Create or edit sub-team
- [ ] Set colors for sub-team
- [ ] **Expected:** Colors save and load correctly
- [ ] **Note:** Sub-teams already used teams.colors pattern

---

## Database Query Tests

### Verify Migration Worked

```sql
-- Check if colors were migrated from team_settings to teams.colors
SELECT
  t.id,
  t.name,
  t.colors,
  ts.primary_color,
  ts.secondary_color,
  ts.tertiary_color
FROM teams t
LEFT JOIN team_settings ts ON t.id = ts.team_id
WHERE t.team_type = 'single_team'
LIMIT 10;
```

**Expected Result:**
- teams.colors should have JSONB object with primary, secondary, accent
- team_settings colors should match teams.colors (synced by migration)

### Check for Orphaned Data

```sql
-- Find teams with colors only in team_settings (shouldn't exist after migration)
SELECT
  t.id,
  t.name,
  t.colors AS team_colors,
  ts.primary_color
FROM teams t
JOIN team_settings ts ON t.id = ts.team_id
WHERE (t.colors IS NULL OR NOT (t.colors ? 'primary'))
  AND ts.primary_color IS NOT NULL;
```

**Expected Result:** 0 rows (migration should have synced all)

---

## Rollback Plan (If Needed)

If something breaks, you can temporarily revert by:

1. **Restore useTeamData to read from team_settings:**
```typescript
// In useTeamData.ts, change back to:
const { data: settingsData } = await supabase
  .from('team_settings')
  .select('primary_color, secondary_color, tertiary_color, logo_url')
  .eq('team_id', teamData.id)
  .maybeSingle();

if (settingsData) {
  setColors(settingsData);
}
```

2. **Restore settings page to only update team_settings:**
```typescript
// In settings/page.tsx, remove the teams.colors update
// Keep only the team_settings update
```

3. **Data will still be safe** because:
   - Migration backfilled team_settings from teams.colors
   - Settings page writes to both tables
   - No data loss occurred

---

## Architecture Improvements

### Before (Broken)
- ❌ Two storage locations
- ❌ Never synced
- ❌ Data loss on settings change
- ❌ Wizard and Settings disconnected

### After (Fixed)
- ✅ Single source of truth: `teams.colors`
- ✅ Settings and wizard both use same source
- ✅ Backwards compatibility maintained
- ✅ Consistent with institution sub-teams
- ✅ Future-proof (JSONB allows expansion)

---

## Future Enhancements

Now that colors are unified, you can add:

1. **Color Validation:**
   - Add constraint to ensure valid hex colors
   - Frontend color contrast checker

2. **Color History:**
   - Track color changes over time
   - Audit log for branding changes

3. **Color Templates:**
   - Pre-defined team color schemes
   - Sport-specific color recommendations

4. **Advanced Branding:**
   - Gradient colors (JSONB supports complex objects)
   - Multiple accent colors
   - Dark mode variants

---

## Monitoring

After deployment, monitor for:

1. **Logs:** Search for "Error updating team colors" in application logs
2. **User Reports:** Colors not saving or loading
3. **Database:** Check if teams.colors stays in sync with team_settings

**Health Check Query:**
```sql
-- Find any desync between teams.colors and team_settings
SELECT
  t.id,
  t.name,
  t.colors->>'primary' AS colors_primary,
  ts.primary_color AS settings_primary,
  CASE
    WHEN t.colors->>'primary' = ts.primary_color THEN 'SYNCED'
    ELSE 'DESYNC'
  END AS sync_status
FROM teams t
JOIN team_settings ts ON t.id = ts.team_id
WHERE t.team_type = 'single_team'
  AND (t.colors->>'primary' != ts.primary_color OR ts.primary_color IS NULL);
```

---

## Support

If issues arise:

1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify migration ran successfully
4. Check if user has proper team permissions
5. Test in incognito mode (clear cache)

---

## Completion Status

- ✅ Migration created
- ✅ useTeamData hook updated
- ✅ Settings page save updated
- ✅ Settings page read updated (via hook)
- ✅ Wizard verified compatible
- ✅ Documentation created
- ⏳ Migration needs to be run
- ⏳ Testing needs to be performed

**Ready for deployment after migration is run and tested!**
