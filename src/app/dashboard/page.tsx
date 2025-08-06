'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useExternalTeamMembers } from '@/hooks/useExternalTeamMembers'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const { teamMembers, loading: teamLoading, stats } = useTeamMembers()
  const { externalTeamMembers, loading: externalTeamLoading, stats: externalStats } = useExternalTeamMembers()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [internalTeamTab, setInternalTeamTab] = useState('members')
  
  // Member action states
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [actionType, setActionType] = useState<'activate' | 'deactivate'>('activate')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('User not authenticated, redirecting to auth...')
      router.push('/auth')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Member action handlers
  const handleAssignRole = (member: any) => {
    setSelectedMember(member)
    setSelectedRole(member.role || '')
    setShowAssignRoleModal(true)
  }

  const handleToggleStatus = (member: any) => {
    setSelectedMember(member)
    setActionType(member.status === 1 ? 'deactivate' : 'activate')
    setShowStatusModal(true)
  }

  const confirmAssignRole = async () => {
    if (!selectedMember || !selectedRole) return
    
    try {
      const supabase = createClient()
      
      // Update role in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', selectedMember.id)
      
      if (error) {
        throw error
      }
      
      // Close modal and reset state
      setShowAssignRoleModal(false)
      setSelectedMember(null)
      setSelectedRole('')
      
      // Refresh the page to show updated data
      window.location.reload()
      
    } catch (error) {
      console.error('Error assigning role:', error)
      alert('Failed to assign role. Please try again.')
    }
  }

  const confirmToggleStatus = async () => {
    if (!selectedMember) return
    
    try {
      const supabase = createClient()
      const newStatus = actionType === 'activate' ? 1 : 0
      
      // Update status in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', selectedMember.id)
      
      if (error) {
        throw error
      }
      
      // Close modal and reset state
      setShowStatusModal(false)
      setSelectedMember(null)
      
      // Refresh the page to show updated data
      window.location.reload()
      
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update account status. Please try again.')
    }
  }

  // Define navigation items based on permissions
  const getNavigationItems = () => {
    const permissions = profile?.permissions || []
    const items = []

    // Dashboard is always available
    items.push({
      id: 'dashboard',
      name: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      ),
      permission: null
    })

    // Create Listings
    if (permissions.includes('create_listings') || permissions.includes('manage_listings')) {
      items.push({
        id: 'create-listings',
        name: 'Create Listings',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        permission: 'create_listings'
      })
    }

    // Workflows
    if (permissions.includes('view_workflows') || permissions.includes('manage_workflows')) {
      items.push({
        id: 'workflows',
        name: 'Workflows',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        permission: 'view_workflows'
      })
    }

    // Generated Files
    if (permissions.includes('view_files') || permissions.includes('manage_files')) {
      items.push({
        id: 'generated-files',
        name: 'Generated Files',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        permission: 'view_files'
      })
    }

    // Team Management - Show for users with ASSIGN_AND_APPROVE permission
    if (permissions.includes('ASSIGN_AND_APPROVE')) {
      items.push({
        id: 'team',
        name: 'Team',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        permission: 'ASSIGN_AND_APPROVE'
      })
    }

    // Account Settings is always available
    items.push({
      id: 'account-settings',
      name: 'Account Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      permission: null
    })

    return items
  }

  const navigationItems = getNavigationItems()

  // Generate snow positions only on client side to avoid hydration mismatch
  const generateSnowFlakes = (count: number) => {
    if (!mounted) return []
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 12
    }))
  }

  const generateLargeSnowFlakes = (count: number) => {
    if (!mounted) return []
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 15 + Math.random() * 20
    }))
  }

  const smallSnowFlakes = generateSnowFlakes(80)
  const largeSnowFlakes = generateLargeSnowFlakes(20)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 relative overflow-hidden">
      {/* Snow Animation Background - Only render on client */}
      {mounted && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated falling snow */}
          <div className="absolute inset-0">
            {smallSnowFlakes.map((flake) => (
              <div
                key={`falling-snow-${flake.id}`}
                className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-snow-fall"
                style={{
                  left: `${flake.left}%`,
                  animationDelay: `${flake.delay}s`,
                  animationDuration: `${flake.duration}s`
                }}
              />
            ))}
          </div>

          {/* Larger snow flakes */}
          <div className="absolute inset-0">
            {largeSnowFlakes.map((flake) => (
              <div
                key={`large-snow-${flake.id}`}
                className="absolute w-2 h-2 bg-white rounded-full opacity-40 animate-snow-fall-slow"
                style={{
                  left: `${flake.left}%`,
                  animationDelay: `${flake.delay}s`,
                  animationDuration: `${flake.duration}s`
                }}
              />
            ))}
          </div>

          {/* Winter background elements */}
          <div className="absolute bottom-0 right-0 w-1/3 h-1/4 opacity-20">
            <svg viewBox="0 0 300 200" className="w-full h-full">
              <path d="M0 200 L50 150 L100 130 L150 110 L200 100 L250 110 L300 120 L300 200 Z" fill="currentColor" className="text-blue-200"/>
              <path d="M150 110 L170 105 L190 110 L200 100 L210 110 L230 105 L250 110" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-screen">
        {/* Enhanced Sidebar with Better Animations */}
        <div className="w-80 bg-gradient-to-b from-white/95 via-blue-50/90 to-purple-50/90 backdrop-blur-md border-r border-white/20 shadow-xl flex flex-col relative overflow-hidden animate-in slide-in-from-left-5 duration-700">
          {/* Winter decorative elements with floating animation */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Animated subtle snow pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-12 right-8 w-1 h-1 bg-blue-200 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-20 left-12 w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
              <div className="absolute top-32 right-6 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDelay: '3s'}}></div>
              <div className="absolute top-48 left-8 w-2 h-2 bg-blue-100 rounded-full animate-pulse" style={{animationDelay: '4s'}}></div>
              <div className="absolute top-64 right-12 w-1 h-1 bg-purple-100 rounded-full animate-ping" style={{animationDelay: '5s'}}></div>
            </div>
            
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-purple-100/20 animate-pulse" style={{animationDuration: '4s'}}></div>
          </div>

          {/* Logo with entrance animation */}
          <div className="p-6 relative z-10 animate-in fade-in-0 slide-in-from-top-4 duration-500 delay-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-in zoom-in-50 duration-600 delay-200">
                <svg className="w-7 h-7 text-white drop-shadow-sm transition-transform duration-300 hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent hover:from-[#5146E5] hover:to-[#7C3AED] transition-all duration-500">Catsy</h1>
            </div>
          </div>

          {/* Request New Workflow Button with enhanced animations */}
          {(profile?.permissions?.includes('create_workflow') || profile?.permissions?.includes('request_workflow')) && (
            <div className="px-6 mb-6 relative z-10 animate-in fade-in-0 slide-in-from-top-4 duration-500 delay-300">
              <button className="w-full bg-gradient-to-r from-[#5146E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-[1.03] hover:-translate-y-0.5 ring-1 ring-white/20 hover:ring-white/40 group">
                <svg className="w-5 h-5 drop-shadow-sm transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="drop-shadow-sm">Request New Workflow</span>
              </button>
            </div>
          )}

          {/* Navigation with staggered animations */}
          <nav className="flex-1 px-6 relative z-10">
            <ul className="space-y-2">
              {navigationItems.map((item, index) => (
                <li key={item.id} className={`animate-in fade-in-0 slide-in-from-left-4 duration-500`} style={{animationDelay: `${400 + index * 100}ms`}}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group relative overflow-hidden ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-[#5146E5] to-[#7C3AED] text-white shadow-lg ring-1 ring-white/20 transform scale-[1.02] animate-in zoom-in-95 duration-300'
                        : 'text-gray-700 hover:bg-white/40 hover:shadow-md hover:ring-1 hover:ring-white/30 hover:transform hover:scale-[1.01] hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Animated background for active state */}
                    {activeTab === item.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#5146E5]/20 to-[#7C3AED]/20 animate-pulse"></div>
                    )}
                    
                    <div className={`transition-all duration-300 relative z-10 ${
                      activeTab === item.id
                        ? 'drop-shadow-sm transform scale-110'
                        : 'group-hover:text-gray-800 group-hover:scale-110'
                    }`}>
                      {item.icon}
                    </div>
                    <span className={`font-medium transition-all duration-300 relative z-10 ${
                      activeTab === item.id
                        ? 'drop-shadow-sm'
                        : 'group-hover:text-gray-800'
                    }`}>
                      {item.name}
                    </span>
                    
                    {/* Hover effect indicator */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Profile with entrance animation */}
          <div className="p-6 border-t border-white/20 bg-white/20 backdrop-blur-sm relative z-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/30 hover:ring-white/50 transition-all duration-300 hover:shadow-xl hover:scale-110 animate-in zoom-in-50 duration-600 delay-800">
                <svg className="w-5 h-5 text-white drop-shadow-sm transition-transform duration-300 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate drop-shadow-sm hover:text-[#5146E5] transition-colors duration-300">
                  {user?.user_metadata?.first_name && user?.user_metadata?.last_name
                    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                    : user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-red-600 transition-all duration-300 hover:bg-red-50 p-1.5 rounded-lg hover:shadow-md hover:scale-110 group"
                title="Sign Out"
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            <div className="mt-3 text-center animate-in fade-in-0 duration-500 delay-1000">
              <p className="text-xs text-gray-500 font-medium hover:text-[#5146E5] transition-colors duration-300">Built by Nexen Labs</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {activeTab === 'dashboard' && (
              <>
                {/* Account Inactive Status Card */}
                {profile?.status === 0 && (
                  <div className="mb-8 bg-white rounded-xl shadow-sm border border-red-200 p-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Account Inactive</h3>
                      <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                        Your account is on hold or it&apos;s inactive, please contact your admin to reactivate your account.
                      </p>
                      <div className="mt-6 inline-flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-full">
                        <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-red-700">Status: Account Inactive</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Role Status Card */}
                {profile?.role === 'PENDING' && profile?.status !== 0 && (
                  <div className="mb-8 bg-white rounded-xl shadow-sm border border-amber-200 p-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
                        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Role Assignment Pending</h3>
                      <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                        Ping your admin to hook you up with a role — once that&apos;s done, you&apos;ll be all set to rock your responsibilities like a boss! 😎
                      </p>
                      <div className="mt-6 inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                        <svg className="w-4 h-4 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-amber-700">Status: Awaiting Admin Approval</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Welcome Section */}
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}!
                  </h2>
                  <p className="text-gray-600">
                    {user?.user_metadata?.organisation_name
                      ? `Managing ${user.user_metadata.organisation_name} - You are successfully authenticated and ready to explore.`
                      : 'You are successfully authenticated and ready to explore.'
                    }
                  </p>
                  {profile && (
                    <div className="text-sm text-gray-500 mt-1 space-y-1">
                      <p>
                        Role: <span className="font-medium capitalize">{profile.role}</span>
                      </p>
                      {profile.category && (
                        <p>
                          Category: <span className="font-medium capitalize">{profile.category}</span>
                        </p>
                      )}
                      {profile.permissions && profile.permissions.length > 0 && (
                        <p>
                          Permissions: <span className="font-medium">{profile.permissions.length} granted</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {profile?.role === 'PENDING' ? 'Pending' : (profile?.status === 1 ? 'Active' : 'Inactive')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-[#5146E5]/10 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Role</p>
                        <p className="text-2xl font-semibold text-gray-900 capitalize">
                          {profileLoading ? 'Loading...' : (profile?.role || 'User')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Member Since</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Category</p>
                        <p className="text-2xl font-semibold text-gray-900 capitalize">
                          {profileLoading ? 'Loading...' : (profile?.category || 'Not Set')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions Section */}
                {profile?.permissions && profile.permissions.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Permissions</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {profile.permissions.map((permission, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center px-3 py-2 rounded-lg bg-green-50 border border-green-200"
                          >
                            <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-green-800 capitalize">
                              {permission.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty Permissions State */}
                {profile?.permissions && profile.permissions.length === 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Permissions</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="text-gray-500">No permissions assigned to your role yet.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Team Management Section */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                {/* Team Management Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                      <p className="text-gray-600">
                        {profile?.category === 'PROVIDER'
                          ? 'Manage your internal and external team members'
                          : 'Manage your team members'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Provider and Client Categories - Two Sections (Vertical Layout) */}
                {(profile?.category === 'PROVIDER' || profile?.category === 'CLIENT') && (
                  <div className="space-y-8">
                    {/* Internal Team Management Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Team Management</h3>
                          <p className="text-gray-600">Manage your organization's employees</p>
                        </div>
                      </div>

                      {/* Internal Team Statistics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600 font-medium">Total Members</p>
                              <p className="text-2xl font-bold text-blue-900">{teamLoading ? '...' : stats.totalMembers}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-green-600 font-medium">Active Members</p>
                              <p className="text-2xl font-bold text-green-900">{teamLoading ? '...' : stats.activeMembers}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-orange-600 font-medium">Pending Members</p>
                              <p className="text-2xl font-bold text-orange-900">{teamLoading ? '...' : stats.pendingMembers}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-purple-600 font-medium">Roles</p>
                              <p className="text-2xl font-bold text-purple-900">{teamLoading ? '...' : stats.roles}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tab Navigation */}
                      <div className="mb-6">
                        <div className="border-b border-gray-200">
                          <nav className="-mb-px flex space-x-8">
                            <button
                              onClick={() => setInternalTeamTab('members')}
                              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                internalTeamTab === 'members'
                                  ? 'border-[#5146E5] text-[#5146E5]'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              Members
                            </button>
                            <button
                              onClick={() => setInternalTeamTab('roles')}
                              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                internalTeamTab === 'roles'
                                  ? 'border-[#5146E5] text-[#5146E5]'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              Roles and Responsibility
                            </button>
                          </nav>
                        </div>
                      </div>

                      {/* Tab Content */}
                      {internalTeamTab === 'members' && (
                        <div className="bg-white rounded-lg border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h4 className="text-lg font-semibold text-gray-900">Team Members</h4>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {teamLoading ? (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                      Loading team members...
                                    </td>
                                  </tr>
                                ) : teamMembers.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                      No team members found in your organization.
                                    </td>
                                  </tr>
                                ) : (
                                  teamMembers.map((member, index) => {
                                    const initials = member.full_name
                                      ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                                      : member.email.substring(0, 2).toUpperCase()
                                    
                                    const colors = [
                                      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
                                      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-gray-500'
                                    ]
                                    const avatarColor = colors[index % colors.length]
                                    
                                    const roleColors = {
                                      'PENDING': 'bg-yellow-100 text-yellow-800',
                                      'ADMIN': 'bg-red-100 text-red-800',
                                      'MANAGER': 'bg-blue-100 text-blue-800',
                                      'DEVELOPER': 'bg-green-100 text-green-800',
                                      'DESIGNER': 'bg-purple-100 text-purple-800',
                                      'default': 'bg-gray-100 text-gray-800'
                                    }
                                    
                                    const roleColor = roleColors[member.role?.toUpperCase() as keyof typeof roleColors] || roleColors.default
                                    
                                    return (
                                      <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-medium`}>
                                              {initials}
                                            </div>
                                            <div className="ml-4">
                                              <div className="text-sm font-medium text-gray-900">
                                                {member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown'}
                                              </div>
                                              <div className="text-sm text-gray-500">ID: {member.id.substring(0, 8)}</div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColor}`}>
                                            {member.role || 'No Role'}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            member.status === 1
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                              <circle cx="4" cy="4" r="3" />
                                            </svg>
                                            {member.status === 1 ? 'Active' : 'Inactive'}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(member.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={() => handleAssignRole(member)}
                                              className="text-blue-600 hover:text-blue-900 font-medium"
                                            >
                                              Assign Role
                                            </button>
                                            <button
                                              onClick={() => handleToggleStatus(member)}
                                              className={`font-medium ${
                                                member.status === 1
                                                  ? 'text-red-600 hover:text-red-900'
                                                  : 'text-green-600 hover:text-green-900'
                                              }`}
                                            >
                                              {member.status === 1 ? 'Deactivate' : 'Activate'}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}


                      {internalTeamTab === 'roles' && (
                        <div className="bg-white rounded-lg border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h4 className="text-lg font-semibold text-gray-900">Roles and Responsibilities</h4>
                          </div>
                          
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {/* Admin Role */}
                              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h5 className="text-xl font-semibold text-gray-900">Admin</h5>
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-4">Full access to all features and team management</p>
                                
                                <div className="mb-4">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-3">Permissions:</h6>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Manage all team members</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Access all workflows and analytics</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Request new workflows</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Manage generated files</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Configure account settings</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Billing and subscription management</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Editor Role */}
                              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h5 className="text-xl font-semibold text-gray-900">Editor</h5>
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-4">Can manage workflows and access most features</p>
                                
                                <div className="mb-4">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-3">Permissions:</h6>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Manage existing workflows</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Request new workflows</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Access workflow analytics</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Download generated files</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">View team information</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Analyst Role */}
                              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h5 className="text-xl font-semibold text-gray-900">Analyst</h5>
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-4">Read-only access to workflows and analytics</p>
                                
                                <div className="mb-4">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-3">Permissions:</h6>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">View all workflows</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Access analytics and reports</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">Download generated files</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm text-gray-700">View team information</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* External Team Management Section - Only for PROVIDER */}
                    {profile?.category === 'PROVIDER' && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Manage Admins</h3>
                          <p className="text-gray-600">Manage administrators from other organizations</p>
                        </div>
                      </div>

                      {/* External Team Statistics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-green-600 font-medium">Total Members</p>
                              <p className="text-2xl font-bold text-green-900">{externalTeamLoading ? '...' : externalStats.totalMembers}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-emerald-600 font-medium">Active Members</p>
                              <p className="text-2xl font-bold text-emerald-900">{externalTeamLoading ? '...' : externalStats.activeMembers}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-amber-600 font-medium">Pending Members</p>
                              <p className="text-2xl font-bold text-amber-900">{externalTeamLoading ? '...' : externalStats.pendingMembers}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-teal-600 font-medium">Companies</p>
                              <p className="text-2xl font-bold text-teal-900">{externalTeamLoading ? '...' : externalStats.companies}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* External Team Members Table */}
                      <div className="bg-white rounded-lg border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                          <h4 className="text-lg font-semibold text-gray-900">Admin Members</h4>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {externalTeamLoading ? (
                                <tr>
                                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    Loading external team members...
                                  </td>
                                </tr>
                              ) : externalTeamMembers.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    No external team members found.
                                  </td>
                                </tr>
                              ) : (
                                externalTeamMembers.map((member, index) => {
                                  const initials = member.full_name
                                    ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                                    : member.email.substring(0, 2).toUpperCase()
                                  
                                  const colors = [
                                    'bg-indigo-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500',
                                    'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-rose-500'
                                  ]
                                  const avatarColor = colors[index % colors.length]
                                  
                                  const roleColors = {
                                    'PENDING': 'bg-yellow-100 text-yellow-800',
                                    'ADMIN': 'bg-red-100 text-red-800',
                                    'MANAGER': 'bg-blue-100 text-blue-800',
                                    'DEVELOPER': 'bg-green-100 text-green-800',
                                    'DESIGNER': 'bg-purple-100 text-purple-800',
                                    'default': 'bg-gray-100 text-gray-800'
                                  }
                                  
                                  const roleColor = roleColors[member.role?.toUpperCase() as keyof typeof roleColors] || roleColors.default
                                  
                                  return (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-medium`}>
                                            {initials}
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                              {member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown'}
                                            </div>
                                            <div className="text-sm text-gray-500">ID: {member.id.substring(0, 8)}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.email}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {member.organization_id ? (
                                          <div>
                                            <div className="font-medium">{member.organization_name || 'Unknown Organization'}</div>
                                            <div className="text-xs text-gray-500">ID: {member.organization_id.substring(0, 8)}</div>
                                          </div>
                                        ) : (
                                          'No Organization'
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColor}`}>
                                          {member.role || 'No Role'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          member.status === 1
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                                            <circle cx="4" cy="4" r="3" />
                                          </svg>
                                          {member.status === 1 ? 'Active' : 'Inactive'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(member.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                          <button
                                            onClick={() => handleAssignRole(member)}
                                            className="text-blue-600 hover:text-blue-900 font-medium"
                                          >
                                            Assign Role
                                          </button>
                                          <button
                                            onClick={() => handleToggleStatus(member)}
                                            className={`font-medium ${
                                              member.status === 1
                                                ? 'text-red-600 hover:text-red-900'
                                                : 'text-green-600 hover:text-green-900'
                                            }`}
                                          >
                                            {member.status === 1 ? 'Deactivate' : 'Activate'}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback for other categories */}
              {profile?.category && profile.category !== 'PROVIDER' && profile.category !== 'CLIENT' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Management</h3>
                    <p className="text-gray-600">
                      Team management features are being configured for your category: {profile.category}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Settings Section */}
          {activeTab === 'account-settings' && (
            <div className="space-y-6">
              {/* Account Settings Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
                    <p className="text-gray-600">Manage your account information and preferences</p>
                  </div>
                </div>
              </div>

              {/* User Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* User Profile Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                      <p className="text-sm text-gray-500">Your account details</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Full Name</p>
                      <p className="text-gray-900">
                        {user?.user_metadata?.first_name && user?.user_metadata?.last_name
                          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                          : user?.email?.split('@')[0] || 'Not Set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email Address</p>
                      <p className="text-gray-900">{user?.email || 'Not Available'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Organization</p>
                      <p className="text-gray-900">
                        {user?.user_metadata?.organisation_name || 'Not Set'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role & Status Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Role & Status</h3>
                      <p className="text-sm text-gray-500">Your current permissions</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Role</p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          profile?.role === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {profileLoading ? 'Loading...' : (profile?.role || 'Not Assigned')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Account Status</p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                          profile?.status === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <svg className="w-2 h-2 mr-2" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          {profile?.status === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Category</p>
                      <p className="text-gray-900 capitalize">
                        {profileLoading ? 'Loading...' : (profile?.category || 'Not Set')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Details Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
                      <p className="text-sm text-gray-500">Membership information</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Member Since</p>
                      <p className="text-gray-900">
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Not Available'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Account ID</p>
                      <p className="text-gray-900 font-mono text-sm">
                        {user?.id ? user.id.substring(0, 8) + '...' : 'Not Available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Permissions</p>
                      <p className="text-gray-900">
                        {profile?.permissions ? `${profile.permissions.length} granted` : '0 granted'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Sign Out</h3>
                      <p className="text-sm text-gray-500">Securely log out of your account</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Other tab content placeholders */}
          {activeTab !== 'dashboard' && activeTab !== 'team' && activeTab !== 'account-settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 capitalize">
                  {activeTab.replace('-', ' ')}
                </h3>
                <p className="text-gray-600">
                  This section is coming soon. Content for {activeTab.replace('-', ' ')} will be implemented here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Assign Role Modal */}
      {showAssignRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assign Role</h3>
              <button
                onClick={() => setShowAssignRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {selectedMember && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Assigning role to: <span className="font-medium text-gray-900">{selectedMember.email}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Current role: <span className="font-medium">{selectedMember.role || 'No Role'}</span>
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5146E5] focus:border-transparent bg-white text-gray-900 opacity-100"
              >
                <option value="">Select a role...</option>
                {/* Check if the selected member is from external team (different organization) */}
                {selectedMember && selectedMember.organization_id !== profile?.organization_id ? (
                  // External team member roles
                  <>
                    <option value="ADMIN">ADMIN</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="EDITOR">EDITOR</option>
                  </>
                ) : (
                  // Internal team member roles - different roles based on user category
                  profile?.category === 'CLIENT' ? (
                    // CLIENT users can assign these roles to their internal team
                    <>
                      <option value="ADMIN">ADMIN</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="EDITOR">EDITOR</option>
                    </>
                  ) : (
                    // PROVIDER users can assign these roles to their internal team
                    <>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      <option value="APPROVER">APPROVER</option>
                      <option value="BUILDER">BUILDER</option>
                    </>
                  )
                )}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAssignRoleModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmAssignRole}
                disabled={!selectedRole}
                className="flex-1 px-4 py-2 bg-[#5146E5] hover:bg-[#4338CA] text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {actionType === 'activate' ? 'Activate' : 'Deactivate'} Account
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {selectedMember && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    actionType === 'activate' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {actionType === 'activate' ? (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedMember.email}</p>
                    <p className="text-sm text-gray-500">
                      Current status: {selectedMember.status === 1 ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  Are you sure you want to {actionType} this account?
                  {actionType === 'deactivate' && ' The user will lose access to the system.'}
                  {actionType === 'activate' && ' The user will regain access to the system.'}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleStatus}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors duration-200 ${
                  actionType === 'activate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionType === 'activate' ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
