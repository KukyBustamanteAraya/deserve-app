# Advanced Lineup Management System - Implementation Plan

**Project:** Deserve App - Team Lineup Management
**Date Created:** 2025-10-12
**Status:** Planning Phase

---

## 1. Current State Analysis

### What We Have:
✅ **Working basketball court visualization** (`MiniFieldMap.tsx`)
- Accurate NBA half-court rendering with proper dimensions
- Enhanced visual appearance with red lines on wood court
- Player markers with hover tooltips showing details
- Sport-agnostic design supporting multiple sports

✅ **Collision detection** (MiniFieldMap.tsx:342-395)
- Groups players by position
- Applies circular offset pattern for overlapping players
- Current limitation: Shows ALL players on court, no uniqueness enforcement

✅ **Database structure**
- `player_info_submissions` table with player data (name, jersey, size, position)
- Team page loads all players successfully
- No filtering issues

✅ **Position definitions** (`fieldLayouts.ts`)
- Basketball: 5 positions (PG, SG, SF, PF, C) with coordinates
- Extensible to other sports

### Current Limitations:
❌ **No one-player-per-position enforcement** - Multiple players at same position all shown on court
❌ **No bench management system** - No way to designate starters vs substitutes
❌ **No drag-and-drop functionality** - Cannot swap players between court and bench
❌ **No dedicated lineup page** - Only mini-view on team dashboard
❌ **No lineup persistence** - No database storage for starter/bench configuration

---

## 2. Requirements Summary

Based on user request, the system should:

1. **One player per position on court** - Only 5 starters visible on basketball court
2. **Bench area below court** - Remaining players categorized by position
3. **Drag-and-drop swapping** - Move players between court positions and bench
4. **Full-page dedicated view** - Expandable from team dashboard
5. **Access control** - Managers can edit, players can view
6. **Visual clarity** - Clear distinction between starters and bench players

---

## 3. Architecture Design

### 3.1 Route Structure

**New route:** `/mi-equipo/[slug]/lineup`

**Entry point:** Clickable card on team dashboard (page.tsx:985-996) - expand the existing MiniFieldMap area

### 3.2 State Management

```typescript
interface LineupState {
  // Map of position to starting player (one per position)
  starters: {
    'Point Guard'?: Player;
    'Shooting Guard'?: Player;
    'Small Forward'?: Player;
    'Power Forward'?: Player;
    'Center'?: Player;
  };

  // Bench players grouped by position
  bench: {
    'Point Guard': Player[];
    'Shooting Guard': Player[];
    'Small Forward': Player[];
    'Power Forward': Player[];
    'Center': Player[];
  };

  // Players without assigned position
  unassigned: Player[];

  // Track if lineup has unsaved changes
  isDirty: boolean;
}
```

### 3.3 Component Hierarchy

```
app/mi-equipo/[slug]/lineup/page.tsx (New Full Page)
├── LineupHeader
│   ├── Back button
│   ├── Team name & sport
│   └── Save/Cancel buttons (manager only)
│
├── CourtSection (Enhanced MiniFieldMap)
│   ├── Basketball court SVG
│   └── Starting 5 PlayerMarkers (droppable zones)
│       └── Each position is a drop target
│
├── BenchSection (New Component)
│   ├── PositionGroup (PG)
│   │   └── PlayerCard[] (draggable)
│   ├── PositionGroup (SG)
│   │   └── PlayerCard[] (draggable)
│   ├── PositionGroup (SF)
│   │   └── PlayerCard[] (draggable)
│   ├── PositionGroup (PF)
│   │   └── PlayerCard[] (draggable)
│   ├── PositionGroup (C)
│   │   └── PlayerCard[] (draggable)
│   └── UnassignedGroup
│       └── PlayerCard[] (players without position)
│
└── DragDropContext (dnd-kit wrapper)
```

---

## 4. Database Schema

### 4.1 New Table: `team_lineups`

