-- Fix fabric price modifiers to use proper cent format
-- Current: 7000 cents = $70 CLP
-- Should be: 700000 cents = $7000 CLP
-- Multiply all price_modifier_cents by 100

UPDATE fabrics
SET price_modifier_cents = price_modifier_cents * 100
WHERE price_modifier_cents > 0;

-- Verify the update
SELECT name, price_modifier_cents,
       price_modifier_cents / 100 as "CLP Display"
FROM fabrics
ORDER BY price_modifier_cents;
