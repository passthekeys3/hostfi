-- Guesty integration: add foreign key columns for synced data

-- Properties: track which Guesty listing this came from
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS guesty_listing_id text;
CREATE INDEX IF NOT EXISTS idx_properties_guesty_listing_id ON public.properties(guesty_listing_id) WHERE guesty_listing_id IS NOT NULL;

-- Revenue: track which Guesty reservation this came from
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS guesty_reservation_id text;
CREATE INDEX IF NOT EXISTS idx_revenue_guesty_reservation_id ON public.revenue(guesty_reservation_id) WHERE guesty_reservation_id IS NOT NULL;

-- Integration connections: track last sync time
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Integration connections: store encrypted credentials
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS credentials jsonb;
