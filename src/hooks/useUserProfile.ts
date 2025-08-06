'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface UserProfile {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  email: string
  organization_id: string | null
  role: string
  category: string | null
  status: number
  permissions: string[]
  created_at: string
  updated_at: string
}

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      
      // First, get the profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        setError(profileError.message)
        return
      }

      console.log('Profile data:', profileData)

      // Then, get the category from roles table using the role as foreign key
      let category = null
      let permissions: string[] = []
      
      if (profileData?.role) {
        // Get category from roles table
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('category')
          .eq('name', profileData.role)
          .single()

        if (roleError) {
          // console.error('Error fetching role category:', roleError)
        } else {
          console.log('Role data:', roleData)
          category = roleData?.category
        }

        // Get permissions from role_permissions table
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('role_permissions')
          .select('permission_action')
          .eq('role_name', profileData.role)

        if (permissionsError) {
          console.error('Error fetching role permissions:', permissionsError)
        } else {
          console.log('Permissions data:', permissionsData)
          permissions = permissionsData?.map((p: any) => p.permission_action as string) || []
        }
      }

      // Combine the data - if status is 0 (inactive), set permissions to empty array
      const processedData = {
        ...profileData,
        category,
        permissions: profileData?.status === 0 ? [] : permissions
      }
      console.log('Final processed data:', processedData)
      setProfile(processedData as UserProfile)
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError('Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}