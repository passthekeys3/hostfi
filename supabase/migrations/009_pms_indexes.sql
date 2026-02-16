-- PMS integration indexes for efficient upsert lookups
-- These partial indexes only index rows that have PMS IDs, keeping them small

-- Hostaway indexes
CREATE INDEX IF NOT EXISTS idx_properties_hostaway_listing_id 
  ON public.properties(hostaway_listing_id) 
  WHERE hostaway_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_hostaway_reservation_id 
  ON public.revenue(hostaway_reservation_id) 
  WHERE hostaway_reservation_id IS NOT NULL;

-- OwnerRez indexes
CREATE INDEX IF NOT EXISTS idx_properties_ownerrez_property_id 
  ON public.properties(ownerrez_property_id) 
  WHERE ownerrez_property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_ownerrez_booking_id 
  ON public.revenue(ownerrez_booking_id) 
  WHERE ownerrez_booking_id IS NOT NULL;
