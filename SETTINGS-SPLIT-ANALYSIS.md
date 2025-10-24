# Settings Page Split Analysis
**Date**: 2025-10-22
**File**: `src/app/mi-equipo/[slug]/settings/page.tsx`
**Current Size**: 2,018 lines (after Phase 1 extraction)

---

## 📊 Current Structure

```
Lines 1-13:    Imports
Lines 15-29:   Team interface
Lines 31-656:  Shared logic (state, handlers, data loading)
Lines 658-1179: Institution UI (523 lines)
Lines 1180-2018: Single Team UI (839 lines)
```

---

## 🔍 Code Classification

### **SHARED CODE (Used by Both)**

#### **Imports** (Lines 1-13)
```typescript
- use, useState, useEffect from 'react'
- useRouter from 'next/navigation'
- getBrowserClient from '@/lib/supabase/client'
- TeamSettings, ApprovalMode, PlayerInfoMode, AccessMode, PaymentMode types
- logger from '@/lib/logger'
- useSports hook
- getSportInfo from sports mapping
- PaymentSettingsCard component
- HexColorPicker
- TeamInfoSection (existing extracted component)
- AccessControlSection (existing extracted component)
```

#### **Types** (Lines 15-29)
```typescript
interface Team {
  id, slug, name, sport
  team_type: 'single_team' | 'institution'
  institution_name, colors
  owner_id, current_owner_id
}
```

#### **State Variables** (Lines 37-56)
```typescript
SHARED:
- team, setTeam
- settings, setSettings
- user, setUser
- loading, setLoading
- saving, setSaving
- isOwner, setIsOwner
- showPrimaryPicker, setShowPrimaryPicker
- showSecondaryPicker, setShowSecondaryPicker
- showTertiaryPicker, setShowTertiaryPicker
- uploadingLogo, setUploadingLogo
- uploadingBanner, setUploadingBanner

SINGLE TEAM ONLY:
- members, setMembers (line 43)
- showInviteModal, setShowInviteModal (line 44)
- inviteEmail, setInviteEmail (line 45)
- inviteRole, setInviteRole (line 46)
- invitingPlayerId, setInvitingPlayerId (line 47)
- generatedInviteLink, setGeneratedInviteLink (line 48)
- linkCopied, setLinkCopied (line 49)
```

#### **Handler Functions**

**SHARED** (Lines 62-593):
- `loadData()` - Loads team, settings, checks ownership
- `handleUpdateTeamInfo(field, value)` - Updates name/sport
- `handleSave()` - Saves all settings to database
- `handleLogoUpload(event)` - Uploads logo file
- `handleBannerUpload(event)` - Uploads banner file

**SINGLE TEAM ONLY** (Lines 167-410):
- `loadMembers(teamId)` - Loads members/players/invites (line 167)
- `handleChangeRole(userId, newRole)` - Changes member role (line 320)
- `handleRemoveMember(userId)` - Removes a member (line 340)

**INSTITUTION ONLY**:
- None identified (uses shared handlers)

---

## 📁 Target Architecture

```
src/app/mi-equipo/[slug]/settings/
│
├── page.tsx (80-100 lines)
│   └── Router component - checks team_type
│
├── shared/
│   ├── hooks/
│   │   └── useTeamSettingsData.ts
│   │       ├── useLoadData()
│   │       ├── useSaveSettings()
│   │       └── useFileUploads()
│   ├── types/
│   │   └── team.ts (Team interface)
│   └── utils/
│       └── team-settings-helpers.ts
│
├── single-team/
│   ├── SingleTeamSettings.tsx (150-200 lines)
│   │   └── Main orchestrator component
│   ├── components/
│   │   ├── TeamInfoSection.tsx ✓ (109 lines - exists)
│   │   ├── AccessControlSection.tsx ✓ (50 lines - exists)
│   │   ├── BrandingSection.tsx
│   │   ├── PlayerInfoSection.tsx
│   │   ├── MemberManagementSection.tsx
│   │   └── DesignApprovalSection.tsx
│   └── hooks/
│       └── useMemberManagement.ts
│           ├── loadMembers()
│           ├── handleChangeRole()
│           └── handleRemoveMember()
│
└── institution/
    ├── InstitutionSettings.tsx (120-150 lines)
    │   └── Main orchestrator component
    ├── components/
    │   ├── InstitutionProfile.tsx (~80 lines)
    │   ├── InstitutionBranding.tsx (~150 lines)
    │   ├── PoliciesSection.tsx (~100 lines)
    │   ├── DeliveryAddresses.tsx (~100 lines)
    │   └── AdministrativePersonnel.tsx (~90 lines)
    └── hooks/
        └── useInstitutionData.ts
```

