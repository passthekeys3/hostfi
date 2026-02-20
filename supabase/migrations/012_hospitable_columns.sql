-- Hospitable PMS integration columns
-- Migration: 012_hospitable_columns.sql

-- Add hospitable_property_id to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS hospitable_property_id TEXT;

-- Add hospitable_reservation_id to revenue table
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS hospitable_reservation_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_hospitable_property_id 
  ON properties(hospitable_property_id) WHERE hospitable_property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_hospitable_reservation_id 
  ON revenue(hospitable_reservation_id) WHERE hospitable_reservation_id IS NOT NULL;

-- Add confirmation_code column to revenue if it doesn't exist (for platform booking IDs)
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS confirmation_code TEXT;
