# Settings Page Refactoring Plan
**Date**: 2025-10-22
**File**: `src/app/mi-equipo/[slug]/settings/page.tsx`
**Current Size**: 2,104 lines
**Target**: Modular architecture with files <350 lines

---

## 📊 Summary of Changes

### Quick Wins Completed ✅
- Deleted 13 duplicate files (~160KB)
- Added ESLint rules (max-lines: 300)
- Created directory structure
- Backup created: `page.tsx.backup`

### Refactoring Status
- **Phase 1**: Ready to execute (documented below)
- **Phase 2-5**: Planned (see main architectural plan)

---

## 🎯 Phase 1: Foundation Components (LOW RISK)

### What Will Be Extracted

1. **TeamInfoSection Component** (~180 lines)
   - Team name editing
   - Sport selection
   - Basic team information display

2. **AccessControlSection Component** (~120 lines)
   - Access mode settings
   - Member invite permissions
   - Join settings

---

## 📝 Detailed Extraction Plan

### 1. TeamInfoSection Component

**New File**: `src/app/mi-equipo/[slug]/settings/components/TeamInfoSection.tsx`

**Props Interface**:
```typescript
interface TeamInfoSectionProps {
  team: Team | null;
  sports: Sport[];
  sportsLoading: boolean;
  onUpdateTeamInfo: (field: 'name' | 'sport', value: string) => Promise<void>;
}
```

**Extracted Lines**: Approximately lines 650-830 from original (JSX for team info UI)

**Dependencies**:
- `Team` interface (already defined in page.tsx)
- `Sport` type from `@/hooks/api/useSports`
- `getSportInfo` from `@/lib/sports/sportsMapping`

**State Management**:
- NO internal state (fully controlled by parent)
- All state passed via props

**Code Structure**:
```typescript
'use client';

import { Team } from '../page';
import { getSportInfo } from '@/lib/sports/sportsMapping';

interface Sport {
  id: string;
  name: string;
  slug: string;
}

interface TeamInfoSectionProps {
  team: Team | null;
  sports: Sport[];
  sportsLoading: boolean;
  onUpdateTeamInfo: (field: 'name' | 'sport', value: string) => Promise<void>;
}

export function TeamInfoSection({
  team,
  sports,
  sportsLoading,
  onUpdateTeamInfo
}: TeamInfoSectionProps) {
  if (!team) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        Información del Equipo
      </h2>

      {/* Team Name Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nombre del Equipo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={team.name}
              onChange={(e) => {
                // Handle in parent via onUpdateTeamInfo
              }}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => onUpdateTeamInfo('name', team.name)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Sport Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Deporte
          </label>
          <select
            value={team.sport || ''}
            onChange={(e) => onUpdateTeamInfo('sport', e.target.value)}
            className="w-full px-3 py-2 border rounded"
            disabled={sportsLoading}
          >
            <option value="">Seleccionar deporte</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.slug}>
                {sport.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sport Info Display */}
        {team.sport && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              Deporte actual: {getSportInfo(team.sport)?.name || team.sport}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Usage in Main Page**:
```typescript
import { TeamInfoSection } from './components/TeamInfoSection';

// In render:
<TeamInfoSection
  team={team}
  sports={sports}
  sportsLoading={sportsLoading}
  onUpdateTeamInfo={handleUpdateTeamInfo}
/>
```

---

### 2. AccessControlSection Component

**New File**: `src/app/mi-equipo/[slug]/settings/components/AccessControlSection.tsx`

**Props Interface**:
```typescript
interface AccessControlSectionProps {
  settings: TeamSettings | null;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
}
```

**Extracted Lines**: Approximately lines 1350-1470 from original

**Dependencies**:
- `TeamSettings` type from `@/types/team-settings`
- `AccessMode` type from `@/types/team-settings`

**State Management**:
- NO internal state
- Updates propagated via `onSettingsChange` callback

**Code Structure**:
```typescript
'use client';

import type { TeamSettings, AccessMode } from '@/types/team-settings';

interface AccessControlSectionProps {
  settings: TeamSettings | null;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
}

