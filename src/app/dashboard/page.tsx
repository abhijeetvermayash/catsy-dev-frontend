'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useExternalTeamMembers } from '@/hooks/useExternalTeamMembers'
import { useState, useEffect, useCallback } from 'react'
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
  const [workflowRequestsTab, setWorkflowRequestsTab] = useState('pending')
  
  // Member action states
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [actionType, setActionType] = useState<'activate' | 'deactivate'>('activate')

  // Workflow form states
  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [workflowFormData, setWorkflowFormData] = useState({
    workflowName: '',
    brandName: '',
    marketplaceChannels: [] as string[],
    dataSourceType: 'url' as 'url' | 'file',
    sourceSheetUrl: '',
    uploadedFile: null as File | null,
    templateSourceType: 'url' as 'url' | 'file',
    templateSheetUrl: '',
    uploadedTemplateFile: null as File | null,
    requirements: ''
  })

  // Workflows data states
  const [workflows, setWorkflows] = useState<any[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(true)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)
  const [workflowUsers, setWorkflowUsers] = useState<{[key: string]: any}>({})

  // Active workflows data states for Create Listings
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([])
  const [activeWorkflowsLoading, setActiveWorkflowsLoading] = useState(true)
  const [activeWorkflowsError, setActiveWorkflowsError] = useState<string | null>(null)
  const [activeWorkflowUsers, setActiveWorkflowUsers] = useState<{[key: string]: any}>({})

  // Workflow Requests data states
  const [workflowRequests, setWorkflowRequests] = useState<any[]>([])
  const [workflowRequestsLoading, setWorkflowRequestsLoading] = useState(true)
  const [workflowRequestsError, setWorkflowRequestsError] = useState<string | null>(null)
  const [workflowRequestUsers, setWorkflowRequestUsers] = useState<{[key: string]: any}>({})

  // Mark as done modal states
  const [showMarkAsDoneModal, setShowMarkAsDoneModal] = useState(false)
  const [selectedWorkflowForCompletion, setSelectedWorkflowForCompletion] = useState<any>(null)
  const [markAsDoneFormData, setMarkAsDoneFormData] = useState({
    webhookUrl: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })

  // Run workflow modal states
  const [showRunWorkflowModal, setShowRunWorkflowModal] = useState(false)
  const [selectedWorkflowForRun, setSelectedWorkflowForRun] = useState<any>(null)
  const [runWorkflowFormData, setRunWorkflowFormData] = useState({
    templateSourceType: 'url' as 'url' | 'file',
    templateUrl: '',
    templateFile: null as File | null
  })

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

  // Function to fetch workflows
  const fetchWorkflows = async () => {
    if (!user?.id || !profile?.organization_id) return
    
    try {
      setWorkflowsLoading(true)
      setWorkflowsError(null)
      
      const supabase = createClient()
      
      // Fetch workflows for the current user's organization
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('organisation_id', profile.organization_id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching workflows:', error)
        setWorkflowsError('Failed to load workflows')
        return
      }
      
      setWorkflows(data || [])
      
      // Fetch user details for all workflows
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(w => w.user_id).filter(Boolean))]
        
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email')
            .in('id', userIds)
          
          if (!usersError && usersData) {
            const usersMap = usersData.reduce((acc, user: any) => {
              acc[user.id] = user
              return acc
            }, {} as {[key: string]: any})
            setWorkflowUsers(usersMap)
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchWorkflows:', error)
      setWorkflowsError('An error occurred while loading workflows')
    } finally {
      setWorkflowsLoading(false)
    }
  }

  // Function to fetch active workflows for Create Listings
  const fetchActiveWorkflows = useCallback(async () => {
    if (!user?.id || !profile?.organization_id) {
      setActiveWorkflowsLoading(false)
      return
    }
    
    try {
      setActiveWorkflowsLoading(true)
      setActiveWorkflowsError(null)
      
      const supabase = createClient()
      
      console.log('Fetching active workflows for organization:', profile.organization_id)
      
      // Fetch only ACTIVE workflows for the current user's organization
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('organisation_id', profile.organization_id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching active workflows:', error)
        setActiveWorkflowsError('Failed to load active workflows')
        return
      }
      
      console.log('Active workflows fetched:', data?.length || 0)
      setActiveWorkflows(data || [])
      
      // Fetch user details for all active workflows
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(w => w.user_id).filter(Boolean))]
        
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email')
            .in('id', userIds)
          
          if (!usersError && usersData) {
            const usersMap = usersData.reduce((acc, user: any) => {
              acc[user.id] = user
              return acc
            }, {} as {[key: string]: any})
            setActiveWorkflowUsers(usersMap)
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchActiveWorkflows:', error)
      setActiveWorkflowsError('An error occurred while loading active workflows')
    } finally {
      setActiveWorkflowsLoading(false)
    }
  }, [user?.id, profile?.organization_id])

  // Fetch workflows when user and profile are available
  useEffect(() => {
    if (user && profile) {
      fetchWorkflows()
    }
  }, [user, profile])

  // Fetch workflow requests when switching to workflow-requests tab
  useEffect(() => {
    if (activeTab === 'workflow-requests' && user && profile) {
      if (workflowRequestsTab === 'pending') {
        fetchWorkflowRequests('UNDER PROCESS')
      } else {
        fetchWorkflowRequests()
      }
    }
  }, [activeTab, user, profile])

  // Fetch active workflows when switching to create-listings tab
  useEffect(() => {
    if (activeTab === 'create-listings' && user && profile) {
      fetchActiveWorkflows()
    }
  }, [activeTab, user, profile, fetchActiveWorkflows])

  // Function to fetch workflow requests
  const fetchWorkflowRequests = async (status?: string) => {
    if (!user?.id || !profile?.organization_id) return
    
    try {
      setWorkflowRequestsLoading(true)
      setWorkflowRequestsError(null)
      
      const supabase = createClient()
      
      // Build query for workflow requests
      let query = supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Add status filter if provided
      if (status === 'UNDER PROCESS') {
        query = query.eq('status', 'UNDER PROCESS')
      } else if (status === 'NOT_UNDER_PROCESS') {
        query = query.neq('status', 'UNDER PROCESS')
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching workflow requests:', error)
        setWorkflowRequestsError('Failed to load workflow requests')
        return
      }
      
      setWorkflowRequests(data || [])
      
      // Fetch user details for all workflow requests
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(w => w.user_id).filter(Boolean))]
        
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email')
            .in('id', userIds)
          
          if (!usersError && usersData) {
            const usersMap = usersData.reduce((acc, user: any) => {
              acc[user.id] = user
              return acc
            }, {} as {[key: string]: any})
            setWorkflowRequestUsers(usersMap)
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchWorkflowRequests:', error)
      setWorkflowRequestsError('An error occurred while loading workflow requests')
    } finally {
      setWorkflowRequestsLoading(false)
    }
  }

  // Handler for workflow requests tab change
  const handleWorkflowRequestsTabChange = (tab: string) => {
    setWorkflowRequestsTab(tab)
    if (tab === 'pending') {
      fetchWorkflowRequests('UNDER PROCESS')
    } else {
      fetchWorkflowRequests('NOT_UNDER_PROCESS')
    }
  }

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

  // Workflow form handlers
  const handleWorkflowFormChange = (field: string, value: string | string[] | File | null) => {
    setWorkflowFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setWorkflowFormData(prev => ({
      ...prev,
      uploadedFile: file
    }))
  }

  const handleTemplateFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setWorkflowFormData(prev => ({
      ...prev,
      uploadedTemplateFile: file
    }))
  }

  const handleMarketplaceToggle = (marketplace: string) => {
    setWorkflowFormData(prev => ({
      ...prev,
      marketplaceChannels: prev.marketplaceChannels.includes(marketplace)
        ? prev.marketplaceChannels.filter(m => m !== marketplace)
        : [...prev.marketplaceChannels, marketplace]
    }))
  }

  // Handler to show mark as done modal
  const handleMarkWorkflowAsDone = (workflow: any) => {
    setSelectedWorkflowForCompletion(workflow)
    setMarkAsDoneFormData({
      webhookUrl: '',
      status: 'ACTIVE'
    })
    setShowMarkAsDoneModal(true)
  }

  // Handler for mark as done form changes
  const handleMarkAsDoneFormChange = (field: string, value: string) => {
    setMarkAsDoneFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handler to confirm marking workflow as done
  const confirmMarkWorkflowAsDone = async () => {
    if (!selectedWorkflowForCompletion) return
    
    // Validate required fields
    if (!markAsDoneFormData.webhookUrl.trim()) {
      alert('Please enter a webhook URL.')
      return
    }
    
    try {
      const supabase = createClient()
      
      // Update workflow with webhook URL and status
      const { error } = await supabase
        .from('workflows')
        .update({
          webhook_url: markAsDoneFormData.webhookUrl.trim(),
          status: markAsDoneFormData.status
        })
        .eq('id', selectedWorkflowForCompletion.id)
      
      if (error) {
        console.error('Error marking workflow as done:', error)
        alert('Failed to mark workflow as done. Please try again.')
        return
      }
      
      // Close modal and reset state
      setShowMarkAsDoneModal(false)
      setSelectedWorkflowForCompletion(null)
      setMarkAsDoneFormData({
        webhookUrl: '',
        status: 'ACTIVE'
      })
      
      // Refresh the workflow requests data
      if (workflowRequestsTab === 'pending') {
        fetchWorkflowRequests('UNDER PROCESS')
      } else {
        fetchWorkflowRequests('NOT_UNDER_PROCESS')
      }
      
      // Show success message
      const actionText = selectedWorkflowForCompletion.status === 'UNDER PROCESS' ? 'marked as done' : 'updated'
      alert(`Workflow ${actionText} successfully!`)
      
    } catch (error) {
      console.error('Error in confirmMarkWorkflowAsDone:', error)
      alert('An error occurred while marking workflow as done. Please try again.')
    }
  }

  // Handler to show run workflow modal
  const handleRunWorkflow = (workflow: any) => {
    setSelectedWorkflowForRun(workflow)
    setRunWorkflowFormData({
      templateSourceType: 'url',
      templateUrl: '',
      templateFile: null
    })
    setShowRunWorkflowModal(true)
  }

  // Handler for run workflow form changes
  const handleRunWorkflowFormChange = (field: string, value: string | File | null) => {
    setRunWorkflowFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handler for template file upload in run workflow modal
  const handleRunTemplateFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setRunWorkflowFormData(prev => ({
      ...prev,
      templateFile: file
    }))
  }

  // Handler to confirm adding workflow to execution queue
  const confirmAddToExecutionQueue = async () => {
    if (!selectedWorkflowForRun || !user?.id || !profile?.organization_id) return
    
    // Validate required fields
    if (runWorkflowFormData.templateSourceType === 'url' && !runWorkflowFormData.templateUrl.trim()) {
      alert('Please enter a template URL.')
      return
    }
    
    if (runWorkflowFormData.templateSourceType === 'file' && !runWorkflowFormData.templateFile) {
      alert('Please upload a template file.')
      return
    }
    
    try {
      const supabase = createClient()
      
      // Show loading state
      const submitButton = document.querySelector('[data-execution-queue-button]') as HTMLButtonElement
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = 'Adding to Queue...'
      }
      
      let templateFileUrl = runWorkflowFormData.templateUrl
      
      // Upload file to Supabase storage if user chose file upload
      if (runWorkflowFormData.templateSourceType === 'file' && runWorkflowFormData.templateFile) {
        console.log('Uploading template file to Supabase storage...')
        
        const uploadedUrl = await uploadFileToSupabase(
          runWorkflowFormData.templateFile,
          'workflow-files',
          'template-files'
        )
        
        if (!uploadedUrl) {
          alert('Failed to upload template file. Please try again.')
          return
        }
        
        templateFileUrl = uploadedUrl
        console.log('Template file uploaded successfully:', uploadedUrl)
      }
      
      // Create entry in workflow_execute table
      const workflowExecuteData = {
        workflow_id: selectedWorkflowForRun.id,
        template_file: templateFileUrl,
        executed_by: user.id,
        generated_files: [], // Empty array initially
        organisation_id: profile.organization_id,
        webhook_url: selectedWorkflowForRun.webhook_url
      }
      
      console.log('Creating workflow execution entry:', workflowExecuteData)
      
      const { data, error } = await supabase
        .from('workflow_execute')
        .insert([workflowExecuteData])
        .select()
      
      if (error) {
        console.error('Error creating workflow execution entry:', error)
        alert('Failed to add workflow to execution queue. Please try again.')
        return
      }
      
      console.log('Workflow execution entry created successfully:', data)
      
      // Close modal and reset state
      setShowRunWorkflowModal(false)
      setSelectedWorkflowForRun(null)
      setRunWorkflowFormData({
        templateSourceType: 'url',
        templateUrl: '',
        templateFile: null
      })
      
      // Show success message
      alert(`Workflow "${selectedWorkflowForRun.workflow_name || 'Unnamed Workflow'}" has been added to the execution queue successfully!`)
      
    } catch (error) {
      console.error('Error adding to execution queue:', error)
      alert('An error occurred while adding to execution queue. Please try again.')
    } finally {
      // Reset button state
      const submitButton = document.querySelector('[data-execution-queue-button]') as HTMLButtonElement
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = 'Add To Execution Queue'
      }
    }
  }

  // File upload utility function
  const uploadFileToSupabase = async (file: File, bucket: string, path: string): Promise<string | null> => {
    try {
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !currentUser) {
        console.error('Authentication error:', authError)
        throw new Error('User not authenticated')
      }
      
      console.log('Upload attempt:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        bucket,
        path,
        userId: currentUser.id
      })
      
      // Generate unique filename with user ID for better organization
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${path}/${currentUser.id}/${fileName}`
      
      console.log('Uploading to path:', filePath)
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Storage upload error:', error)
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          cause: error.cause
        })
        throw error
      }
      
      console.log('Upload successful:', data)
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)
      
      console.log('Public URL generated:', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('Error in uploadFileToSupabase:', error)
      return null
    }
  }

  // Handle workflow form submission
  const handleSubmitWorkflow = async () => {
    try {
      const supabase = createClient()
      
      // Show loading state
      const submitButton = document.querySelector('[data-submit-button]') as HTMLButtonElement
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = 'Submitting...'
      }
      
      // Prepare workflow data
      let sourceFileUrl = workflowFormData.sourceSheetUrl
      let templateFileUrl = workflowFormData.templateSheetUrl
      
      // Upload source file if user chose file upload
      if (workflowFormData.dataSourceType === 'file' && workflowFormData.uploadedFile) {
        console.log('Uploading source file...')
        const uploadedSourceUrl = await uploadFileToSupabase(
          workflowFormData.uploadedFile,
          'workflow-files',
          'source-files'
        )
        
        if (!uploadedSourceUrl) {
          alert('Failed to upload source file. Please try again.')
          return
        }
        sourceFileUrl = uploadedSourceUrl
      }
      
      // Upload template file if user chose file upload
      if (workflowFormData.templateSourceType === 'file' && workflowFormData.uploadedTemplateFile) {
        console.log('Uploading template file...')
        const uploadedTemplateUrl = await uploadFileToSupabase(
          workflowFormData.uploadedTemplateFile,
          'workflow-files',
          'template-files'
        )
        
        if (!uploadedTemplateUrl) {
          alert('Failed to upload template file. Please try again.')
          return
        }
        templateFileUrl = uploadedTemplateUrl
      }
      
      // Prepare workflow data for database insertion
      const workflowData = {
        user_id: user?.id,
        organisation_id: profile?.organization_id,
        workflow_name: workflowFormData.workflowName,
        brand_name: workflowFormData.brandName,
        marketplace_channels: workflowFormData.marketplaceChannels,
        data_source_type: workflowFormData.dataSourceType,
        source_file_url: sourceFileUrl,
        template_source_type: workflowFormData.templateSourceType,
        template_file_url: templateFileUrl,
        requirements: workflowFormData.requirements,
        status: 'UNDER PROCESS',
        created_at: new Date().toISOString()
      }
      
      // Insert workflow data into database
      const { data, error } = await supabase
        .from('workflows')
        .insert([workflowData])
        .select()
      
      if (error) {
        console.error('Error inserting workflow:', error)
        alert('Failed to submit workflow. Please try again.')
        return
      }
      
      console.log('Workflow submitted successfully:', data)
      
      // Reset form and close modal
      resetWorkflowForm()
      
      // Refresh workflows list
      fetchWorkflows()
      
    } catch (error) {
      console.error('Error submitting workflow:', error)
      alert('An error occurred while submitting the workflow. Please try again.')
    } finally {
      // Reset button state
      const submitButton = document.querySelector('[data-submit-button]') as HTMLButtonElement
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = 'Submit Request'
      }
    }
  }

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === 4) {
      // Submit the form
      handleSubmitWorkflow()
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const resetWorkflowForm = () => {
    setShowWorkflowForm(false)
    setCurrentStep(1)
    setWorkflowFormData({
      workflowName: '',
      brandName: '',
      marketplaceChannels: [],
      dataSourceType: 'url',
      sourceSheetUrl: '',
      uploadedFile: null,
      templateSourceType: 'url',
      templateSheetUrl: '',
      uploadedTemplateFile: null,
      requirements: ''
    })
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

    // Create Listings - Show for users with ADD_TRIGGER_LISTING permission
    if (permissions.includes('ADD_TRIGGER_LISTING')) {
      items.push({
        id: 'create-listings',
        name: 'Create Listings',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        permission: 'ADD_TRIGGER_LISTING'
      })
    }

    // Workflows - Show for users with ADD_WORKFLOW_RAW_DATA permission
    if (permissions.includes('ADD_WORKFLOW_RAW_DATA')) {
      items.push({
        id: 'workflows',
        name: 'Workflows',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        permission: 'ADD_WORKFLOW_RAW_DATA'
      })
    }

    // Workflow Requests - Show for users with BUILD_WORKFLOW permission
    if (permissions.includes('BUILD_WORKFLOW')) {
      items.push({
        id: 'workflow-requests',
        name: 'Workflow Requests',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
        permission: 'BUILD_WORKFLOW'
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

          {/* Workflows Section */}
          {activeTab === 'workflows' && (
            <div className="space-y-6">
              {/* Workflows Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Workflows</h2>
                      <p className="text-gray-600">Manage and create your workflow processes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWorkflowForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-[#5146E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Request New Workflow</span>
                  </button>
                </div>
              </div>

              {/* Workflows Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Your Workflows</h3>
                    <div className="text-sm text-gray-500">
                      {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} found
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marketplaces</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {workflowsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                              <span>Loading workflows...</span>
                            </div>
                          </td>
                        </tr>
                      ) : workflowsError ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span>{workflowsError}</span>
                            </div>
                          </td>
                        </tr>
                      ) : workflows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 font-medium">No workflows found</p>
                                <p className="text-sm text-gray-400 mt-1">Create your first workflow to get started</p>
                              </div>
                              <button
                                onClick={() => setShowWorkflowForm(true)}
                                className="px-4 py-2 bg-[#5146E5] hover:bg-[#4338CA] text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Create Workflow</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        workflows.map((workflow, index) => {
                          const statusColors = {
                            'ACTIVE': 'bg-green-100 text-green-800',
                            'INACTIVE': 'bg-gray-100 text-gray-800',
                            'UNDER PROCESS': 'bg-yellow-100 text-yellow-800'
                          }
                          
                          const statusColor = statusColors[workflow.status as keyof typeof statusColors] || statusColors['UNDER PROCESS']
                          
                          return (
                            <tr key={workflow.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                    {workflow.workflow_name ? workflow.workflow_name.substring(0, 2).toUpperCase() : 'WF'}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{workflow.workflow_name || 'Unnamed Workflow'}</div>
                                    <div className="text-sm text-gray-500">ID: {workflow.id.substring(0, 8)}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{workflow.brand_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {workflow.user_id && workflowUsers[workflow.user_id] ? (
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                      {workflowUsers[workflow.user_id].full_name
                                        ? workflowUsers[workflow.user_id].full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                        : workflowUsers[workflow.user_id].first_name && workflowUsers[workflow.user_id].last_name
                                        ? `${workflowUsers[workflow.user_id].first_name[0]}${workflowUsers[workflow.user_id].last_name[0]}`.toUpperCase()
                                        : workflowUsers[workflow.user_id].email.substring(0, 2).toUpperCase()
                                      }
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {workflowUsers[workflow.user_id].full_name ||
                                         (workflowUsers[workflow.user_id].first_name && workflowUsers[workflow.user_id].last_name
                                           ? `${workflowUsers[workflow.user_id].first_name} ${workflowUsers[workflow.user_id].last_name}`
                                           : 'Unknown User')}
                                      </div>
                                      <div className="text-xs text-gray-500">{workflowUsers[workflow.user_id].email}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                      ?
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">Unknown User</div>
                                      <div className="text-xs text-gray-500">
                                        {workflow.user_id ? `ID: ${workflow.user_id.substring(0, 8)}` : 'No user ID'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                  {workflow.marketplace_channels.slice(0, 2).map((channel: string) => (
                                    <span key={channel} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      {channel}
                                    </span>
                                  ))}
                                  {workflow.marketplace_channels.length > 2 && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                      +{workflow.marketplace_channels.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                  {workflow.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(workflow.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
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

          {/* Workflow Requests Section */}
          {activeTab === 'workflow-requests' && (
            <div className="space-y-6">
              {/* Workflow Requests Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Workflow Requests</h2>
                    <p className="text-gray-600">Build and manage workflow processes</p>
                  </div>
                </div>
              </div>

              {/* Workflow Requests Content */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Tab Navigation */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="border-b border-gray-200">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => handleWorkflowRequestsTabChange('pending')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            workflowRequestsTab === 'pending'
                              ? 'border-[#5146E5] text-[#5146E5]'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Pending Workflows
                        </button>
                        <button
                          onClick={() => handleWorkflowRequestsTabChange('all')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                            workflowRequestsTab === 'all'
                              ? 'border-[#5146E5] text-[#5146E5]'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          All Workflows
                        </button>
                      </nav>
                    </div>
                    <div className="text-sm text-gray-500">
                      {workflowRequestsTab === 'pending'
                        ? `${workflowRequests.length} pending workflow${workflowRequests.length !== 1 ? 's' : ''}`
                        : `${workflowRequests.length} total workflow${workflowRequests.length !== 1 ? 's' : ''}`
                      }
                    </div>
                  </div>
                </div>
                
                {/* Workflows Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marketplaces</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {workflowRequestsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                              <span>Loading workflow requests...</span>
                            </div>
                          </td>
                        </tr>
                      ) : workflowRequestsError ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span>{workflowRequestsError}</span>
                            </div>
                          </td>
                        </tr>
                      ) : workflowRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 font-medium">
                                  {workflowRequestsTab === 'pending' ? 'No pending workflows found' : 'No workflow requests found'}
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                  {workflowRequestsTab === 'pending'
                                    ? 'All workflows have been processed'
                                    : 'No workflow requests have been created yet'
                                  }
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        workflowRequests.map((workflow, index) => {
                          const statusColors = {
                            'ACTIVE': 'bg-green-100 text-green-800',
                            'INACTIVE': 'bg-gray-100 text-gray-800',
                            'UNDER PROCESS': 'bg-yellow-100 text-yellow-800'
                          }
                          
                          const statusColor = statusColors[workflow.status as keyof typeof statusColors] || statusColors['UNDER PROCESS']
                          
                          return (
                            <tr key={workflow.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                    {workflow.workflow_name ? workflow.workflow_name.substring(0, 2).toUpperCase() : 'WF'}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{workflow.workflow_name || 'Unnamed Workflow'}</div>
                                    <div className="text-sm text-gray-500">ID: {workflow.id.substring(0, 8)}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{workflow.brand_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {workflow.user_id && workflowRequestUsers[workflow.user_id] ? (
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                      {workflowRequestUsers[workflow.user_id].full_name
                                        ? workflowRequestUsers[workflow.user_id].full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                        : workflowRequestUsers[workflow.user_id].first_name && workflowRequestUsers[workflow.user_id].last_name
                                        ? `${workflowRequestUsers[workflow.user_id].first_name[0]}${workflowRequestUsers[workflow.user_id].last_name[0]}`.toUpperCase()
                                        : workflowRequestUsers[workflow.user_id].email.substring(0, 2).toUpperCase()
                                      }
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {workflowRequestUsers[workflow.user_id].full_name ||
                                         (workflowRequestUsers[workflow.user_id].first_name && workflowRequestUsers[workflow.user_id].last_name
                                           ? `${workflowRequestUsers[workflow.user_id].first_name} ${workflowRequestUsers[workflow.user_id].last_name}`
                                           : 'Unknown User')}
                                      </div>
                                      <div className="text-xs text-gray-500">{workflowRequestUsers[workflow.user_id].email}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                      ?
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">Unknown User</div>
                                      <div className="text-xs text-gray-500">
                                        {workflow.user_id ? `ID: ${workflow.user_id.substring(0, 8)}` : 'No user ID'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                  {workflow.marketplace_channels.slice(0, 2).map((channel: string) => (
                                    <span key={channel} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      {channel}
                                    </span>
                                  ))}
                                  {workflow.marketplace_channels.length > 2 && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                      +{workflow.marketplace_channels.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                  {workflow.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(workflow.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  {workflowRequestsTab === 'pending' && workflow.status === 'UNDER PROCESS' && (
                                    <button
                                      onClick={() => handleMarkWorkflowAsDone(workflow)}
                                      className="text-green-600 hover:text-green-900 font-medium transition-colors duration-200 hover:bg-green-50 px-2 py-1 rounded"
                                    >
                                      Mark as Done
                                    </button>
                                  )}
                                  {workflowRequestsTab === 'all' && workflow.status !== 'UNDER PROCESS' && (
                                    <button
                                      onClick={() => handleMarkWorkflowAsDone(workflow)}
                                      className="text-orange-600 hover:text-orange-900 font-medium transition-colors duration-200 hover:bg-orange-50 px-2 py-1 rounded"
                                    >
                                      Update
                                    </button>
                                  )}
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

          {/* Create Listings Section */}
          {activeTab === 'create-listings' && (
            <div className="space-y-6">
              {/* Create Listings Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create Listings</h2>
                    <p className="text-gray-600">Create and manage your product listings across marketplaces</p>
                  </div>
                </div>
              </div>

              {/* Workflows Table for Create Listings */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Active Workflows</h3>
                    <div className="text-sm text-gray-500">
                      {activeWorkflows.length} active workflow{activeWorkflows.length !== 1 ? 's' : ''} available
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marketplaces</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeWorkflowsLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                              <span>Loading active workflows...</span>
                            </div>
                          </td>
                        </tr>
                      ) : activeWorkflowsError ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-red-500">
                            <div className="flex items-center justify-center space-x-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span>{activeWorkflowsError}</span>
                            </div>
                          </td>
                        </tr>
                      ) : activeWorkflows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 font-medium">No active workflows found</p>
                                <p className="text-sm text-gray-400 mt-1">No active workflows available for creating listings</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        activeWorkflows.map((workflow, index) => {
                          const statusColors = {
                            'ACTIVE': 'bg-green-100 text-green-800',
                            'INACTIVE': 'bg-gray-100 text-gray-800',
                            'UNDER PROCESS': 'bg-yellow-100 text-yellow-800'
                          }
                          
                          const statusColor = statusColors[workflow.status as keyof typeof statusColors] || statusColors['UNDER PROCESS']
                          
                          return (
                            <tr key={workflow.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                    {workflow.workflow_name ? workflow.workflow_name.substring(0, 2).toUpperCase() : 'WF'}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{workflow.workflow_name || 'Unnamed Workflow'}</div>
                                    <div className="text-sm text-gray-500">ID: {workflow.id.substring(0, 8)}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{workflow.brand_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {workflow.user_id && activeWorkflowUsers[workflow.user_id] ? (
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                      {activeWorkflowUsers[workflow.user_id].full_name
                                        ? activeWorkflowUsers[workflow.user_id].full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                        : activeWorkflowUsers[workflow.user_id].first_name && activeWorkflowUsers[workflow.user_id].last_name
                                        ? `${activeWorkflowUsers[workflow.user_id].first_name[0]}${activeWorkflowUsers[workflow.user_id].last_name[0]}`.toUpperCase()
                                        : activeWorkflowUsers[workflow.user_id].email.substring(0, 2).toUpperCase()
                                      }
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {activeWorkflowUsers[workflow.user_id].full_name ||
                                         (activeWorkflowUsers[workflow.user_id].first_name && activeWorkflowUsers[workflow.user_id].last_name
                                           ? `${activeWorkflowUsers[workflow.user_id].first_name} ${activeWorkflowUsers[workflow.user_id].last_name}`
                                           : 'Unknown User')}
                                      </div>
                                      <div className="text-xs text-gray-500">{activeWorkflowUsers[workflow.user_id].email}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                      ?
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">Unknown User</div>
                                      <div className="text-xs text-gray-500">
                                        {workflow.user_id ? `ID: ${workflow.user_id.substring(0, 8)}` : 'No user ID'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                  {workflow.marketplace_channels.slice(0, 2).map((channel: string) => (
                                    <span key={channel} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      {channel}
                                    </span>
                                  ))}
                                  {workflow.marketplace_channels.length > 2 && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                      +{workflow.marketplace_channels.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                  {workflow.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(workflow.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleRunWorkflow(workflow)}
                                    className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                    Add To Queue
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

          {/* Other tab content placeholders */}
          {activeTab !== 'dashboard' && activeTab !== 'team' && activeTab !== 'account-settings' && activeTab !== 'workflows' && activeTab !== 'workflow-requests' && activeTab !== 'create-listings' && (
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

      {/* Enhanced Assign Role Modal */}
      {showAssignRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative p-6 rounded-t-2xl text-white bg-gradient-to-r from-blue-500 to-indigo-600">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">Assign Role</h3>
                    <p className="text-white/80 text-sm">Update member permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignRoleModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedMember && (
                <>
                  {/* Member Profile Card */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                        {selectedMember.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">Member:</span>
                          <span className="font-semibold text-gray-900">{selectedMember.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">Current Role:</span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedMember.role === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : selectedMember.role
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedMember.role || 'No Role'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-800">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Select New Role</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    
                    <div className="space-y-3">
                      {/* Role Options */}
                      {selectedMember && selectedMember.organization_id !== profile?.organization_id ? (
                        // External team member roles
                        <>
                          {['ADMIN', 'ANALYST', 'EDITOR'].map((role) => (
                            <label
                              key={role}
                              className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                selectedRole === role
                                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                                  : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="role"
                                value={role}
                                checked={selectedRole === role}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                                selectedRole === role
                                  ? 'border-blue-500 bg-blue-500 shadow-md'
                                  : 'border-gray-300 group-hover:border-gray-400'
                              }`}>
                                {selectedRole === role && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-base font-semibold text-gray-800">{role}</span>
                                  {selectedRole === role && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {role === 'ADMIN' && 'Full access to manage organization and workflows'}
                                  {role === 'ANALYST' && 'Read-only access to workflows and analytics'}
                                  {role === 'EDITOR' && 'Can manage workflows and access most features'}
                                </p>
                              </div>
                            </label>
                          ))}
                        </>
                      ) : (
                        // Internal team member roles - different roles based on user category
                        profile?.category === 'CLIENT' ? (
                          // CLIENT users can assign these roles to their internal team
                          <>
                            {['ADMIN', 'ANALYST', 'EDITOR'].map((role) => (
                              <label
                                key={role}
                                className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                  selectedRole === role
                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="role"
                                  value={role}
                                  checked={selectedRole === role}
                                  onChange={(e) => setSelectedRole(e.target.value)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                                  selectedRole === role
                                    ? 'border-blue-500 bg-blue-500 shadow-md'
                                    : 'border-gray-300 group-hover:border-gray-400'
                                }`}>
                                  {selectedRole === role && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-base font-semibold text-gray-800">{role}</span>
                                    {selectedRole === role && (
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {role === 'ADMIN' && 'Full access to manage organization and workflows'}
                                    {role === 'ANALYST' && 'Read-only access to workflows and analytics'}
                                    {role === 'EDITOR' && 'Can manage workflows and access most features'}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </>
                        ) : (
                          // PROVIDER users can assign these roles to their internal team
                          <>
                            {['SUPER_ADMIN', 'APPROVER', 'BUILDER'].map((role) => (
                              <label
                                key={role}
                                className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                  selectedRole === role
                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="role"
                                  value={role}
                                  checked={selectedRole === role}
                                  onChange={(e) => setSelectedRole(e.target.value)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                                  selectedRole === role
                                    ? 'border-blue-500 bg-blue-500 shadow-md'
                                    : 'border-gray-300 group-hover:border-gray-400'
                                }`}>
                                  {selectedRole === role && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-base font-semibold text-gray-800">{role}</span>
                                    {selectedRole === role && (
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {role === 'SUPER_ADMIN' && 'Ultimate access to all system features and management'}
                                    {role === 'APPROVER' && 'Can review and approve workflows and team actions'}
                                    {role === 'BUILDER' && 'Can create and modify workflows and system configurations'}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </>
                        )
                      )}
                    </div>
                  </div>

                  {/* Confirmation Section */}
                  {selectedRole && (
                    <div className="rounded-xl p-4 border-l-4 bg-blue-50 border-blue-400 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Ready to Assign Role</p>
                          <p className="text-sm text-blue-700 mt-1">
                            {selectedMember.email} will be assigned the <strong>{selectedRole}</strong> role with corresponding permissions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowAssignRoleModal(false)}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmAssignRole}
                disabled={!selectedRole}
                className="px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Assign Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Status Toggle Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`relative p-6 rounded-t-2xl text-white ${
              actionType === 'activate'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}>
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    {actionType === 'activate' ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">
                      {actionType === 'activate' ? 'Activate Account' : 'Deactivate Account'}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {actionType === 'activate' ? 'Grant system access' : 'Revoke system access'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedMember && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                        {selectedMember.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">Member:</span>
                          <span className="font-semibold text-gray-900">{selectedMember.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">Current Status:</span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedMember.status === 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            {selectedMember.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 border-l-4 ${
                    actionType === 'activate'
                      ? 'bg-green-50 border-green-400'
                      : 'bg-red-50 border-red-400'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        actionType === 'activate' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {actionType === 'activate' ? (
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${
                          actionType === 'activate' ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {actionType === 'activate' ? 'Confirm Account Activation' : 'Confirm Account Deactivation'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          actionType === 'activate' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {actionType === 'activate'
                            ? 'This user will regain full access to the system and all associated features.'
                            : 'This user will lose access to the system and will not be able to log in or perform any actions.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleStatus}
                className={`px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 ${
                  actionType === 'activate'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                }`}
              >
                {actionType === 'activate' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                <span>{actionType === 'activate' ? 'Activate Account' : 'Deactivate Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request New Workflow Modal */}
      {showWorkflowForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-[#5146E5] to-[#7C3AED] p-8 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white drop-shadow-sm">Request New Workflow</h3>
                    <p className="text-white/80 text-sm mt-1">Step {currentStep} of 4 - Let's create something amazing</p>
                  </div>
                </div>
                <button
                  onClick={resetWorkflowForm}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="px-8 py-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[
                  { step: 1, title: 'Basic Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { step: 2, title: 'Data Source', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { step: 3, title: 'Upload Templates', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
                  { step: 4, title: 'Describe Requirements', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' }
                ].map((item, index) => (
                  <div key={item.step} className="flex flex-col items-center relative">
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      item.step <= currentStep
                        ? 'bg-gradient-to-br from-[#5146E5] to-[#7C3AED] text-white shadow-lg scale-110'
                        : item.step === currentStep + 1
                        ? 'bg-gradient-to-br from-blue-100 to-purple-100 text-[#5146E5] border-2 border-[#5146E5]/30'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {item.step <= currentStep ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                      )}
                      {item.step === currentStep && (
                        <div className="absolute -inset-1 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-full animate-pulse opacity-30"></div>
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium transition-colors duration-200 ${
                      item.step <= currentStep
                        ? 'text-[#5146E5]'
                        : 'text-gray-500'
                    }`}>
                      {item.title}
                    </span>
                    {index < 3 && (
                      <div className={`absolute top-6 left-1/2 w-24 h-0.5 -translate-y-1/2 transition-colors duration-300 ${
                        item.step < currentStep ? 'bg-gradient-to-r from-[#5146E5] to-[#7C3AED]' : 'bg-gray-200'
                      }`} style={{ marginLeft: '24px', zIndex: -1 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8 overflow-y-auto max-h-[60vh]">
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h4>
                    <p className="text-gray-600 max-w-md mx-auto">Let's start with the essentials. Tell us about your brand and where you want to sell.</p>
                  </div>

                  {/* Workflow Name Field */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Workflow Name</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={workflowFormData.workflowName}
                      onChange={(e) => handleWorkflowFormChange('workflowName', e.target.value)}
                      placeholder="Enter a descriptive name for this workflow (e.g., Nike Summer Collection 2024)"
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium text-lg shadow-sm hover:shadow-md"
                    />
                  </div>

                  {/* Brand Name Field */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>Brand Name</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={workflowFormData.brandName}
                      onChange={(e) => handleWorkflowFormChange('brandName', e.target.value)}
                      placeholder="Enter your brand name (e.g., Nike, Apple, etc.)"
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium text-lg shadow-sm hover:shadow-md"
                    />
                  </div>

                  {/* Marketplace Channels Field */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Marketplace Channels</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <p className="text-sm text-gray-600 mb-6">Choose where you want to showcase your products. You can select multiple platforms.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: 'AMAZON', icon: '🛒', color: 'from-orange-400 to-yellow-500' },
                        { name: 'FLIPKART', icon: '🛍️', color: 'from-blue-400 to-blue-600' },
                        { name: 'MYNTRA', icon: '👗', color: 'from-pink-400 to-red-500' },
                        { name: 'MEESHO', icon: '📱', color: 'from-green-400 to-emerald-500' },
                        { name: 'SHOPIFY', icon: '🏪', color: 'from-purple-400 to-indigo-500' }
                      ].map((marketplace) => (
                        <label
                          key={marketplace.name}
                          className={`group relative flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                            workflowFormData.marketplaceChannels.includes(marketplace.name)
                              ? 'border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={workflowFormData.marketplaceChannels.includes(marketplace.name)}
                            onChange={() => handleMarketplaceToggle(marketplace.name)}
                            className="sr-only"
                          />
                          <div className={`w-6 h-6 rounded-lg border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                            workflowFormData.marketplaceChannels.includes(marketplace.name)
                              ? 'border-[#5146E5] bg-[#5146E5] shadow-md'
                              : 'border-gray-300 group-hover:border-gray-400'
                          }`}>
                            {workflowFormData.marketplaceChannels.includes(marketplace.name) && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{marketplace.icon}</span>
                            <span className="text-base font-semibold text-gray-800">{marketplace.name}</span>
                          </div>
                          {workflowFormData.marketplaceChannels.includes(marketplace.name) && (
                            <div className="absolute top-2 right-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Data Source */}
              {currentStep === 2 && (
                <div className="space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Data Source</h4>
                    <p className="text-gray-600 max-w-md mx-auto">Connect your product data by providing a spreadsheet URL or uploading a file.</p>
                  </div>

                  {/* Data Source Type Selection */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-4">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Choose Data Source Type</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label
                        className={`group relative flex items-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          workflowFormData.dataSourceType === 'url'
                            ? 'border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="dataSourceType"
                          value="url"
                          checked={workflowFormData.dataSourceType === 'url'}
                          onChange={(e) => handleWorkflowFormChange('dataSourceType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                          workflowFormData.dataSourceType === 'url'
                            ? 'border-[#5146E5] bg-[#5146E5] shadow-md'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {workflowFormData.dataSourceType === 'url' && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-base font-semibold text-gray-800">Sheet URL</span>
                            <p className="text-sm text-gray-600">Connect via Google Sheets or Excel Online</p>
                          </div>
                        </div>
                        {workflowFormData.dataSourceType === 'url' && (
                          <div className="absolute top-3 right-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>

                      <label
                        className={`group relative flex items-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          workflowFormData.dataSourceType === 'file'
                            ? 'border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="dataSourceType"
                          value="file"
                          checked={workflowFormData.dataSourceType === 'file'}
                          onChange={(e) => handleWorkflowFormChange('dataSourceType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                          workflowFormData.dataSourceType === 'file'
                            ? 'border-[#5146E5] bg-[#5146E5] shadow-md'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {workflowFormData.dataSourceType === 'file' && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-base font-semibold text-gray-800">Upload File</span>
                            <p className="text-sm text-gray-600">Upload Excel, CSV, or JSON files</p>
                          </div>
                        </div>
                        {workflowFormData.dataSourceType === 'file' && (
                          <div className="absolute top-3 right-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* URL Input */}
                  {workflowFormData.dataSourceType === 'url' && (
                    <div className="bg-gray-50 rounded-xl p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>Source Sheet URL</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <input
                          type="url"
                          value={workflowFormData.sourceSheetUrl}
                          onChange={(e) => handleWorkflowFormChange('sourceSheetUrl', e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium shadow-sm hover:shadow-md"
                        />
                      </div>
                      <p className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        💡 <strong>Tip:</strong> Make sure your spreadsheet is publicly accessible or shared with appropriate permissions.
                      </p>
                    </div>
                  )}

                  {/* File Upload */}
                  {workflowFormData.dataSourceType === 'file' && (
                    <div className="bg-gray-50 rounded-xl p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Upload Data File</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:border-[#5146E5] hover:bg-[#5146E5]/5 transition-all duration-300 group">
                        <div className="space-y-2 text-center">
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div className="flex text-base text-gray-700">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-lg px-4 py-2 font-semibold text-[#5146E5] hover:text-[#4338CA] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#5146E5] shadow-sm hover:shadow-md transition-all duration-200">
                              <span>Choose a file</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="sr-only"
                                accept=".xlsx,.xls,.csv,.json"
                                onChange={handleFileUpload}
                              />
                            </label>
                            <p className="pl-2 self-center">or drag and drop</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            Excel (.xlsx, .xls), CSV, or JSON files up to 10MB
                          </p>
                          {workflowFormData.uploadedFile && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-center space-x-3 text-green-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">{workflowFormData.uploadedFile.name}</span>
                                <span className="text-sm">({(workflowFormData.uploadedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Upload Templates */}
              {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Upload Templates</h4>
                    <p className="text-gray-600 max-w-md mx-auto">Provide your template files to customize the output format and structure.</p>
                  </div>

                  {/* Template Source Type Selection */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-4">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Choose Template Source Type</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label
                        className={`group relative flex items-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          workflowFormData.templateSourceType === 'url'
                            ? 'border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="templateSourceType"
                          value="url"
                          checked={workflowFormData.templateSourceType === 'url'}
                          onChange={(e) => handleWorkflowFormChange('templateSourceType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                          workflowFormData.templateSourceType === 'url'
                            ? 'border-[#5146E5] bg-[#5146E5] shadow-md'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {workflowFormData.templateSourceType === 'url' && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-base font-semibold text-gray-800">Template URL</span>
                            <p className="text-sm text-gray-600">Connect via Google Sheets or Excel Online</p>
                          </div>
                        </div>
                        {workflowFormData.templateSourceType === 'url' && (
                          <div className="absolute top-3 right-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>

                      <label
                        className={`group relative flex items-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          workflowFormData.templateSourceType === 'file'
                            ? 'border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="templateSourceType"
                          value="file"
                          checked={workflowFormData.templateSourceType === 'file'}
                          onChange={(e) => handleWorkflowFormChange('templateSourceType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                          workflowFormData.templateSourceType === 'file'
                            ? 'border-[#5146E5] bg-[#5146E5] shadow-md'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {workflowFormData.templateSourceType === 'file' && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-base font-semibold text-gray-800">Upload Template</span>
                            <p className="text-sm text-gray-600">Upload Excel, CSV, or JSON templates</p>
                          </div>
                        </div>
                        {workflowFormData.templateSourceType === 'file' && (
                          <div className="absolute top-3 right-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Template URL Input */}
                  {workflowFormData.templateSourceType === 'url' && (
                    <div className="bg-gray-50 rounded-xl p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>Template Sheet URL</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <input
                          type="url"
                          value={workflowFormData.templateSheetUrl}
                          onChange={(e) => handleWorkflowFormChange('templateSheetUrl', e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium shadow-sm hover:shadow-md"
                        />
                      </div>
                      <p className="mt-3 text-sm text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-200">
                        📋 <strong>Tip:</strong> Your template should contain the desired output format and column structure for the generated files.
                      </p>
                    </div>
                  )}

                  {/* Template File Upload */}
                  {workflowFormData.templateSourceType === 'file' && (
                    <div className="bg-gray-50 rounded-xl p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Upload Template File</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:border-[#5146E5] hover:bg-[#5146E5]/5 transition-all duration-300 group">
                        <div className="space-y-2 text-center">
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex text-base text-gray-700">
                            <label htmlFor="template-file-upload" className="relative cursor-pointer bg-white rounded-lg px-4 py-2 font-semibold text-[#5146E5] hover:text-[#4338CA] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#5146E5] shadow-sm hover:shadow-md transition-all duration-200">
                              <span>Choose template file</span>
                              <input
                                id="template-file-upload"
                                name="template-file-upload"
                                type="file"
                                className="sr-only"
                                accept=".xlsx,.xls,.csv,.json"
                                onChange={handleTemplateFileUpload}
                              />
                            </label>
                            <p className="pl-2 self-center">or drag and drop</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            Template files: Excel (.xlsx, .xls), CSV, or JSON up to 10MB
                          </p>
                          {workflowFormData.uploadedTemplateFile && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-center space-x-3 text-green-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">{workflowFormData.uploadedTemplateFile.name}</span>
                                <span className="text-sm">({(workflowFormData.uploadedTemplateFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Describe Requirements */}
              {currentStep === 4 && (
                <div className="space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Describe Requirements</h4>
                    <p className="text-gray-600 max-w-md mx-auto">Tell us about your specific requirements, preferences, and any special instructions for this workflow.</p>
                  </div>

                  {/* Requirements Text Area */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-[#5146E5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Requirements & Instructions</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <textarea
                      value={workflowFormData.requirements}
                      onChange={(e) => handleWorkflowFormChange('requirements', e.target.value)}
                      placeholder="Please describe your requirements in detail. Include any specific formatting needs, data transformations, output preferences, or special instructions for this workflow..."
                      rows={8}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium shadow-sm hover:shadow-md resize-vertical min-h-[200px]"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Be as specific as possible to help us create the perfect workflow for you.
                      </p>
                      <span className="text-xs text-gray-500">
                        {workflowFormData.requirements.length} characters
                      </span>
                    </div>
                  </div>

                  {/* Helpful Tips */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-blue-900 mb-2">💡 What to include in your requirements:</h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Specific output format preferences</li>
                          <li>• Data validation rules or constraints</li>
                          <li>• Custom field mappings or transformations</li>
                          <li>• Marketplace-specific requirements</li>
                          <li>• Quality standards or approval workflows</li>
                          <li>• Timeline expectations and priorities</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Placeholder for future steps */}
              {currentStep > 4 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Step {currentStep}</h4>
                  <p className="text-gray-600">This step will be implemented next.</p>
                </div>
              )}
            </div>

            {/* Enhanced Modal Footer */}
            <div className="flex items-center justify-between p-8 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="flex items-center space-x-2 px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={resetWorkflowForm}
                  className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextStep}
                  data-submit-button
                  disabled={
                    (currentStep === 1 && (!workflowFormData.workflowName || !workflowFormData.brandName || workflowFormData.marketplaceChannels.length === 0)) ||
                    (currentStep === 2 && (
                      (workflowFormData.dataSourceType === 'url' && !workflowFormData.sourceSheetUrl) ||
                      (workflowFormData.dataSourceType === 'file' && !workflowFormData.uploadedFile)
                    )) ||
                    (currentStep === 3 && (
                      (workflowFormData.templateSourceType === 'url' && !workflowFormData.templateSheetUrl) ||
                      (workflowFormData.templateSourceType === 'file' && !workflowFormData.uploadedTemplateFile)
                    )) ||
                    (currentStep === 4 && !workflowFormData.requirements.trim())
                  }
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-[#5146E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
                >
                  <span>{currentStep === 4 ? 'Submit Request' : 'Continue'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentStep === 4 ? "M5 13l4 4L19 7" : "M9 5l7 7-7 7"} />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Done Modal */}
      {showMarkAsDoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative p-6 rounded-t-2xl text-white bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">
                      {selectedWorkflowForCompletion?.status === 'UNDER PROCESS' ? 'Mark as Done' : 'Update Workflow'}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {selectedWorkflowForCompletion?.status === 'UNDER PROCESS' ? 'Complete workflow processing' : 'Update workflow details'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMarkAsDoneModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedWorkflowForCompletion && (
                <>
                  {/* Workflow Details Card */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                        {selectedWorkflowForCompletion.brand_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">Brand:</span>
                          <span className="font-semibold text-gray-900">{selectedWorkflowForCompletion.brand_name}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">ID:</span>
                          <span className="text-sm text-gray-500 font-mono">{selectedWorkflowForCompletion.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    {/* Webhook URL Field */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>Webhook URL</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="url"
                        value={markAsDoneFormData.webhookUrl}
                        onChange={(e) => handleMarkAsDoneFormChange('webhookUrl', e.target.value)}
                        placeholder="https://example.com/webhook"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white"
                      />
                    </div>

                    {/* Status Field */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            markAsDoneFormData.status === 'ACTIVE'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="ACTIVE"
                            checked={markAsDoneFormData.status === 'ACTIVE'}
                            onChange={(e) => handleMarkAsDoneFormChange('status', e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              markAsDoneFormData.status === 'ACTIVE'
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300'
                            }`}>
                              {markAsDoneFormData.status === 'ACTIVE' && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span className="font-medium">ACTIVE</span>
                          </div>
                        </label>
                        
                        <label
                          className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            markAsDoneFormData.status === 'INACTIVE'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="INACTIVE"
                            checked={markAsDoneFormData.status === 'INACTIVE'}
                            onChange={(e) => handleMarkAsDoneFormChange('status', e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              markAsDoneFormData.status === 'INACTIVE'
                                ? 'border-red-500 bg-red-500'
                                : 'border-gray-300'
                            }`}>
                              {markAsDoneFormData.status === 'INACTIVE' && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span className="font-medium">INACTIVE</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowMarkAsDoneModal(false)}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkWorkflowAsDone}
                disabled={!markAsDoneFormData.webhookUrl.trim()}
                className="px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{selectedWorkflowForCompletion?.status === 'UNDER PROCESS' ? 'Mark as Done' : 'Update Workflow'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Workflow Modal */}
      {showRunWorkflowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative p-6 rounded-t-2xl text-white bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">Run Workflow</h3>
                    <p className="text-white/80 text-sm">Configure template and Run</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRunWorkflowModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedWorkflowForRun && (
                <>
                  {/* Workflow Details Card */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                        {selectedWorkflowForRun.workflow_name ? selectedWorkflowForRun.workflow_name.substring(0, 2).toUpperCase() : 'WF'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">Workflow:</span>
                          <span className="font-semibold text-gray-900">{selectedWorkflowForRun.workflow_name || 'Unnamed Workflow'}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">Brand:</span>
                          <span className="text-sm text-gray-500">{selectedWorkflowForRun.brand_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Source Type Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-800">
                      <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Template Source</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label
                        className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          runWorkflowFormData.templateSourceType === 'url'
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="templateSourceType"
                          value="url"
                          checked={runWorkflowFormData.templateSourceType === 'url'}
                          onChange={(e) => handleRunWorkflowFormChange('templateSourceType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                          runWorkflowFormData.templateSourceType === 'url'
                            ? 'border-green-500 bg-green-500 shadow-md'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {runWorkflowFormData.templateSourceType === 'url' && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">Template URL</span>
                            <p className="text-xs text-gray-600">Connect via Google Sheets or Excel Online</p>
                          </div>
                        </div>
                        {runWorkflowFormData.templateSourceType === 'url' && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>

                      <label
                        className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          runWorkflowFormData.templateSourceType === 'file'
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="templateSourceType"
                          value="file"
                          checked={runWorkflowFormData.templateSourceType === 'file'}
                          onChange={(e) => handleRunWorkflowFormChange('templateSourceType', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                          runWorkflowFormData.templateSourceType === 'file'
                            ? 'border-green-500 bg-green-500 shadow-md'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {runWorkflowFormData.templateSourceType === 'file' && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">Upload File</span>
                            <p className="text-xs text-gray-600">Upload Excel, CSV, or JSON files</p>
                          </div>
                        </div>
                        {runWorkflowFormData.templateSourceType === 'file' && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* URL Input */}
                  {runWorkflowFormData.templateSourceType === 'url' && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>Template URL</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <input
                          type="url"
                          value={runWorkflowFormData.templateUrl}
                          onChange={(e) => handleRunWorkflowFormChange('templateUrl', e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* File Upload */}
                  {runWorkflowFormData.templateSourceType === 'file' && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Upload Template File</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="mt-2 flex justify-center px-6 pt-6 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-500 hover:bg-green-50/50 transition-all duration-300 group">
                        <div className="space-y-2 text-center">
                          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div className="flex text-sm text-gray-700">
                            <label htmlFor="run-template-file-upload" className="relative cursor-pointer bg-white rounded-lg px-3 py-2 font-semibold text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 shadow-sm hover:shadow-md transition-all duration-200">
                              <span>Choose template file</span>
                              <input
                                id="run-template-file-upload"
                                name="run-template-file-upload"
                                type="file"
                                className="sr-only"
                                accept=".xlsx,.xls,.csv,.json"
                                onChange={handleRunTemplateFileUpload}
                              />
                            </label>
                            <p className="pl-1 self-center">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            Excel (.xlsx, .xls), CSV, or JSON files up to 10MB
                          </p>
                          {runWorkflowFormData.templateFile && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-center space-x-2 text-green-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium text-sm">{runWorkflowFormData.templateFile.name}</span>
                                <span className="text-xs">({(runWorkflowFormData.templateFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowRunWorkflowModal(false)}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddToExecutionQueue}
                data-execution-queue-button
                disabled={
                  (runWorkflowFormData.templateSourceType === 'url' && !runWorkflowFormData.templateUrl.trim()) ||
                  (runWorkflowFormData.templateSourceType === 'file' && !runWorkflowFormData.templateFile)
                }
                className="px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                 <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                <span>Add To Execution Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
