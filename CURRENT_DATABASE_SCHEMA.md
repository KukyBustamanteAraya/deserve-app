# Current Database Schema Reference

**Last Updated:** 2025-10-10 (Phase 3.0 implementation)

This document tracks the ACTUAL current state of the database schema. Always reference this when creating new migrations or features.

## Schema Inspection Endpoint

Visit: `http://localhost:3000/api/dev/schema-info`

This endpoint shows the current state of key tables.

## Key Tables

### 1. **teams**
Primary Key: `id` (UUID)

**Columns:**
- id
- name
- slug
- sport (nullable)
- sport_id (nullable)
- sports (nullable)
- team_type
- owner_id
- current_owner_id
- created_by
- colors (JSONB)
- logo_url
- is_institutional
- institution_name
- quorum_threshold
- quorum_locked
- voting_open
- voting_closes_at
- design_allowance_used
- setup_completed
- created_at
- updated_at

### 2. **team_memberships**
Composite Primary Key: (team_id, user_id)

**Columns:**
- team_id (UUID) → references teams(id)
- user_id (UUID) → references auth.users(id)
- role (TEXT) → 'owner', 'manager', 'player', 'coach'
- created_at

### 3. **player_info_submissions**
Primary Key: `id` (UUID)

**Columns:**
- id
- team_id (UUID) → references teams(id)
- design_request_id (INT) → references design_requests(id)
- user_id (UUID, nullable) → references auth.users(id)
- player_name
- jersey_number
- size
- position
- additional_notes
- submitted_by_manager (BOOLEAN)
- submission_token (nullable)
- created_at
- updated_at

**Important Notes:**
- This table stores BOTH roster players (no user_id) and app users who submitted their own info (has user_id)
- When user_id is NULL → roster-only player (no app account)
- When user_id is set → player with app account

### 4. **profiles**
Primary Key: `id` (UUID) - references auth.users(id)

**Columns:**
- id (UUID)
- full_name
- avatar_url
- created_at
- updated_at
- is_admin (BOOLEAN)
- role (TEXT) → 'customer', 'admin', etc.

### 5. **team_settings**
Primary Key: `team_id` (UUID)

**Columns:**
- team_id (UUID) → references teams(id)
- approval_mode
- min_approvals_required
- voting_deadline
- designated_voters (ARRAY)
- player_info_mode → 'hybrid', 'manager_only', 'self_service'
- self_service_enabled (BOOLEAN)
- info_collection_link
- info_collection_token
- info_collection_expires_at
- access_mode → 'invite_only', 'public', etc.
- allow_member_invites (BOOLEAN)
- notify_on_design_ready (BOOLEAN)
- notify_on_vote_required (BOOLEAN)
- primary_color
- secondary_color
- tertiary_color
- created_at
- updated_at

### 6. **design_requests**
Primary Key: `id` (INT, auto-increment)

**Columns:**
- id
- team_id (UUID) → references teams(id)
- requested_by (UUID) → references auth.users(id)
- brief (TEXT, nullable)
- status → 'pending', 'rendering', 'ready', 'cancelled'
- selected_candidate_id (INT, nullable)
- order_id (UUID, nullable) → references orders(id)
- created_at
- updated_at

## Relationships for Phase 3.0 (Unified Member Management)

**Understanding the Data Model:**

1. **App Users** = records in `profiles` table (have auth.users account)
2. **Team Members** = records in `team_memberships` table (users who are part of a team)
3. **Roster Players** = records in `player_info_submissions` table

**The Key Insight:**
- A player in `player_info_submissions` may or may not have a user account (`user_id` can be NULL)
- When `user_id` is NULL → roster-only player (should show "Invite" button)
- When `user_id` is set → player with app account (should check if they're a team member)

**Unified View Logic:**
```sql
-- Get all members (unified view)
SELECT
  p.id,
  p.player_name as name,
  p.user_id,
  CASE
    WHEN tm.user_id IS NOT NULL THEN 'Active Member'
    WHEN ti.id IS NOT NULL AND ti.status = 'pending' THEN 'Invited (Pending)'
    WHEN p.user_id IS NOT NULL THEN 'Has Account (Not Member)'
    ELSE 'Roster Only'
  END as status,
  tm.role as member_role,
  ti.status as invite_status
FROM player_info_submissions p
LEFT JOIN team_memberships tm ON tm.user_id = p.user_id AND tm.team_id = p.team_id
LEFT JOIN team_invites ti ON ti.player_submission_id = p.id
WHERE p.team_id = ?
ORDER BY status, name
```

## Migration Guidelines

**ALWAYS:**
1. Check current schema via `/api/dev/schema-info` endpoint before creating migrations
2. Reference this document to understand relationships
3. Test migrations in Supabase SQL Editor first
4. Use exact table and column names as shown in this document

**NEVER:**
- Assume column names (always verify)
- Create migrations without checking current state
- Use generic or assumed foreign key references

## Change Log

- 2025-10-10: Created this reference document during Phase 3.0 implementation
- 2025-10-10: Fixed migration 052 - changed `player_info_id` to `player_submission_id`
