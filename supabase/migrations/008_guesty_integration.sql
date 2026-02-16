-- Guesty integration: add foreign key columns for synced data

-- Properties: track which Guesty listing this came from
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS guesty_listing_id text;
CREATE INDEX IF NOT EXISTS idx_properties_guesty_listing_id ON public.properties(guesty_listing_id) WHERE guesty_listing_id IS NOT NULL;

-- Revenue: track which Guesty reservation this came from
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS guesty_reservation_id text;
CREATE INDEX IF NOT EXISTS idx_revenue_guesty_reservation_id ON public.revenue(guesty_reservation_id) WHERE guesty_reservation_id IS NOT NULL;

-- Integration connections: track last sync time
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Integration connections: store credentials (for API key based integrations)
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS credentials jsonb;

-- Integration connections: add status column
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS status text DEFAULT 'connected';

-- Integration connections: add connected_at column
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS connected_at timestamptz;

-- Allow 'guesty' (and future providers) in the provider check constraint
ALTER TABLE public.integration_connections DROP CONSTRAINT IF EXISTS integration_connections_provider_check;
ALTER TABLE public.integration_connections ALTER COLUMN access_token DROP NOT NULL;

-- Hostaway columns
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS hostaway_listing_id text;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS hostaway_reservation_id text;

-- OwnerRez columns
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ownerrez_property_id text;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS ownerrez_booking_id text;
