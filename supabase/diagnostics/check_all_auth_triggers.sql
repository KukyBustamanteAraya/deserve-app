-- Check ALL triggers on auth.users table
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  t.tgtype AS trigger_type,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'auth.users'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;
