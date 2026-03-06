-- Add Lodgify tracking columns to properties and revenue tables

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lodgify_property_id TEXT;
CREATE INDEX IF NOT EXISTS idx_properties_lodgify_id ON public.properties(lodgify_property_id) WHERE lodgify_property_id IS NOT NULL;

ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS lodgify_reservation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_revenue_lodgify_id ON public.revenue(lodgify_reservation_id) WHERE lodgify_reservation_id IS NOT NULL;
