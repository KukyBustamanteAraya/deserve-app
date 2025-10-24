-- Check the actual columns in mercadopago_payments table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mercadopago_payments'
ORDER BY ordinal_position;
