-- Fix Storage RLS Policies for Workflow Files Upload
-- This script addresses the "new row violates row-level security policy" error

-- First, ensure the workflow-files bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workflow-files',
  'workflow-files',
  true,
  10485760, -- 10MB in bytes
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/json'];

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing storage policies for workflow-files to start fresh
DROP POLICY IF EXISTS "Users can upload workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update workflow files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete workflow files" ON storage.objects;
DROP POLICY IF EXISTS "workflow-files upload policy" ON storage.objects;
DROP POLICY IF EXISTS "workflow-files select policy" ON storage.objects;
DROP POLICY IF EXISTS "workflow-files update policy" ON storage.objects;
DROP POLICY IF EXISTS "workflow-files delete policy" ON storage.objects;

-- Create comprehensive storage policies for workflow-files bucket
-- Policy 1: Allow authenticated users to upload files to workflow-files bucket
CREATE POLICY "workflow-files upload policy" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'workflow-files'
    AND auth.uid() IS NOT NULL
  );

-- Policy 2: Allow authenticated users to view files in workflow-files bucket
CREATE POLICY "workflow-files select policy" ON storage.objects
  FOR SELECT 
  TO authenticated
  USING (
    bucket_id = 'workflow-files'
    AND auth.uid() IS NOT NULL
  );

-- Policy 3: Allow authenticated users to update their own files
CREATE POLICY "workflow-files update policy" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (
    bucket_id = 'workflow-files'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'workflow-files'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: Allow authenticated users to delete their own files
CREATE POLICY "workflow-files delete policy" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'workflow-files'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Alternative: If the above policies still don't work, use these more permissive ones
-- Uncomment these and comment out the above policies if needed

/*
-- More permissive policies (use only if the above don't work)
CREATE POLICY "workflow-files upload policy permissive" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (bucket_id = 'workflow-files');

CREATE POLICY "workflow-files select policy permissive" ON storage.objects
  FOR SELECT 
  TO authenticated
  USING (bucket_id = 'workflow-files');

CREATE POLICY "workflow-files update policy permissive" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (bucket_id = 'workflow-files')
  WITH CHECK (bucket_id = 'workflow-files');

CREATE POLICY "workflow-files delete policy permissive" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (bucket_id = 'workflow-files');
*/

-- Verify the bucket configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'workflow-files';

-- Verify the policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%workflow-files%';

-- Test query to check if authenticated users can access the bucket
-- This should return true when run by an authenticated user
SELECT 
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
    ELSE 'User is not authenticated'
  END as auth_status,
  auth.uid() as user_id,
  auth.role() as user_role;