---

## 🎯 Phase 1 Split Plan (Current Task)

### **Step 1: Create Directory Structure**
```bash
mkdir -p src/app/mi-equipo/[slug]/settings/shared/hooks
mkdir -p src/app/mi-equipo/[slug]/settings/shared/types
mkdir -p src/app/mi-equipo/[slug]/settings/shared/utils
mkdir -p src/app/mi-equipo/[slug]/settings/single-team/components
mkdir -p src/app/mi-equipo/[slug]/settings/single-team/hooks
mkdir -p src/app/mi-equipo/[slug]/settings/institution/components
mkdir -p src/app/mi-equipo/[slug]/settings/institution/hooks
```

### **Step 2: Move Existing Components**
```bash
# Move already extracted components to single-team folder
mv components/TeamInfoSection.tsx single-team/components/
mv components/AccessControlSection.tsx single-team/components/
rmdir components
```

### **Step 3: Extract Institution UI → InstitutionSettings.tsx**

**Source**: Lines 658-1179 (523 lines)

**Target File**: `institution/InstitutionSettings.tsx`

**Props Interface**:
```typescript
interface InstitutionSettingsProps {
  team: Team;
  settings: TeamSettings;
  user: any;
  isOwner: boolean;
  sports: Sport[];
  sportsLoading: boolean;
  // State setters
  onTeamChange: (updates: Partial<Team>) => void;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
  // Handlers
  onUpdateTeamInfo: (field: 'name' | 'sport', value: string) => Promise<void>;
  onSave: () => Promise<void>;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onBannerUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  // UI state
  showPrimaryPicker: boolean;
  setShowPrimaryPicker: (show: boolean) => void;
  showSecondaryPicker: boolean;
  setShowSecondaryPicker: (show: boolean) => void;
  showTertiaryPicker: boolean;
  setShowTertiaryPicker: (show: boolean) => void;
  uploadingLogo: boolean;
  uploadingBanner: boolean;
  saving: boolean;
}
```

### **Step 4: Extract Single Team UI → SingleTeamSettings.tsx**

**Source**: Lines 1180-2018 (839 lines)

**Target File**: `single-team/SingleTeamSettings.tsx`

**Props Interface**:
```typescript
interface SingleTeamSettingsProps {
  team: Team;
  settings: TeamSettings;
  user: any;
  isOwner: boolean;
  sports: Sport[];
  sportsLoading: boolean;
  // State setters
  onTeamChange: (updates: Partial<Team>) => void;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
  // Handlers
  onUpdateTeamInfo: (field: 'name' | 'sport', value: string) => Promise<void>;
  onSave: () => Promise<void>;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onBannerUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  // Member management
  members: any[];
  onLoadMembers: (teamId: string) => Promise<void>;
  onChangeRole: (userId: string, newRole: 'owner' | 'manager' | 'player') => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  // UI state
  showPrimaryPicker: boolean;
  setShowPrimaryPicker: (show: boolean) => void;
  showSecondaryPicker: boolean;
  setShowSecondaryPicker: (show: boolean) => void;
  showTertiaryPicker: boolean;
  setShowTertiaryPicker: (show: boolean) => void;
  uploadingLogo: boolean;
  uploadingBanner: boolean;
  saving: boolean;
  // Invite modal state
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: 'manager' | 'player';
  setInviteRole: (role: 'manager' | 'player') => void;
  invitingPlayerId: string | null;
  setInvitingPlayerId: (id: string | null) => void;
  generatedInviteLink: string | null;
  setGeneratedInviteLink: (link: string | null) => void;
  linkCopied: boolean;
  setLinkCopied: (copied: boolean) => void;
}
```

### **Step 5: Create Router page.tsx**

**Target File**: `page.tsx` (~80-100 lines)

