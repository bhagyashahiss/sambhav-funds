-- Add donor_phone column to transactions for WhatsApp sharing
ALTER TABLE transactions ADD COLUMN donor_phone TEXT;
