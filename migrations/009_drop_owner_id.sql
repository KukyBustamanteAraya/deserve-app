-- Migration: 009_drop_owner_id.sql
-- Description: Drop old owner_id column from teams table (replaced by created_by)
-- Date: 2025-10-02

-- Step 1: If owner_id exists and has data, migrate it to created_by
DO $$
BEGIN
  -- Check if owner_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teams'
      AND column_name = 'owner_id'
  ) THEN

    -- Migrate any data from owner_id to created_by if created_by is null
    UPDATE public.teams
    SET created_by = owner_id
    WHERE created_by IS NULL AND owner_id IS NOT NULL;

    -- Drop the old column
    ALTER TABLE public.teams DROP COLUMN IF EXISTS owner_id;

    RAISE NOTICE 'Dropped owner_id column from teams table';
  ELSE
    RAISE NOTICE 'owner_id column does not exist, skipping';
  END IF;
END $$;

-- Step 2: Ensure created_by is NOT NULL (it should allow NULL per schema, but let's verify data integrity)
-- Optional: Make created_by NOT NULL if you want to enforce it
-- ALTER TABLE public.teams ALTER COLUMN created_by SET NOT NULL;
