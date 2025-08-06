'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useUserProfile } from './useUserProfile'

interface ExternalTeamMember {
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
  organization_name?: string
}

export function useExternalTeamMembers() {
  const { profile } = useUserProfile()
  const [externalTeamMembers, setExternalTeamMembers] = useState<ExternalTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExternalTeamMembers = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      
      // Fetch profiles where organization_id doesn't match the logged-in user's organization_id
      const { data: profilesData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .neq('organization_id', profile.organization_id)
        .not('organization_id', 'is', null) // Exclude profiles with null organization_id
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching external team members:', fetchError)
        setError(fetchError.message)
        return
      }

      if (!profilesData || profilesData.length === 0) {
        console.log('No external team members found')
        setExternalTeamMembers([])
        return
      }

      // Get unique organization IDs
      const organizationIds = [...new Set(profilesData.map(member => member.organization_id).filter(Boolean))]
      
      // Fetch organization names for these IDs
      const { data: organizationsData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', organizationIds)

      if (orgError) {
        console.error('Error fetching organizations:', orgError)
        // Continue without organization names
      }

      console.log('External team members data:', profilesData)
      console.log('Organizations data:', organizationsData)

      // Create a map of organization_id to organization_name
      const orgMap = new Map()
      organizationsData?.forEach(org => {
        orgMap.set(org.id, org.name)
      })

      // Transform the data to include organization_name
      const transformedData = profilesData.map(member => ({
        ...member,
        organization_name: orgMap.get(member.organization_id) || 'Unknown Organization'
      }))
      
      setExternalTeamMembers(transformedData as ExternalTeamMember[])
    } catch (err) {
      console.error('External team members fetch error:', err)
      setError('Failed to fetch external team members')
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id])

  useEffect(() => {
    fetchExternalTeamMembers()
  }, [fetchExternalTeamMembers])

  // Calculate statistics
  const stats = {
    totalMembers: externalTeamMembers.length,
    activeMembers: externalTeamMembers.filter(member => member.status === 1).length,
    inactiveMembers: externalTeamMembers.filter(member => member.status === 0).length,
    pendingMembers: externalTeamMembers.filter(member => member.role === 'PENDING').length,
    // Count unique organizations (companies)
    companies: [...new Set(externalTeamMembers.map(member => member.organization_id).filter(Boolean))].length
  }

  return { 
    externalTeamMembers, 
    loading, 
    error, 
    stats,
    refetch: fetchExternalTeamMembers 
  }
}