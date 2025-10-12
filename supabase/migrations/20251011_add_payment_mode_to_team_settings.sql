-- Add payment_mode to team_settings table
-- This allows teams to configure how orders are paid (individual vs manager-pays-all)

ALTER TABLE team_settings
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'individual'
CHECK (payment_mode IN ('individual', 'manager_pays_all'));

-- Add comment
COMMENT ON COLUMN team_settings.payment_mode IS 'Payment mode for team orders: individual (each player pays own share) or manager_pays_all (manager pays entire order)';

-- Also add payment_mode to orders table to track per-order payment mode
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'individual'
CHECK (payment_mode IN ('individual', 'manager_pays_all'));

COMMENT ON COLUMN orders.payment_mode IS 'Payment mode for this specific order, can override team default';

-- Add opted_out columns to order_items for player opt-out functionality
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

COMMENT ON COLUMN order_items.opted_out IS 'True if player opted out of this order item';
COMMENT ON COLUMN order_items.opted_out_at IS 'Timestamp when player opted out';
