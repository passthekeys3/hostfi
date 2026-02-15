-- Add bedrooms, bathrooms, sqft to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms integer DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms numeric(3,1) DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sqft integer;