```typescript
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamSettings } from '@/types/team-settings';
import { useSports } from '@/hooks/api/useSports';
import type { Team } from './shared/types/team';
import { SingleTeamSettings } from './single-team/SingleTeamSettings';
import { InstitutionSettings } from './institution/InstitutionSettings';

export default function TeamSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = getBrowserClient();
  const { sports, isLoading: sportsLoading } = useSports();

  // All shared state...
  const [team, setTeam] = useState<Team | null>(null);
  // ... (all state variables)

  // All shared handlers...
  const loadData = async () => { /* ... */ };
  const handleUpdateTeamInfo = async () => { /* ... */ };
  const handleSave = async () => { /* ... */ };
  // ... (all handlers)

  // Single-team specific
  const [members, setMembers] = useState<any[]>([]);
  const loadMembers = async (teamId: string) => { /* ... */ };
  const handleChangeRole = async () => { /* ... */ };
  const handleRemoveMember = async () => { /* ... */ };
  // ... (all member management state/handlers)

  useEffect(() => {
    loadData();
  }, [slug]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  // Route to appropriate component
  if (team.team_type === 'institution') {
    return (
      <InstitutionSettings
        team={team}
        settings={settings}
        user={user}
        isOwner={isOwner}
        sports={sports}
        sportsLoading={sportsLoading}
        onTeamChange={(updates) => setTeam({ ...team, ...updates })}
        onSettingsChange={(updates) => setSettings({ ...settings, ...updates })}
        onUpdateTeamInfo={handleUpdateTeamInfo}
        onSave={handleSave}
        onLogoUpload={handleLogoUpload}
        onBannerUpload={handleBannerUpload}
        showPrimaryPicker={showPrimaryPicker}
        setShowPrimaryPicker={setShowPrimaryPicker}
        showSecondaryPicker={showSecondaryPicker}
        setShowSecondaryPicker={setShowSecondaryPicker}
        showTertiaryPicker={showTertiaryPicker}
        setShowTertiaryPicker={setShowTertiaryPicker}
        uploadingLogo={uploadingLogo}
        uploadingBanner={uploadingBanner}
        saving={saving}
      />
    );
  }

  return (
    <SingleTeamSettings
      team={team}
      settings={settings}
      user={user}
      isOwner={isOwner}
      sports={sports}
      sportsLoading={sportsLoading}
      onTeamChange={(updates) => setTeam({ ...team, ...updates })}
      onSettingsChange={(updates) => setSettings({ ...settings, ...updates })}
      onUpdateTeamInfo={handleUpdateTeamInfo}
      onSave={handleSave}
      onLogoUpload={handleLogoUpload}
      onBannerUpload={handleBannerUpload}
      members={members}
      onLoadMembers={loadMembers}
      onChangeRole={handleChangeRole}
      onRemoveMember={handleRemoveMember}
      showPrimaryPicker={showPrimaryPicker}
      setShowPrimaryPicker={setShowPrimaryPicker}
      showSecondaryPicker={showSecondaryPicker}
      setShowSecondaryPicker={setShowSecondaryPicker}
      showTertiaryPicker={showTertiaryPicker}
      setShowTertiaryPicker={setShowTertiaryPicker}
      uploadingLogo={uploadingLogo}
      uploadingBanner={uploadingBanner}
      saving={saving}
      showInviteModal={showInviteModal}
      setShowInviteModal={setShowInviteModal}
      inviteEmail={inviteEmail}
      setInviteEmail={setInviteEmail}
      inviteRole={inviteRole}
      setInviteRole={setInviteRole}
      invitingPlayerId={invitingPlayerId}
      setInvitingPlayerId={setInvitingPlayerId}
      generatedInviteLink={generatedInviteLink}
      setGeneratedInviteLink={setGeneratedInviteLink}
      linkCopied={linkCopied}
      setLinkCopied={setLinkCopied}
    />
  );
}
```

---

## ✅ Safety Measures

1. **Backup created**: `page.tsx.backup` already exists
2. **Incremental approach**: Split first, refactor later
3. **No logic changes**: Pure code movement
4. **Test after each step**: Single team → Institution → Both
5. **Rollback ready**: Can restore from backup instantly

---

## 📋 Testing Checklist

### After Split:
- [ ] Single team settings page loads
- [ ] Institution settings page loads
- [ ] Team name updates work (both)
- [ ] Sport selection works (both)
- [ ] Colors/branding work (both)
- [ ] Member management works (single team)
- [ ] Settings save correctly (both)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Build succeeds

---

## 🚀 Next Steps (Future Phases)

- **Phase 2**: Extract shared logic to hooks
- **Phase 3**: Break down institution components
- **Phase 4**: Break down single team components
- **Phase 5**: Polish and optimize

---

**Status**: Analysis complete, ready for execution
**Risk Level**: MEDIUM (large file split, but no logic changes)
**Estimated Time**: 2-3 hours
