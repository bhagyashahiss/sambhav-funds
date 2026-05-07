-- Add incident_date column to transactions
-- This date is shown as "Event Date" on the receipt; defaults to event date when not specified
ALTER TABLE transactions ADD COLUMN incident_date DATE;
