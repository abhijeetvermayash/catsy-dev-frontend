'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { handlePostSignup } from '@/lib/post-signup'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, userDetails?: { firstName: string; lastName: string; organisationName: string }) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your_supabase_anon_key')) {
      console.warn('Supabase not properly configured. Skipping authentication setup.')
      setLoading(false)
      setUser(null)
      setSession(null)
      return
    }

    console.log('Supabase properly configured, initializing authentication...')

    // Only proceed if Supabase is properly configured
    let mounted = true

    // Get initial session
    const getSession = async () => {
      try {
        // First try to get existing session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session) {
            setSession(session)
            setUser(session.user)
          } else if (error) {
            console.error('Session error:', error)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error getting session:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          console.log('Auth state changed:', event, !!session)
          if (session?.user) {
            console.log('User details:', {
              id: session.user.id,
              email: session.user.email,
              emailConfirmed: session.user.email_confirmed_at,
              createdAt: session.user.created_at
            })
          }
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Remove supabase.auth dependency to prevent re-runs

  const signUp = async (email: string, password: string, userDetails?: { firstName: string; lastName: string; organisationName: string }) => {
    try {
      console.log('Attempting signup with:', { email, userDetails, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userDetails ? {
            first_name: userDetails.firstName,
            last_name: userDetails.lastName,
            organisation_name: userDetails.organisationName,
          } : {}
        }
      })
      
      console.log('Signup response:', { data, error })
      
      if (data?.user && !error) {
        console.log('User created:', data.user.id, 'Email confirmed:', data.user.email_confirmed_at)
        console.log('User metadata:', data.user.user_metadata)
        
        // Handle post-signup operations (create organization and profile)
        if (userDetails?.organisationName) {
          try {
            console.log('Creating organization and profile...')
            const accessToken = data.session?.access_token
            const postSignupResult = await handlePostSignup(data.user, accessToken)
            console.log('Post-signup success:', postSignupResult)
          } catch (postSignupError) {
            console.error('Post-signup error details:', postSignupError)
            // Don't fail the signup if post-signup operations fail
            // The user is still created, just the organization/profile creation failed
            // You might want to show a warning to the user or retry later
          }
        }
      }
      
      return { error }
    } catch (err) {
      console.error('SignUp error:', err)
      return { error: { message: 'Network error. Please check your connection and Supabase configuration.' } as AuthError }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (err) {
      console.error('SignIn error:', err)
      return { error: { message: 'Network error. Please check your connection and Supabase configuration.' } as AuthError }
    }
  }


  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      console.error('SignOut error:', err)
      return { error: { message: 'Network error. Please check your connection and Supabase configuration.' } as AuthError }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}