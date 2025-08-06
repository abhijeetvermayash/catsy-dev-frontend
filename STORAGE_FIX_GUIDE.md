# Storage Upload Fix Guide

## Problem
You're encountering this error when uploading files:
```
POST https://hxinwrwurqmtojultqbf.supabase.co/storage/v1/object/workflow-files/... 400 (Bad Request)
StorageApiError: new row violates row-level security policy
```

## Root Cause
The issue is with Row Level Security (RLS) policies on the Supabase storage bucket. The current policies are either:
1. Not properly configured
2. Too restrictive for the current authentication context
3. Missing or conflicting with existing policies

## Solutions (Try in Order)

### Solution 1: Apply the Fixed RLS Policies (Recommended)

1. **Run the fix script** in your Supabase SQL Editor:
   ```sql
   -- Execute the contents of frontend/sql/fix_storage_rls_policies.sql
   ```

2. **Verify the bucket exists** in Supabase Dashboard → Storage
   - Check that `workflow-files` bucket is present
   - Ensure it's marked as "Public"

3. **Test the upload** by trying to upload a file through your application

### Solution 2: Manual Bucket Recreation

If Solution 1 doesn't work:

1. **Delete the existing bucket** (if it exists):
   ```sql
   DELETE FROM storage.objects WHERE bucket_id = 'workflow-files';
   DELETE FROM storage.buckets WHERE id = 'workflow-files';
   ```

2. **Recreate the bucket manually**:
   - Go to Supabase Dashboard → Storage
   - Click "New bucket"
   - Name: `workflow-files`
   - Set as Public: ✅
   - File size limit: 10MB

3. **Apply the policies** from `fix_storage_rls_policies.sql`

### Solution 3: Temporary RLS Bypass (Development Only)

⚠️ **Use only for development/testing - reduces security**

```sql
-- Temporarily disable RLS on storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

To re-enable later:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### Solution 4: Alternative Upload Method

If storage policies continue to be problematic, you can modify the upload function to use a different approach:

```javascript
// In your uploadFileToSupabase function, add better error handling
const uploadFileToSupabase = async (file, bucket, path) => {
  try {
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      throw new Error('User not authenticated')
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${path}/${user.id}/${fileName}`
    
    console.log('Uploading file:', { filePath, bucket, userId: user.id })
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    console.log('File uploaded successfully:', publicUrl)
    return publicUrl
    
  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error)
    return null
  }
}
```

## Verification Steps

After applying any solution:

1. **Check bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'workflow-files';
   ```

2. **Check policies are active**:
   ```sql
   SELECT policyname, cmd, roles 
   FROM pg_policies 
   WHERE tablename = 'objects' 
   AND schemaname = 'storage'
   AND policyname LIKE '%workflow-files%';
   ```

3. **Test authentication**:
   ```sql
   SELECT auth.uid(), auth.role();
   ```

4. **Test file upload** through your application

## Common Issues and Fixes

### Issue: "User not authenticated"
- Ensure user is logged in before attempting upload
- Check that `auth.uid()` returns a valid UUID
- Verify the session hasn't expired

### Issue: "Bucket not found"
- Run the bucket creation part of the fix script
- Manually create the bucket in Supabase Dashboard

### Issue: "File too large"
- Check file size is under 10MB
- Verify `file_size_limit` in bucket configuration

### Issue: "Invalid file type"
- Ensure file is .xlsx, .xls, .csv, or .json
- Check `allowed_mime_types` in bucket configuration

## File Organization

Files are organized in the bucket as:
```
workflow-files/
├── source-files/
│   └── {user-id}/
│       ├── 1234567890-abc123.xlsx
│       └── 1234567891-def456.csv
└── template-files/
    └── {user-id}/
        ├── 1234567892-ghi789.xlsx
        └── 1234567893-jkl012.json
```

## Monitoring

After implementing the fix:
- Monitor the browser console for any remaining errors
- Check Supabase Dashboard → Storage for uploaded files
- Verify workflow records are created in the database
- Test with different file types and sizes

## Support

If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Ensure your authentication is working correctly
4. Try the temporary RLS bypass for testing (Solution 3)