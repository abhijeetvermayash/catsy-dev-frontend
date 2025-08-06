# Workflow Form Setup Instructions

This document provides instructions for setting up the workflow form functionality with Supabase storage and database.

## Prerequisites

- Supabase project set up
- Supabase client configured in your Next.js app
- Authentication working

## Setup Steps

### 1. Create Database Table and Storage

Run the SQL script in your Supabase SQL Editor:

```sql
-- Execute the contents of frontend/sql/create_workflows_table.sql
```

This will:
- Create the `workflows` table with proper structure
- Create the `workflow-files` storage bucket
- Set up Row Level Security (RLS) policies
- Create storage policies for file access

### 2. Storage Bucket Configuration

The setup script creates a public storage bucket called `workflow-files` with the following structure:
```
workflow-files/
├── source-files/
│   └── {user-id}/    # User uploaded data source files organized by user ID
└── template-files/
    └── {user-id}/    # User uploaded template files organized by user ID
```

### 3. Database Schema

The `workflows` table includes:
- `id` - UUID primary key
- `user_id` - References auth.users(id)
- `organisation_id` - UUID of the user's organization
- `brand_name` - Brand name from form
- `marketplace_channels` - Array of selected marketplaces
- `data_source_type` - 'url' or 'file'
- `source_file_url` - URL or uploaded file URL
- `template_source_type` - 'url' or 'file'
- `template_file_url` - Template URL or uploaded file URL
- `requirements` - User requirements text
- `callback_url` - Optional callback URL (initially empty)
- `status` - Workflow status enum ('ACTIVE', 'INACTIVE', 'UNDER PROCESS') - defaults to 'UNDER PROCESS'
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

## How It Works

### File Upload Process

1. **User selects file upload option** in step 2 or 3
2. **File is temporarily stored** in component state
3. **On form submission**, files are uploaded to Supabase storage:
   - Source files go to `workflow-files/source-files/`
   - Template files go to `workflow-files/template-files/`
4. **File URLs are obtained** from Supabase storage
5. **Workflow record is created** in database with file URLs

### Form Submission Flow

```javascript
handleSubmitWorkflow() {
  1. Show loading state
  2. Upload source file (if file type selected)
  3. Upload template file (if file type selected)  
  4. Create workflow record in database
  5. Show success message
  6. Reset form and close modal
}
```

### Security

- **RLS policies** ensure users can only access their own workflows
- **Storage policies** restrict file access to the uploading user
- **File naming** uses timestamps and random strings to prevent conflicts
- **File validation** accepts only .xlsx, .xls, .csv, .json files

## Usage

1. User fills out the 4-step workflow form:
   - Step 1: Basic Information (brand name, marketplaces)
   - Step 2: Data Source (URL or file upload)
   - Step 3: Upload Templates (URL or file upload)
   - Step 4: Describe Requirements (text area)

2. On submission:
   - Files are uploaded to Supabase storage
   - Workflow record is created in database
   - User receives confirmation message

## Error Handling

The form includes comprehensive error handling:
- File upload failures show specific error messages
- Database insertion errors are caught and displayed
- Loading states prevent multiple submissions
- Form validation ensures required fields are filled

## File Size Limits

- Maximum file size: 10MB per file
- Supported formats: .xlsx, .xls, .csv, .json
- Files are stored with unique names to prevent conflicts

## Monitoring

You can monitor workflow submissions in your Supabase dashboard:
- Check the `workflows` table for new entries
- Monitor the `workflow-files` storage bucket for uploaded files
- Review logs for any upload or insertion errors

## Troubleshooting

### Storage Upload Errors

If you encounter "row-level security policy" errors during file upload, try these solutions in order:

#### Solution 1: Update Storage Policies
Run the updated SQL script which includes improved storage policies:
```sql
-- The script now includes these policies
CREATE POLICY "Allow authenticated users to upload workflow files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'workflow-files'
    AND auth.role() = 'authenticated'
  );
```

#### Solution 2: Verify Bucket Configuration
1. Go to Supabase Dashboard → Storage
2. Check that `workflow-files` bucket exists and is public
3. Verify bucket permissions are set correctly

#### Solution 3: Check Authentication
- Ensure user is properly authenticated before file upload
- Verify `auth.uid()` returns a valid user ID
- Check that the user session is active

#### Solution 4: Disable RLS (If other solutions don't work)
If you continue to get RLS errors, you can temporarily disable RLS for storage:
```sql
-- Run this in Supabase SQL Editor as a last resort
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**Note**: Disabling RLS reduces security, so only use this for development/testing.

#### Solution 5: Manual Bucket Setup
If the automatic bucket creation fails, manually create the bucket:
1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `workflow-files`
3. Set it to public
4. Re-run the storage policies from the SQL script

### File Path Structure
Files are organized by user ID:
- Source files: `source-files/{user-id}/filename.ext`
- Template files: `template-files/{user-id}/filename.ext`

### Database Insertion Errors

If workflow creation fails:
1. Check that all required fields are provided
2. Verify the user has a valid `organization_id` in their profile
3. Ensure the `workflow_status` enum exists in your database