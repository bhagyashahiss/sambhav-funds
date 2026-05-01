-- Add payment_mode to transactions
-- Run this in Supabase SQL Editor

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_mode TEXT;

ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_payment_mode_check;

ALTER TABLE transactions
ADD CONSTRAINT transactions_payment_mode_check
CHECK (payment_mode IN ('cash', 'upi') OR payment_mode IS NULL);
