# Authentication Setup Guide

This guide will help you set up Supabase authentication with Google OAuth for the internal frontend application.

## Prerequisites

- A Supabase account and project
- Google Cloud Console account for OAuth setup

## 1. Supabase Setup

### Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized

### Get Your Supabase Credentials
1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - `Project URL`
   - `anon public` key

### Update Environment Variables
1. Open `frontend/internal/.env.local`
2. Replace the placeholder values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
```
**Note**: Replace `your-project-id` with your actual Supabase project ID from your dashboard.

## 2. Google OAuth Setup (via Supabase)

Supabase acts as your authentication provider and handles Google OAuth for you. You just need to configure it in your Supabase dashboard.

### Configure Google OAuth in Supabase
1. In your Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** and click to configure
3. Enable the Google provider
4. Supabase will provide you with the redirect URL to use in Google Console (typically: `https://your-project-id.supabase.co/auth/v1/callback`)
5. Follow the instructions in the Supabase dashboard to:
   - Create Google OAuth credentials in Google Cloud Console
   - Add the Supabase-provided redirect URL to your Google OAuth configuration
   - Enter your Google Client ID and Client Secret in Supabase

**Important**: The redirect URI mismatch error occurs when:
- You haven't set up Google OAuth credentials in Supabase yet
- The redirect URI in Google Console doesn't match Supabase's callback URL
- You're using placeholder environment variables

**Note**: Supabase handles the entire OAuth flow - you don't need to implement Google OAuth separately!

## 3. Authentication Flow

The application includes the following authentication features:

### Pages Created
- `/` - Landing page with login/signup options
- `/auth/login` - Login form with email/password and Google OAuth
- `/auth/signup` - Registration form with email/password and Google OAuth
- `/auth/callback` - OAuth callback handler
- `/auth/auth-code-error` - Error page for authentication failures
- `/dashboard` - Protected dashboard page

### Components Created
- `LoginForm` - Login form component
- `SignupForm` - Registration form component
- `AuthContext` - Authentication context provider

### Authentication Features
- ✅ Email/password authentication
- ✅ Google OAuth authentication
- ✅ User session management
- ✅ Protected routes
- ✅ Automatic redirects
- ✅ Error handling

## 4. Running the Application

1. Install dependencies (if not already done):
```bash
cd frontend/internal
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## 5. Testing Authentication

### Email/Password Authentication
1. Go to `/auth/signup` to create a new account
2. Check your email for the confirmation link
3. Click the confirmation link to verify your account
4. Go to `/auth/login` to sign in

### Google OAuth Authentication
1. Go to `/auth/login` or `/auth/signup`
2. Click "Continue with Google"
3. Complete the Google OAuth flow
4. You'll be redirected to the dashboard

## 6. Customization

### Styling
The components use Tailwind CSS classes. You can customize the styling by modifying the className attributes in:
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/app/dashboard/page.tsx`

### Authentication Logic
The authentication logic is centralized in:
- `src/contexts/AuthContext.tsx` - Main authentication context
- `src/lib/supabase.ts` - Client-side Supabase client
- `src/lib/supabase-server.ts` - Server-side Supabase client

### Adding More OAuth Providers
To add more OAuth providers (GitHub, Facebook, etc.):
1. Configure the provider in Supabase dashboard
2. Add the provider method to `AuthContext.tsx`
3. Add buttons to the login/signup forms

## 7. Security Considerations

- Environment variables are properly configured for client/server separation
- Authentication state is managed securely through Supabase
- Protected routes automatically redirect unauthenticated users
- OAuth callbacks are properly handled with error states

## 8. Troubleshooting

### Common Issues

**"Invalid login credentials" error:**
- Make sure the user has confirmed their email address
- Check that the email/password combination is correct

**Google OAuth not working:**
- Verify Google OAuth credentials in Supabase
- Check that redirect URIs are correctly configured
- Ensure Google+ API is enabled

**Users not being created in Supabase after Google OAuth:**
- Check Supabase Authentication > Users to see if users are actually being created
- Verify that the OAuth callback route is properly handling the authentication code exchange
- Check browser Network tab during OAuth flow for any failed requests
- Ensure your Supabase project has the correct redirect URL: `https://your-project-id.supabase.co/auth/v1/callback`
- In Google Cloud Console, make sure the redirect URI is exactly: `https://your-project-id.supabase.co/auth/v1/callback`
- Check Supabase Authentication > Settings > Auth Providers > Google for proper configuration
- Verify that your Google OAuth app is not in testing mode (which limits users)

**Environment variables not loading:**
- Make sure `.env.local` is in the correct directory
- Restart the development server after changing environment variables
- Check that variable names start with `NEXT_PUBLIC_`

**Authentication state not persisting:**
- Check browser console for errors
- Verify Supabase configuration
- Clear browser cookies and try again

**Email confirmation not being sent:**
- Check Supabase Authentication > Settings > Auth > Email Templates
- Verify SMTP settings in Supabase (by default uses Supabase's email service)
- Check spam/junk folder for confirmation emails
- For development: Disable email confirmation in Supabase Auth settings
- Go to Authentication > Settings > Auth > Email auth > Confirm email = OFF (for development only)
- Check Supabase logs for email delivery errors

**Debugging Signup Issues:**
1. Open browser Developer Tools (F12) and check Console tab
2. Try to sign up and look for error messages in console
3. Check Network tab for failed API requests to Supabase
4. Verify in Supabase dashboard: Authentication > Users to see if user was created
5. Check Supabase dashboard: Authentication > Logs for detailed error information
6. Common issues:
   - Rate limiting: Too many signup attempts from same IP
   - Invalid email format
   - Password too weak (check Supabase password policy)
   - Email domain restrictions in Supabase settings
   - SMTP configuration issues for email delivery

**Email Delivery Troubleshooting:**
- Supabase free tier has email rate limits (30 emails/hour)
- Check if your email domain is blacklisted
- Verify email templates are properly configured
- For production: Set up custom SMTP provider (SendGrid, AWS SES, etc.)
- Test with different email addresses (Gmail, Yahoo, etc.)

## 9. Next Steps

After setting up authentication, you might want to:
- Add user profile management
- Implement role-based access control
- Add password reset functionality
- Set up email templates in Supabase
- Add user avatar uploads
- Implement user preferences

## Support

If you encounter any issues, check:
1. Supabase dashboard for authentication logs
2. Browser developer console for JavaScript errors
3. Network tab for failed API requests
4. Supabase documentation for additional configuration options