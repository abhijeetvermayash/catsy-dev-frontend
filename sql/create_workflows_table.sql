-- Create enum type for workflow status
CREATE TYPE workflow_status AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER PROCESS');

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL,
  brand_name VARCHAR(255) NOT NULL,
  marketplace_channels TEXT[] NOT NULL,
  data_source_type VARCHAR(10) NOT NULL CHECK (data_source_type IN ('url', 'file')),
  source_file_url TEXT NOT NULL,
  template_source_type VARCHAR(10) NOT NULL CHECK (template_source_type IN ('url', 'file')),
  template_file_url TEXT NOT NULL,
  requirements TEXT NOT NULL,
  callback_url TEXT,
  status workflow_status DEFAULT 'UNDER PROCESS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage buckets for workflow files
INSERT INTO storage.buckets (id, name, public)
VALUES ('workflow-files', 'workflow-files', true)
ON CONFLICT (id) DO NOTHING;

-- Alternative: If RLS policies still cause issues, you can disable RLS for this bucket
-- Uncomment the following lines if you continue to get RLS errors:
-- UPDATE storage.buckets SET public = true WHERE id = 'workflow-files';
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Set up RLS (Row Level Security) policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own workflows
CREATE POLICY "Users can view own workflows" ON workflows
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own workflows
CREATE POLICY "Users can insert own workflows" ON workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workflows
CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (auth.uid() = user_id);

-- First, let's make sure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete workflow files" ON storage.objects;

-- Create more permissive storage policies for workflow-files bucket
CREATE POLICY "Allow authenticated users to upload workflow files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'workflow-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to view workflow files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'workflow-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to update workflow files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'workflow-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to delete workflow files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'workflow-files'
    AND auth.role() = 'authenticated'
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE
    ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();