# Permission Error Fix Guide

## Error Encountered
```
ERROR: 42501: must be owner of table objects
```

This error occurs because the current database user doesn't have sufficient permissions to modify the `storage.objects` table policies directly through SQL.

## Quick Solutions (Choose One)

### Solution 1: Use Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard** → Storage → Policies
2. **Delete any existing policies** for the `workflow-files` bucket
3. **Create new policies manually**:

   **Policy 1: Upload Policy**
   - Name: `workflow-files-upload`
   - Table: `objects`
   - Operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression: (leave empty)
   - WITH CHECK expression: `bucket_id = 'workflow-files'`

   **Policy 2: Select Policy**
   - Name: `workflow-files-select`
   - Table: `objects`
   - Operation: `SELECT`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'workflow-files'`

   **Policy 3: Update Policy**
   - Name: `workflow-files-update`
   - Table: `objects`
   - Operation: `UPDATE`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'workflow-files'`
   - WITH CHECK expression: `bucket_id = 'workflow-files'`

   **Policy 4: Delete Policy**
   - Name: `workflow-files-delete`
   - Table: `objects`
   - Operation: `DELETE`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'workflow-files'`

### Solution 2: Disable RLS Temporarily (Development Only)

⚠️ **Only use this for development/testing**

1. **Go to Supabase Dashboard** → Storage → Settings
2. **Find the `objects` table** in the RLS section
3. **Disable RLS** for the `objects` table
4. **Test your upload functionality**

### Solution 3: Manual Bucket Setup

1. **Run the alternative SQL script**:
   ```sql
   -- Execute frontend/sql/alternative_storage_fix.sql
   ```

2. **Go to Supabase Dashboard** → Storage
3. **Verify the `workflow-files` bucket exists**
4. **Set bucket to Public** if not already
5. **Go to Storage → Policies**
6. **Create the policies manually** (as described in Solution 1)

### Solution 4: Use Service Role Key (Advanced)

If you have access to the service role key:

1. **Create a new SQL query** with service role permissions
2. **Use the service role key** in your Supabase client
3. **Run the original fix script** with elevated permissions

## Verification Steps

After implementing any solution:

1. **Check bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'workflow-files';
   ```

2. **Test upload in your application**
3. **Check browser console** for any remaining errors
4. **Verify files appear** in Supabase Dashboard → Storage

## Alternative: Modify Upload Function

If policies continue to be problematic, you can modify the upload approach:

```javascript
// Add this to your dashboard component
const uploadWithRetry = async (file, bucket, path, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFileToSupabase(file, bucket, path)
      if (result) return result
    } catch (error) {
      console.log(`Upload attempt ${attempt} failed:`, error)
      if (attempt === maxRetries) {
        // Final attempt - show user-friendly error
        alert(`Failed to upload ${file.name}. Please try again or contact support.`)
        return null
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  return null
}
```

## Quick Test

To test if the fix worked:

1. **Open your application**
2. **Go to the workflow form**
3. **Try uploading a small test file**
4. **Check browser console** for success/error messages
5. **Verify in Supabase Dashboard** → Storage that the file appears

## Common Issues After Fix

### Issue: "Bucket not found"
- Manually create the bucket in Supabase Dashboard
- Ensure it's named exactly `workflow-files`
- Set it to Public

### Issue: "File too large"
- Check file is under 10MB
- Verify bucket file size limit

### Issue: "Invalid file type"
- Ensure file is .xlsx, .xls, .csv, or .json
- Check browser console for MIME type errors

## Support

If you continue to have issues:
1. Try Solution 2 (disable RLS temporarily) for testing
2. Check that your user is properly authenticated
3. Verify the bucket exists and is public
4. Test with a very small file first

The permission error is a common Supabase limitation, but the dashboard-based solutions should resolve the upload issue.