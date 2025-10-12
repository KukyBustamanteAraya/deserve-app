-- Create missing profile for player account
-- This fixes the foreign key constraint violation

INSERT INTO public.profiles (id, full_name, created_at, updated_at)
VALUES (
  'd7b532ba-5f1f-4e24-a300-4c6b0fce3285',
  'Player Account',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify the profile was created
SELECT id, full_name FROM public.profiles WHERE id = 'd7b532ba-5f1f-4e24-a300-4c6b0fce3285';