```sql
CREATE TABLE team_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES player_info_submissions(id) ON DELETE CASCADE,
  position VARCHAR(50) NOT NULL, -- e.g., 'Point Guard', 'Center'
  is_starter BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0, -- Order within bench for same position
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure only one starter per position per team
  UNIQUE(team_id, position, is_starter) WHERE is_starter = true
);

-- Index for fast lookups
CREATE INDEX idx_team_lineups_team_id ON team_lineups(team_id);
CREATE INDEX idx_team_lineups_player_id ON team_lineups(player_id);
```

### 4.2 RLS Policies

```sql
-- Allow team members to view lineup
CREATE POLICY "Team members can view lineup"
  ON team_lineups FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Only managers can modify lineup
CREATE POLICY "Managers can modify lineup"
  ON team_lineups FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );
```

---

## 5. Drag-and-Drop Implementation

### 5.1 Library: `@dnd-kit/core`

**Why dnd-kit over react-beautiful-dnd:**
- Better TypeScript support
- More flexible API
- Active maintenance (react-beautiful-dnd is no longer maintained)
- Better performance with large lists

### 5.2 Installation

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 5.3 Drag Zones

**Draggable items:**
- Player cards on court (starters)
- Player cards on bench (substitutes)

**Drop zones:**
- Each of 5 positions on court
- Each position category on bench
- Unassigned area

### 5.4 Drag Logic

```typescript
// When drag ends
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  if (!over) return; // Dropped outside

  const draggedPlayerId = active.id;
  const dropZone = over.id; // e.g., "court-PG", "bench-SG", "unassigned"

  // Parse drop zone
  const [zone, position] = dropZone.split('-');

  if (zone === 'court') {
    // Moving to starter position
    // Remove from current location
    // Add to starters[position]
    // Move previous starter (if exists) to bench
  } else if (zone === 'bench') {
    // Moving to bench
    // Remove from current location
    // Add to bench[position]
  } else if (zone === 'unassigned') {
    // Moving to unassigned
    // Remove from current location
    // Add to unassigned list
  }

  setIsDirty(true); // Mark as having unsaved changes
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Basic Layout - No Editing)
**Status:** ⏳ Pending
**Goal:** Create read-only lineup page with proper structure

**Tasks:**
- [ ] Create new route `/mi-equipo/[slug]/lineup/page.tsx`
- [ ] Create `LineupCourt` component (copy from MiniFieldMap, adapt for single players)
- [ ] Create `BenchSection` component with position groups
- [ ] Implement logic to split players into starters vs bench
- [ ] Add navigation from team dashboard to lineup page
- [ ] Style with team branding colors

**Deliverable:** Full-page lineup view showing 1 player per position on court, others on bench

**Estimated Time:** 3-4 hours

---

### Phase 2: Drag-and-Drop Functionality
**Status:** ⏳ Pending
**Goal:** Enable interactive position swapping

**Tasks:**
- [ ] Install `@dnd-kit/core` and related packages
- [ ] Wrap lineup page in `DragDropContext`
- [ ] Make player cards draggable with `useDraggable`
- [ ] Make position zones droppable with `useDroppable`
- [ ] Implement `handleDragEnd` logic for swapping
- [ ] Add visual feedback during drag (ghost image, drop zone highlights)
- [ ] Add animations for smooth transitions
- [ ] Show warning for unsaved changes

**Deliverable:** Fully interactive drag-and-drop lineup editor

**Estimated Time:** 4-5 hours

---

### Phase 3: Database Persistence
**Status:** ⏳ Pending
**Goal:** Save and load lineup configurations

**Tasks:**
- [ ] Create migration for `team_lineups` table
- [ ] Create API route `/api/teams/[teamId]/lineup` (GET, PUT)
- [ ] Implement `loadLineup()` function to fetch from DB on mount
- [ ] Implement `saveLineup()` function to persist changes
- [ ] Add "Save Changes" and "Cancel" buttons
- [ ] Handle conflicts (e.g., player deleted while editing)
- [ ] Add success/error notifications

**Deliverable:** Persistent lineup storage with save/cancel workflow

**Estimated Time:** 3-4 hours

---

### Phase 4: Permissions & Polish
**Status:** ⏳ Pending
**Goal:** Proper access control and UX refinements

**Tasks:**
- [ ] Check `isManager` flag and hide edit controls for players
- [ ] Show "View Only" badge for non-managers
- [ ] Add responsive design for mobile/tablet
- [ ] Implement undo/redo functionality (optional)
- [ ] Add keyboard shortcuts (ESC to cancel, CMD+S to save)
- [ ] Add loading states and skeleton screens
- [ ] Handle edge cases (no players, all players same position, etc.)
- [ ] Add tooltips and help text

**Deliverable:** Production-ready lineup management system

**Estimated Time:** 3-4 hours

---

## 7. Technical Considerations

### 7.1 Player Position Assignment

**Challenge:** What if players don't have positions assigned?

**Solution:**
- Show in "Unassigned" section at bottom of bench
- Allow managers to assign positions via drag-and-drop or inline edit
- Update `player_info_submissions.position` when assigning

### 7.2 Position Flexibility

**Challenge:** Basketball has 5 positions, but users might want flexible formations

**Solution (Future Enhancement):**
- Allow custom formations (4-1, 3-2, etc.)
- Store formation type in `team_settings`
- Render court positions dynamically based on formation

### 7.3 Multiple Sports

**Challenge:** Soccer has 11 positions, volleyball has 6, etc.

**Solution:**
- Use `fieldLayouts.ts` to get position list for sport
- Generate bench categories dynamically based on sport
- Adjust court size and layout per sport

### 7.4 Performance

**Challenge:** Large rosters (50+ players) could slow down rendering

**Solution:**
- Use `react-window` or virtualization for bench section if needed
- Implement search/filter for large rosters
- Lazy load player images

### 7.5 Conflict Resolution

**Challenge:** Two managers editing lineup simultaneously

**Solution:**
- Show "Last updated by X at Y" timestamp
- Implement optimistic locking (check `updated_at` before saving)
- Show conflict modal if lineup changed since loading

---

## 8. File Structure

```
src/
├── app/
│   └── mi-equipo/
│       └── [slug]/
│           ├── page.tsx (Update: Add link to lineup page)
│           └── lineup/
│               └── page.tsx (New: Full lineup management)
│
├── components/
│   └── team/
│       ├── MiniFieldMap.tsx (Existing: Keep for dashboard preview)
│       ├── LineupCourt.tsx (New: Full-size court for lineup page)
│       ├── BenchSection.tsx (New: Bench with position categories)
│       ├── PlayerCard.tsx (New: Draggable player card)
│       └── PositionGroup.tsx (New: Position category with players)
│
├── lib/
│   └── lineup/
│       ├── lineupState.ts (New: State management utilities)
│       └── lineupPersistence.ts (New: Save/load from DB)
│
└── api/
    └── teams/
        └── [teamId]/
            └── lineup/
                └── route.ts (New: API endpoints)
