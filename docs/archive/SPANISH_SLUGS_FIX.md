# Spanish Sport Slugs Fix - Collection Link Positions

**Date:** 2025-10-11
**Status:** ✅ Complete
**Issue:** Collection link forms were showing WRONG positions for basketball and volleyball teams

---

## 🎯 Problem

User reported: *"when I open the invite link from a separate browser, the positions are incorrect in that form"*

**Testing confirmed:**
- Basketball team invite → Showed soccer positions ❌
- Volleyball team invite → Showed soccer positions ❌
- Players page (manager view) → Showed correct positions ✅

---

## 🔍 Root Cause

The database stores sport slugs in **Spanish**:
- `'futbol'` (soccer)
- `'basquetbol'` (basketball)
- `'voleibol'` (volleyball)
- `'rugby'` (rugby)

But the collection link forms had hardcoded `SPORT_POSITIONS` constants that only recognized **English** slugs:
- Had `'basketball'` ✅ but NOT `'basquetbol'` ❌
- Had `'volleyball'` ✅ but NOT `'voleibol'` ❌

**Result:** When `sport = 'basquetbol'`, it failed to find positions and fell back to `'futbol'` (soccer) positions.

---

## ✅ Solution - Add Spanish Slug Aliases

Added Spanish slug aliases to THREE files:

### 1. Collection Page AuthenticatedInviteUI
**File:** `src/app/collect/[token]/page.tsx` (lines 18-28)

**Added:**
```typescript
const SPORT_POSITIONS: Record<string, string[]> = {
  // ... existing ...
  basketball: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
  basquetbol: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'], // ✅ Spanish alias
  volleyball: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite Hitter', 'Libero'],
  voleibol: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite Hitter', 'Libero'], // ✅ Spanish alias
  // ... existing ...
};
```

---

### 2. PlayerInfoForm Component
**File:** `src/components/team-hub/PlayerInfoForm.tsx` (lines 27-101)

**Added:**
```typescript
const SPORT_POSITIONS: Record<string, string[]> = {
  // ... existing ...
  basketball: ['Point Guard', ...],
  basquetbol: ['Point Guard', ...], // ✅ Spanish alias
  volleyball: ['Setter', ...],
  voleibol: ['Setter', ...], // ✅ Spanish alias
  // ... existing ...
};
```

**Also updated SportFieldSelector check** (line 249):
```typescript
// BEFORE
{['soccer', 'basketball', 'volleyball', 'baseball', 'rugby', 'padel'].includes(normalizedSport) ? (

// AFTER
{['soccer', 'futbol', 'basketball', 'basquetbol', 'volleyball', 'voleibol', 'baseball', 'rugby', 'padel'].includes(normalizedSport) ? (
```

Now Spanish slugs also trigger the visual field selector!

---

### 3. SportFieldSelector Component
**File:** `src/components/team-hub/SportFieldSelector.tsx`

**Updated field rendering checks:**
```typescript
// Line 18: Soccer field
if (sport === 'soccer' || sport === 'futbol') {

// Line 35: Basketball court
if (sport === 'basketball' || sport === 'basquetbol') {

// Line 49: Volleyball court
if (sport === 'volleyball' || sport === 'voleibol') {
```

**Updated background color function** (lines 110-119):
```typescript
const getBgColor = () => {
  if (sport === 'basketball' || sport === 'basquetbol') return 'bg-orange-800';
  if (sport === 'volleyball' || sport === 'voleibol') return 'bg-blue-700';
  // ... other sports ...
  return 'bg-green-600'; // Default for soccer/futbol/rugby
};
```

Now Spanish slugs render the correct field visuals with correct colors!

---

## 🧪 How to Test

