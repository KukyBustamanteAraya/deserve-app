# Team Colors Synchronization - Deserve App

## Overview
Team colors (primary, secondary, accent) are automatically synced throughout the entire Deserve app, whether a team is created through the dashboard or through a design request.

## Color Flow

### 1. **User Selects Colors** (Product Customization Page)
Location: `/personaliza` → `/personaliza/resumen`

When a user customizes their design, they select three colors:
- **Primary Color**: Main team color
- **Secondary Color**: Second team color
- **Accent Color**: Highlight/accent color

### 2. **Team Creation/Update** (`/personaliza/resumen/page.tsx`)

#### First Time (New Team):
```typescript
// Lines 128-139
const { data: newTeam } = await supabase
  .from('teams')
  .insert({
    slug: teamSlug,
    name: teamName,
    owner_id: user.id,
    created_by: user.id,
    colors: {
      primary: teamColors.primary,
      secondary: teamColors.secondary,
      accent: teamColors.accent,
    },
    logo_url: logoUrl,
  })
```

#### Subsequent Design Requests (Existing Team):
```typescript
// Lines 109-120
const { error: updateError } = await supabase
  .from('teams')
  .update({
    name: teamName,
    colors: {
      primary: teamColors.primary,
      secondary: teamColors.secondary,
      accent: teamColors.accent,
    },
    logo_url: logoUrl,
  })
  .eq('id', team.id);
```

**Result**: Team colors are always updated to match the latest design request colors.

### 3. **Design Request Storage**
Location: `design_requests` table

Each design request also stores the colors individually:
```typescript
// Lines 160-183
await supabase
  .from('design_requests')
  .insert({
    user_id: user.id,
    team_id: team.id,
    primary_color: teamColors.primary,
    secondary_color: teamColors.secondary,
    accent_color: teamColors.accent,
    // ... other fields
  })
```

This allows each design to maintain its own color history while the team colors reflect the most recent customization.

## Where Team Colors are Displayed

### 1. **Team Dashboard** (`/mi-equipo`)
- **Banner**: Full-width banner with team colors gradient
- **Design Cards**: Each design shows its color swatches
- **Invite/Share Cards**: Buttons use team color gradient

### 2. **Team Management List** (`/dashboard/team`)
- **Color Stripe**: Vertical 3-stripe color preview next to each team name
  - Shows primary, secondary, and accent colors
  - Appears in the team list view

### 3. **Individual Team Page** (`/mi-equipo/[slug]`)
- **Banner**: CustomizeBanner component with team colors
- **Action Buttons**: Use team color gradients
- **Status Badges**: Styled with team primary color

### 4. **Design Request Cards** (`/mi-equipo`)
Each design request displays:
- Three color swatches (8x8px boxes)
- Shows the colors used for that specific design

## Database Schema

### `teams` table
```sql
{
  id: uuid,
  name: text,
  slug: text,
  owner_id: uuid,
  colors: jsonb {  -- Automatically synced on every design request
    primary: "#HEX",
    secondary: "#HEX",
    accent: "#HEX"
  },
  logo_url: text,
  created_at: timestamp,
  updated_at: timestamp
}
```

### `design_requests` table
```sql
{
  id: uuid,
  team_id: uuid,
  primary_color: text,    -- Snapshot of colors at request time
  secondary_color: text,
  accent_color: text,
  created_at: timestamp
}
```

## Key Features

✅ **Auto-Sync**: Team colors update automatically when a new design is requested
✅ **History Preserved**: Each design request keeps its own color snapshot
✅ **Consistent Display**: Colors shown the same way across all pages
✅ **Visual Preview**: Color stripes in team list for quick identification
✅ **Gradient Buttons**: Action buttons use team color gradients for branding

## Example Flow

1. **User creates first design**:
   - Selects Red (#FF0000), Blue (#0000FF), Yellow (#FFFF00)
   - Team created with these colors
   - Banner shows Red → Yellow gradient

2. **User creates second design**:
   - Changes colors to Green (#00FF00), Purple (#800080), Orange (#FFA500)
   - Same team updated with new colors
   - Banner now shows Green → Orange gradient
   - First design still shows Red/Blue/Yellow in its card
   - Second design shows Green/Purple/Orange in its card

3. **Team Management Page**:
   - Shows vertical stripe: Green | Purple | Orange
   - Easy to identify team by colors at a glance

## Components Using Team Colors

- `CustomizeBanner` - Team banner with gradient
- `TeamListClient` - Color stripe preview
- `SplitPayButton` - Uses team colors (optional)
- Design request cards - Color swatches

## Notes

- Colors are stored as JSONB in PostgreSQL for flexibility
- Hex format is used throughout (#RRGGBB)
- Gradients are created using CSS `linear-gradient(135deg, primary, accent)`
- Color sync happens server-side during team creation/update
- No manual sync required - automatic on every design request
