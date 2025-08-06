'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useUserProfile } from './useUserProfile'

interface TeamMember {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  email: string
  organization_id: string | null
  role: string | null
  status: number
  created_at: string
  updated_at: string
}

export function useTeamMembers() {
  const { profile } = useUserProfile()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamMembers = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching team members:', fetchError)
        setError(fetchError.message)
        return
      }

      console.log('Team members data:', data)
      setTeamMembers((data as unknown as TeamMember[]) || [])
    } catch (err) {
      console.error('Team members fetch error:', err)
      setError('Failed to fetch team members')
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id])

  useEffect(() => {
    fetchTeamMembers()
  }, [fetchTeamMembers])

  // Calculate statistics
  const stats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(member => member.status === 1).length,
    inactiveMembers: teamMembers.filter(member => member.status === 0).length,
    pendingMembers: teamMembers.filter(member => member.role === 'PENDING').length,
    roles: [...new Set(teamMembers.map(member => member.role).filter(Boolean))].length
  }

  return { 
    teamMembers, 
    loading, 
    error, 
    stats,
    refetch: fetchTeamMembers 
  }
}