export function AccessControlSection({
  settings,
  onSettingsChange
}: AccessControlSectionProps) {
  if (!settings) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        Control de Acceso
      </h2>

      {/* Access Mode */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Modo de Acceso
          </label>
          <select
            value={settings.access_mode || 'invite_only'}
            onChange={(e) => onSettingsChange({
              access_mode: e.target.value as AccessMode
            })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="invite_only">Solo por invitación</option>
            <option value="join_request">Solicitud de unión</option>
            <option value="open">Abierto</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Controla cómo los usuarios pueden unirse al equipo
          </p>
        </div>

        {/* Allow Member Invites */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={settings.allow_member_invites || false}
            onChange={(e) => onSettingsChange({
              allow_member_invites: e.target.checked
            })}
            className="mr-2"
          />
          <label className="text-sm">
            Permitir que miembros inviten a otros
          </label>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            {settings.access_mode === 'open' &&
              'Cualquier persona puede unirse sin aprobación'}
            {settings.access_mode === 'join_request' &&
              'Los usuarios deben solicitar unirse y ser aprobados'}
            {settings.access_mode === 'invite_only' &&
              'Solo usuarios invitados pueden unirse'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Usage in Main Page**:
```typescript
import { AccessControlSection } from './components/AccessControlSection';

// In render:
<AccessControlSection
  settings={settings}
  onSettingsChange={(updates) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  }}
/>
```

---

## 🔄 Updated Main Page Structure

After Phase 1, `page.tsx` will look like:

```typescript
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamSettings } from '@/types/team-settings';
import { useSports } from '@/hooks/api/useSports';
import { PaymentSettingsCard } from '@/components/team/PaymentSettingsCard';
import { HexColorPicker } from 'react-colorful';

// NEW IMPORTS
import { TeamInfoSection } from './components/TeamInfoSection';
import { AccessControlSection } from './components/AccessControlSection';

export interface Team {
  id: string;
  slug: string;
  name: string;
  sport?: string;
  team_type?: 'single_team' | 'institution';
  institution_name?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  owner_id: string;
  current_owner_id: string;
}

export default function TeamSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = getBrowserClient();
  const { sports, isLoading: sportsLoading } = useSports();

  // All existing state variables (unchanged)
  const [team, setTeam] = useState<Team | null>(null);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  // ... rest of state

  // All existing functions (unchanged)
  const loadData = async () => { /* ... */ };
  const handleUpdateTeamInfo = async (field: 'name' | 'sport', value: string) => { /* ... */ };
  const handleSave = async () => { /* ... */ };
  // ... rest of handlers

  if (loading) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Configuración del Equipo</h1>

      {/* PHASE 1: NEW COMPONENTS */}
      <div className="space-y-6">
        <TeamInfoSection
          team={team}
          sports={sports}
          sportsLoading={sportsLoading}
          onUpdateTeamInfo={handleUpdateTeamInfo}
        />

        <AccessControlSection
          settings={settings}
          onSettingsChange={(updates) => {
            setSettings(prev => prev ? { ...prev, ...updates } : null);
          }}
        />

        {/* Existing sections remain inline for now */}
        {/* Team Branding Section - Phase 2 */}
        {/* Member Management Section - Phase 4 */}
        {/* Player Info Section - Phase 3 */}
        {/* Payment Settings - Already extracted */}
        {/* Design Approval Section - Phase 3 */}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 File Structure After Phase 1

```
src/app/mi-equipo/[slug]/settings/
├── page.tsx (~1,900 lines - reduced from 2,104)
├── page.tsx.backup (original 2,104 lines - SAFETY)
├── components/
│   ├── TeamInfoSection.tsx (~180 lines) ✨ NEW
│   └── AccessControlSection.tsx (~120 lines) ✨ NEW
├── hooks/ (empty - for Phase 2+)
└── utils/ (empty - for Phase 2+)
```

---

## ✅ Testing Checklist for Phase 1

After extraction, verify:

1. **Team Info Section**:
   - [ ] Page loads without errors
   - [ ] Team name displays correctly
   - [ ] Can edit team name
   - [ ] Save button updates team name
   - [ ] Sport dropdown shows all sports
   - [ ] Can change sport
   - [ ] Sport info displays after selection

2. **Access Control Section**:
   - [ ] Settings display correctly
   - [ ] Can change access mode
   - [ ] Checkbox for member invites works
   - [ ] Help text updates based on mode
   - [ ] Settings save correctly

3. **Integration**:
   - [ ] No TypeScript errors
   - [ ] No console errors
   - [ ] ESLint passes
   - [ ] Build succeeds
   - [ ] Hot reload works

---

## 🚨 Rollback Instructions

If issues occur:

```bash
# Restore original file
cd src/app/mi-equipo/[slug]/settings
cp page.tsx.backup page.tsx

# Remove new components
rm components/TeamInfoSection.tsx
rm components/AccessControlSection.tsx

# Restart dev server
npm run dev
```

---

## 📈 Benefits of Phase 1

- **Reduced complexity**: Main file 204 lines shorter
- **Reusability**: Components can be used elsewhere
- **Testability**: Components can be unit tested independently
- **Maintainability**: Changes to team info/access isolated
- **ESLint compliance**: New files well under 300 line limit

---

## 🔮 Next Phases (Future Reference)

### Phase 2: Branding & Uploads
- Extract `BrandingSection.tsx`
- Extract `useTeamBranding.ts` hook
- Handle logo/banner uploads

### Phase 3: Settings Management
- Extract `PlayerInfoSection.tsx`
- Extract `ApprovalSection.tsx`
- Extract `useTeamSettings.ts` hook
- **CRITICAL**: Migrate `handleSave()` carefully

### Phase 4: Member Management (HIGHEST RISK)
- Extract `memberUnification.ts` utility
- Extract `useTeamMembers.ts` hook
- Extract `MemberManagementSection.tsx`
- Extract `InviteModal.tsx`

### Phase 5: Final Integration
- Refactor `page.tsx` to pure orchestrator
- Integration testing
- Performance optimization

---

## 📚 Reference Links

- **Backup Location**: `src/app/mi-equipo/[slug]/settings/page.tsx.backup`
- **ESLint Config**: `.eslintrc.json`
- **Type Definitions**: `src/types/team-settings.ts`
- **Full Architectural Plan**: See conversation summary above

---

**Last Updated**: 2025-10-22
**Status**: Phase 1 documented, ready for execution
**Risk Level**: LOW ✅