### Test Basketball (Basquetbol)
1. Create a basketball team on `/mi-equipo`
2. Go to Players page → Click "Enlace de Recolección"
3. Copy collection link
4. Open link in **incognito browser** (to simulate new player)
5. **Verify position dropdown shows:**
   - Point Guard ✅
   - Shooting Guard ✅
   - Small Forward ✅
   - Power Forward ✅
   - Center ✅
   - **NOT** Goalkeeper, Defender, etc. ❌
6. **Verify visual field selector:**
   - Shows basketball court (orange background) ✅
   - Position markers on court ✅

### Test Volleyball (Voleibol)
1. Create a volleyball team
2. Get collection link
3. Open in incognito
4. **Verify position dropdown shows:**
   - Setter ✅
   - Outside Hitter ✅
   - Middle Blocker ✅
   - Opposite Hitter ✅
   - Libero ✅
5. **Verify visual field selector:**
   - Shows volleyball court (blue background) ✅
   - Net line in middle ✅

### Test Soccer (Futbol)
1. Create soccer team
2. Get collection link
3. Open in incognito
4. **Verify:**
   - Goalkeeper, Defender, Midfielder, Forward ✅
   - Green field background ✅

### Test Rugby
1. Create rugby team
2. Get collection link
3. **Verify:**
   - Prop, Hooker, Lock, Flanker, etc. ✅
   - Green field with rugby lines ✅

---

## 📊 Before vs After

### Before Fix ❌
```
Basketball team → sport = 'basquetbol'
↓
SPORT_POSITIONS['basquetbol'] → undefined
↓
Fallback to SPORT_POSITIONS['futbol']
↓
Shows: Goalkeeper, Defender, Midfielder, Forward (WRONG!)
```

### After Fix ✅
```
Basketball team → sport = 'basquetbol'
↓
SPORT_POSITIONS['basquetbol'] → ['Point Guard', 'Shooting Guard', ...]
↓
Shows: Point Guard, Shooting Guard, Small Forward, Power Forward, Center (CORRECT!)
```

---

## 🎨 Visual Field Selector - Before vs After

### Before Fix ❌
- **Basketball team** (`'basquetbol'`) → Default generic field (wrong)
- **Volleyball team** (`'voleibol'`) → Default generic field (wrong)

### After Fix ✅
- **Basketball team** (`'basquetbol'`) → Orange basketball court with 3-point lines ✅
- **Volleyball team** (`'voleibol'`) → Blue volleyball court with net line ✅

---

## 🔑 Key Takeaways

1. **Database uses Spanish slugs** - Always remember this!
2. **All sport checks need Spanish aliases** - English + Spanish
3. **Three places to update:**
   - Position constants (SPORT_POSITIONS)
   - Visual selector checks (array includes)
   - Field rendering functions (if statements)

---

## 📝 Files Modified

1. **`src/app/collect/[token]/page.tsx`**
   - Added `'basquetbol'` and `'voleibol'` to SPORT_POSITIONS (lines 22, 24)

2. **`src/components/team-hub/PlayerInfoForm.tsx`**
   - Added Spanish slugs to SPORT_POSITIONS (lines 47, 61)
   - Updated SportFieldSelector check to include Spanish slugs (line 249)

3. **`src/components/team-hub/SportFieldSelector.tsx`**
   - Updated renderFieldSVG checks for futbol, basquetbol, voleibol (lines 18, 35, 49)
   - Updated getBgColor checks for basquetbol, voleibol (lines 111, 112)

---

## ✅ Compilation Status

All files compiled successfully:
```
✓ Compiled /collect/[token] in 429ms (1119 modules)
✓ Compiled in 213ms (1088 modules)
```

No TypeScript errors. No runtime errors.

---

## 🚀 Related Documentation

- **SPORT_FLOW_COMPLETE.md** - Complete sport identification flow
- **SPORTS_FIX_SUMMARY.md** - Original sports synchronization fix
- **src/lib/sports/sportsMapping.ts** - Spanish-English slug mapping utility

---

Last Updated: 2025-10-11
Fixed By: Claude Code
