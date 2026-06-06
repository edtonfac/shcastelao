-- SQL Migration for Shalom Castelão - Sistema de Pedidos QR Code
-- Execute this script in your Supabase SQL Editor to add required fields

-- 1. Update 'estabelecimento' table with additional metadata and configuration columns
ALTER TABLE public.estabelecimento
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#1FB8DB',
ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#0EA5E9',
ADD COLUMN IF NOT EXISTS horario TEXT,
ADD COLUMN IF NOT EXISTS onboarding_concluido BOOLEAN DEFAULT false;

-- 2. Create Storage Buckets if they don't exist
-- Note: Supabase Storage configurations are usually set via API or dashboard.
-- Below is a standard Postgres snippet to insert a public bucket for products/logos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for public access (Read)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'produtos');

-- Set up storage policies for upload access (Admin Insert/Update)
CREATE POLICY "Admin Upload Access" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'produtos');

CREATE POLICY "Admin Update Access" 
ON storage.objects FOR UPDATE 
TO authenticated 
WITH CHECK (bucket_id = 'produtos');
