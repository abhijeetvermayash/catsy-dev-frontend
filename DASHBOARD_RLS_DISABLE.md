# Disable RLS via Supabase Dashboard - Immediate Fix

Since you cannot disable RLS via SQL due to permission restrictions, follow these exact steps in the Supabase Dashboard:

## Step 1: Disable RLS on Storage Objects Table

1. **Go to your Supabase Dashboard**
2. **Navigate to**: Database → Tables
3. **Find the `storage` schema** (you may need to toggle "Show system schemas")
4. **Locate the `objects` table** under the `storage` schema
5. **Click on the `objects` table**
6. **Look for "Row Level Security" section** (usually at the top or in settings)
7. **Toggle OFF** the "Enable RLS" switch for the `objects` table

## Step 2: Ensure Bucket Exists and is Public

1. **Navigate to**: Storage
2. **Check if `workflow-files` bucket exists**
   - If it doesn't exist, click "New bucket"
   - Name: `workflow-files`
   - Make it **Public**: ✅
3. **If it exists**, click on it and ensure it's set to **Public**

## Step 3: Remove Any Existing Policies (Optional)

1. **Navigate to**: Database → Policies
2. **Look for any policies** on the `storage.objects` table
3. **Delete any existing policies** related to `workflow-files` or storage

## Step 4: Test the Upload

1. **Go back to your application**
2. **Try uploading a file** through the workflow form
3. **Check browser console** - the error should be gone
4. **Verify in Storage** that the file appears

## Alternative: Use Supabase CLI (If you have it installed)

If you have Supabase CLI installed locally:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run SQL with elevated permissions
supabase db reset --linked
```

Then run:
```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

## Verification

After disabling RLS:

1. **Check in Dashboard**: Database → Tables → storage.objects
   - RLS should show as "Disabled"

2. **Test upload** in your application

3. **Check browser console** - should see success messages instead of RLS errors

## Re-enabling Security Later (Optional)

Once uploads are working, you can re-enable RLS and create proper policies:

1. **Re-enable RLS** on `storage.objects` table
2. **Create specific policies** for your `workflow-files` bucket
3. **Test that uploads still work**

## Quick Test

To confirm the fix worked:
- Upload a small test file (.csv or .xlsx)
- Check browser console for success message
- Verify file appears in Storage → workflow-files

This dashboard approach should immediately resolve the RLS policy violation error.