```

---

## 9. Open Questions

1. Should we start with basketball only, or make it sport-agnostic from the beginning?
2. Do you want managers to be able to change player positions, or just assign starters?
3. Should we add a "Formation" concept (e.g., "Offense", "Defense" lineups)?
4. Any specific visual design preferences for the bench area?

---

## 10. Progress Tracking

### Phase 1: Foundation
- **Started:** Not yet
- **Completed:** Not yet
- **Status:** Awaiting approval

### Phase 2: Drag-and-Drop
- **Started:** Not yet
- **Completed:** Not yet
- **Status:** Blocked by Phase 1

### Phase 3: Database Persistence
- **Started:** Not yet
- **Completed:** Not yet
- **Status:** Blocked by Phase 2

### Phase 4: Permissions & Polish
- **Started:** Not yet
- **Completed:** Not yet
- **Status:** Blocked by Phase 3

---

## 11. Notes & Decisions

**Date: 2025-10-12**
- Initial plan created based on user requirements
- Decided to use dnd-kit over react-beautiful-dnd for better maintenance
- Designed state structure to support multiple sports
- Created database schema with RLS policies for security

---

## 12. Related Files

- `/src/components/team/MiniFieldMap.tsx` - Current court visualization
- `/src/lib/sports/fieldLayouts.ts` - Position definitions
- `/src/app/mi-equipo/[slug]/page.tsx` - Team dashboard
- `/Users/kukybustamantearaya/Desktop/Deserve/deserve-app/BasketballCourtFinal.tsx` - Reference implementation
