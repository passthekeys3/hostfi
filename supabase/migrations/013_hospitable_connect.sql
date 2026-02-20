-- Hospitable Connect integration columns
-- This is for the VENDOR-LEVEL integration (separate from the user-level OAuth integration)

-- Add columns for tracking Hospitable Connect listings and reservations
ALTER TABLE properties ADD COLUMN IF NOT EXISTS hospitable_connect_listing_id TEXT;
ALTER TABLE revenue ADD COLUMN IF NOT EXISTS hospitable_connect_reservation_id TEXT;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_properties_hospitable_connect_listing_id 
  ON properties(hospitable_connect_listing_id) 
  WHERE hospitable_connect_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_hospitable_connect_reservation_id 
  ON revenue(hospitable_connect_reservation_id) 
  WHERE hospitable_connect_reservation_id IS NOT NULL;
