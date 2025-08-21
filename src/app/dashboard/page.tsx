"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useExternalTeamMembers } from "@/hooks/useExternalTeamMembers";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { teamMembers, loading: teamLoading, stats } = useTeamMembers();
  const {
    externalTeamMembers,
    loading: externalTeamLoading,
    stats: externalStats,
  } = useExternalTeamMembers();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [internalTeamTab, setInternalTeamTab] = useState("members");
  const [workflowRequestsTab, setWorkflowRequestsTab] = useState("pending");

  // Member action states
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [actionType, setActionType] = useState<"activate" | "deactivate">(
    "activate"
  );

  // Workflow form states
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowFormData, setWorkflowFormData] = useState({
    workflowName: "",
    brandName: "",
    marketplaceChannels: [] as string[],
    dataSourceType: "url" as "url" | "file",
    sourceSheetUrl: "",
    uploadedFile: null as File | null,
    templateSourceType: "url" as "url" | "file",
    templateSheetUrl: "",
    uploadedTemplateFile: null as File | null,
    requirements: "",
  });

  // Workflows data states
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  const [workflowUsers, setWorkflowUsers] = useState<{ [key: string]: any }>(
    {}
  );

  // Active workflows data states for Create Listings
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [activeWorkflowsLoading, setActiveWorkflowsLoading] = useState(true);
  const [activeWorkflowsError, setActiveWorkflowsError] = useState<
    string | null
  >(null);
  const [activeWorkflowUsers, setActiveWorkflowUsers] = useState<{
    [key: string]: any;
  }>({});

  // Workflow Executions data states for Run Workflows section
  const [workflowExecutions, setWorkflowExecutions] = useState<any[]>([]);
  const [workflowExecutionsLoading, setWorkflowExecutionsLoading] =
    useState(true);
  const [workflowExecutionsError, setWorkflowExecutionsError] = useState<
    string | null
  >(null);
  const [workflowExecutionUsers, setWorkflowExecutionUsers] = useState<{
    [key: string]: {
      id: string;
      first_name?: string;
      last_name?: string;
      full_name?: string;
      email: string;
    };
  }>({});
  const [workflowExecutionWorkflows, setWorkflowExecutionWorkflows] = useState<{
    [key: string]: {
      id: string;
      workflow_name: string;
      brand_name: string;
    };
  }>({});

  // Workflow Requests data states
  const [workflowRequests, setWorkflowRequests] = useState<any[]>([]);
  const [workflowRequestsLoading, setWorkflowRequestsLoading] = useState(true);
  const [workflowRequestsError, setWorkflowRequestsError] = useState<
    string | null
  >(null);
  const [workflowRequestUsers, setWorkflowRequestUsers] = useState<{
    [key: string]: any;
  }>({});

  // Mark as done modal states
  const [showMarkAsDoneModal, setShowMarkAsDoneModal] = useState(false);
  const [selectedWorkflowForCompletion, setSelectedWorkflowForCompletion] =
    useState<{
      id: string;
      workflow_name: string;
      brand_name: string;
      status: string;
    } | null>(null);
  const [markAsDoneFormData, setMarkAsDoneFormData] = useState({
    webhookUrl: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  // Run workflow modal states
  const [showRunWorkflowModal, setShowRunWorkflowModal] = useState(false);
  const [selectedWorkflowForRun, setSelectedWorkflowForRun] = useState<{
    id: string;
    workflow_name: string;
    brand_name: string;
    webhook_url?: string;
  } | null>(null);
  const [runWorkflowFormData, setRunWorkflowFormData] = useState({
    templateSourceType: "url" as "url" | "file",
    templateUrl: "",
    templateFile: null as File | null,
  });

  // CLIENT dashboard statistics states
  const [clientStats, setClientStats] = useState({
    totalWorkflowsCreated: 0,
    totalWorkflowsExecuted: 0,
    totalFilesGenerated: 0,
    loading: true,
    error: null as string | null,
  });

  // PROVIDER dashboard statistics states
  const [providerStats, setProviderStats] = useState({
    totalOrganizationsOnboarded: 0,
    totalWorkflowsCreated: 0,
    totalWorkflowsExecuted: 0,
    totalFilesGenerated: 0,
    loading: true,
    error: null as string | null,
  });

  // Organizations data states for Clients tab
  const [organizations, setOrganizations] = useState<
    {
      id: string;
      name: string;
      created_at: string;
    }[]
  >([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState<string | null>(
    null
  );

  // Toast notification states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      type: "success" | "error" | "info" | "warning";
      title: string;
      message: string;
    }>
  >([]);

  // Toast notification functions
  const showToast = (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message: string
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log("User not authenticated, redirecting to auth...");
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Function to fetch workflows
  const fetchWorkflows = useCallback(async () => {
    if (!user?.id || !profile?.organization_id) {
      setWorkflowsLoading(false);
      return;
    }

    try {
      setWorkflowsLoading(true);
      setWorkflowsError(null);

      const supabase = createClient();

      // Fetch workflows for the current user's organization
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("organisation_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching workflows:", error);
        setWorkflowsError("Failed to load workflows");
        return;
      }

      setWorkflows(data || []);

      // Fetch user details for all workflows
      if (data && data.length > 0) {
        const userIds = [
          ...new Set(data.map((w) => w.user_id).filter(Boolean)),
        ];

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, email")
            .in("id", userIds);

          if (!usersError && usersData) {
            const usersMap = usersData.reduce((acc, user: any) => {
              acc[user.id] = user;
              return acc;
            }, {} as { [key: string]: any });
            setWorkflowUsers(usersMap);
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchWorkflows:", error);
      setWorkflowsError("An error occurred while loading workflows");
    } finally {
      setWorkflowsLoading(false);
    }
  }, [user?.id, profile?.organization_id]);

  // Function to fetch active workflows for Create Listings
  const fetchActiveWorkflows = useCallback(async () => {
    if (!user?.id || !profile?.organization_id) {
      setActiveWorkflowsLoading(false);
      return;
    }

    try {
      setActiveWorkflowsLoading(true);
      setActiveWorkflowsError(null);

      const supabase = createClient();

      console.log(
        "Fetching active workflows for organization:",
        profile.organization_id
      );

      // Fetch only ACTIVE workflows for the current user's organization
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("organisation_id", profile.organization_id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching active workflows:", error);
        setActiveWorkflowsError("Failed to load active workflows");
        return;
      }

      console.log("Active workflows fetched:", data?.length || 0);
      setActiveWorkflows(data || []);

      // Fetch user details for all active workflows
      if (data && data.length > 0) {
        const userIds = [
          ...new Set(data.map((w) => w.user_id).filter(Boolean)),
        ];

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, email")
            .in("id", userIds);

          if (!usersError && usersData) {
            const usersMap = usersData.reduce((acc, user: any) => {
              acc[user.id] = user;
              return acc;
            }, {} as { [key: string]: any });
            setActiveWorkflowUsers(usersMap);
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchActiveWorkflows:", error);
      setActiveWorkflowsError(
        "An error occurred while loading active workflows"
      );
    } finally {
      setActiveWorkflowsLoading(false);
    }
  }, [user?.id, profile?.organization_id]);

  // Function to fetch workflow executions for Run Workflows section
  const fetchWorkflowExecutions = useCallback(async () => {
    if (!user?.id || !profile?.organization_id) {
      setWorkflowExecutionsLoading(false);
      return;
    }

    try {
      setWorkflowExecutionsLoading(true);
      setWorkflowExecutionsError(null);

      const supabase = createClient();

      console.log(
        "Fetching workflow executions for organization:",
        profile.organization_id
      );

      // Fetch workflow executions for the current user's organization
      const { data, error } = await supabase
        .from("workflow_execute")
        .select("*")
        .eq("organisation_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching workflow executions:", error);
        setWorkflowExecutionsError("Failed to load workflow executions");
        return;
      }

      console.log("Workflow executions fetched:", data?.length || 0);
      setWorkflowExecutions(data || []);

      // Fetch user details for all workflow executions
      if (data && data.length > 0) {
        const userIds = [
          ...new Set(data.map((w) => w.executed_by).filter(Boolean)),
        ];
        const workflowIds = [
          ...new Set(data.map((w) => w.workflow_id).filter(Boolean)),
        ];

        // Fetch user details
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, full_name, email")
            .in("id", userIds);

          if (!usersError && usersData) {
            const usersMap = usersData.reduce((acc, user: any) => {
              acc[user.id] = user;
              return acc;
            }, {} as { [key: string]: any });
            setWorkflowExecutionUsers(usersMap);
          }
        }

        // Fetch workflow details
        if (workflowIds.length > 0) {
          const { data: workflowsData, error: workflowsError } = await supabase
            .from("workflows")
            .select("id, workflow_name, brand_name")
            .in("id", workflowIds);

          if (!workflowsError && workflowsData) {
            const workflowsMap = workflowsData.reduce((acc, workflow: any) => {
              acc[workflow.id] = workflow;
              return acc;
            }, {} as { [key: string]: any });
            setWorkflowExecutionWorkflows(workflowsMap);
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchWorkflowExecutions:", error);
      setWorkflowExecutionsError(
        "An error occurred while loading workflow executions"
      );
    } finally {
      setWorkflowExecutionsLoading(false);
    }
  }, [user?.id, profile?.organization_id]);

  // Fetch workflows when user and profile are available
  useEffect(() => {
    if (user && profile) {
      fetchWorkflows();
    }
  }, [user, profile, fetchWorkflows]);

  // Fetch active workflows and workflow executions when switching to create-listings tab
  useEffect(() => {
    if (activeTab === "create-listings" && user && profile) {
      fetchActiveWorkflows();
      fetchWorkflowExecutions();
    }
  }, [activeTab, user, profile, fetchActiveWorkflows, fetchWorkflowExecutions]);

  // Fetch workflow executions when switching to generated-files tab
  useEffect(() => {
    if (activeTab === "generated-files" && user && profile) {
      fetchWorkflowExecutions();
    }
  }, [activeTab, user, profile, fetchWorkflowExecutions]);

  // Function to fetch workflow requests
  const fetchWorkflowRequests = useCallback(
    async (status?: string) => {
      if (!user?.id || !profile?.organization_id) {
        setWorkflowRequestsLoading(false);
        return;
      }

      try {
        setWorkflowRequestsLoading(true);
        setWorkflowRequestsError(null);

        const supabase = createClient();

        // Build query for workflow requests
        let query = supabase
          .from("workflows")
          .select("*")
          .order("created_at", { ascending: false });

        // Add status filter if provided
        if (status === "UNDER PROCESS") {
          query = query.eq("status", "UNDER PROCESS");
        } else if (status === "NOT_UNDER_PROCESS") {
          query = query.neq("status", "UNDER PROCESS");
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching workflow requests:", error);
          setWorkflowRequestsError("Failed to load workflow requests");
          return;
        }

        setWorkflowRequests(data || []);

        // Fetch user details for all workflow requests
        if (data && data.length > 0) {
          const userIds = [
            ...new Set(data.map((w) => w.user_id).filter(Boolean)),
          ];

          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, full_name, email")
              .in("id", userIds);

            if (!usersError && usersData) {
              const usersMap = usersData.reduce((acc, user: any) => {
                acc[user.id] = user;
                return acc;
              }, {} as { [key: string]: any });
              setWorkflowRequestUsers(usersMap);
            }
          }
        }
      } catch (error) {
        console.error("Error in fetchWorkflowRequests:", error);
        setWorkflowRequestsError(
          "An error occurred while loading workflow requests"
        );
      } finally {
        setWorkflowRequestsLoading(false);
      }
    },
    [user?.id, profile?.organization_id]
  );

  // Handler for workflow requests tab change
  const handleWorkflowRequestsTabChange = useCallback(
    (tab: string) => {
      setWorkflowRequestsTab(tab);
      if (tab === "pending") {
        fetchWorkflowRequests("UNDER PROCESS");
      } else {
        fetchWorkflowRequests("NOT_UNDER_PROCESS");
      }
    },
    [fetchWorkflowRequests]
  );

  // Fetch workflow requests when switching to workflow-requests tab
  useEffect(() => {
    if (activeTab === "workflow-requests" && user && profile) {
      if (workflowRequestsTab === "pending") {
        fetchWorkflowRequests("UNDER PROCESS");
      } else {
        fetchWorkflowRequests("NOT_UNDER_PROCESS");
      }
    }
  }, [activeTab, user, profile, workflowRequestsTab, fetchWorkflowRequests]);

  // Function to fetch CLIENT dashboard statistics
  const fetchClientStats = useCallback(async () => {
    if (
      !user?.id ||
      !profile?.organization_id ||
      profile?.category !== "CLIENT"
    ) {
      setClientStats((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setClientStats((prev) => ({ ...prev, loading: true, error: null }));

      const supabase = createClient();

      console.log(
        "Fetching CLIENT stats for organization:",
        profile.organization_id
      );

      // Fetch total workflows created
      const { count: workflowsCreated, error: workflowsError } = await supabase
        .from("workflows")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", profile.organization_id);

      if (workflowsError) {
        console.error("Error fetching workflows count:", workflowsError);
        throw workflowsError;
      }

      // Fetch total workflows executed
      const { count: workflowsExecuted, error: executedError } = await supabase
        .from("workflow_execute")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", profile.organization_id);

      if (executedError) {
        console.error("Error fetching executions count:", executedError);
        throw executedError;
      }

      // Fetch total files generated (SUCCESS status)
      const { count: filesGenerated, error: filesError } = await supabase
        .from("workflow_execute")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", profile.organization_id)
        .eq("status", "SUCCESS");

      if (filesError) {
        console.error("Error fetching files count:", filesError);
        throw filesError;
      }

      console.log("CLIENT stats fetched:", {
        workflowsCreated: workflowsCreated || 0,
        workflowsExecuted: workflowsExecuted || 0,
        filesGenerated: filesGenerated || 0,
      });

      setClientStats({
        totalWorkflowsCreated: workflowsCreated || 0,
        totalWorkflowsExecuted: workflowsExecuted || 0,
        totalFilesGenerated: filesGenerated || 0,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error in fetchClientStats:", error);
      setClientStats((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load statistics",
      }));
    }
  }, [user?.id, profile?.organization_id, profile?.category]);

  // Function to fetch PROVIDER dashboard statistics
  const fetchProviderStats = useCallback(async () => {
    if (!user?.id || profile?.category !== "PROVIDER") {
      setProviderStats((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setProviderStats((prev) => ({ ...prev, loading: true, error: null }));

      const supabase = createClient();

      console.log("Fetching PROVIDER stats for user:", user.id);

      // Fetch total organizations onboarded (count from organizations table)
      const { count: organizationsCount, error: organizationsError } =
        await supabase
          .from("organizations")
          .select("*", { count: "exact", head: true });

      if (organizationsError) {
        console.error(
          "Error fetching organizations count:",
          organizationsError
        );
        throw organizationsError;
      }

      // Fetch total workflows created (count from workflows table irrespective of organization_id)
      const { count: workflowsCreated, error: workflowsError } = await supabase
        .from("workflows")
        .select("*", { count: "exact", head: true });

      if (workflowsError) {
        console.error("Error fetching workflows count:", workflowsError);
        throw workflowsError;
      }

      // Fetch total workflows executed (count from workflow_execute table irrespective of organization_id)
      const { count: workflowsExecuted, error: executedError } = await supabase
        .from("workflow_execute")
        .select("*", { count: "exact", head: true });

      if (executedError) {
        console.error("Error fetching executions count:", executedError);
        throw executedError;
      }

      // Fetch total files generated (count from workflow_execute table with status SUCCESS irrespective of organization_id)
      const { count: filesGenerated, error: filesError } = await supabase
        .from("workflow_execute")
        .select("*", { count: "exact", head: true })
        .eq("status", "SUCCESS");

      if (filesError) {
        console.error("Error fetching files count:", filesError);
        throw filesError;
      }

      console.log("PROVIDER stats fetched:", {
        organizationsCount: organizationsCount || 0,
        workflowsCreated: workflowsCreated || 0,
        workflowsExecuted: workflowsExecuted || 0,
        filesGenerated: filesGenerated || 0,
      });

      setProviderStats({
        totalOrganizationsOnboarded: organizationsCount || 0,
        totalWorkflowsCreated: workflowsCreated || 0,
        totalWorkflowsExecuted: workflowsExecuted || 0,
        totalFilesGenerated: filesGenerated || 0,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error in fetchProviderStats:", error);
      setProviderStats((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load statistics",
      }));
    }
  }, [user?.id, profile?.category]);

  // Function to fetch organizations for Clients tab
  const fetchOrganizations = useCallback(async () => {
    if (!user?.id || !profile?.permissions?.includes("VIEW_CLIENTS")) {
      setOrganizationsLoading(false);
      return;
    }

    try {
      setOrganizationsLoading(true);
      setOrganizationsError(null);

      const supabase = createClient();

      console.log("Fetching organizations for Clients tab");

      // Fetch all organizations
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching organizations:", error);
        setOrganizationsError("Failed to load organizations");
        return;
      }

      const filteredData = data.filter(d => d.name !== "Catsy");

      setOrganizations((filteredData as any[]) || []);
    } catch (error) {
      console.error("Error in fetchOrganizations:", error);
      setOrganizationsError("An error occurred while loading organizations");
    } finally {
      setOrganizationsLoading(false);
    }
  }, [user?.id, profile?.permissions]);

  // Fetch CLIENT stats when dashboard is accessed and user is CLIENT
  useEffect(() => {
    if (
      activeTab === "dashboard" &&
      user &&
      profile &&
      profile.category === "CLIENT"
    ) {
      fetchClientStats();
    }
  }, [activeTab, user, profile, fetchClientStats]);

  // Fetch PROVIDER stats when dashboard is accessed and user is PROVIDER
  useEffect(() => {
    if (
      activeTab === "dashboard" &&
      user &&
      profile &&
      profile.category === "PROVIDER"
    ) {
      fetchProviderStats();
    }
  }, [activeTab, user, profile, fetchProviderStats]);

  // Fetch organizations when switching to clients tab
  useEffect(() => {
    if (activeTab === "clients" && user && profile) {
      fetchOrganizations();
    }
  }, [activeTab, user, profile, fetchOrganizations]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Member action handlers
  const handleAssignRole = (member: {
    id: string;
    email: string;
    role?: string;
    status: number;
    organization_id?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
  }) => {
    setSelectedMember(member);
    setSelectedRole(member.role || "");
    setShowAssignRoleModal(true);
  };

  const handleToggleStatus = (member: {
    id: string;
    email: string;
    role?: string;
    status: number;
    organization_id?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
  }) => {
    setSelectedMember(member);
    setActionType(member.status === 1 ? "deactivate" : "activate");
    setShowStatusModal(true);
  };

  const confirmAssignRole = async () => {
    if (!selectedMember || !selectedRole) return;

    try {
      const supabase = createClient();

      // Update role in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ role: selectedRole })
        .eq("id", selectedMember.id);

      if (error) {
        throw error;
      }

      // Close modal and reset state
      setShowAssignRoleModal(false);
      setSelectedMember(null);
      setSelectedRole("");

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error assigning role:", error);
      alert("Failed to assign role. Please try again.");
    }
  };

  const confirmToggleStatus = async () => {
    if (!selectedMember) return;

    try {
      const supabase = createClient();
      const newStatus = actionType === "activate" ? 1 : 0;

      // Update status in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", selectedMember.id);

      if (error) {
        throw error;
      }

      // Close modal and reset state
      setShowStatusModal(false);
      setSelectedMember(null);

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update account status. Please try again.");
    }
  };

  // Workflow form handlers
  const handleWorkflowFormChange = (
    field: string,
    value: string | string[] | File | null
  ) => {
    setWorkflowFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setWorkflowFormData((prev) => ({
      ...prev,
      uploadedFile: file,
    }));
  };

  const handleTemplateFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    setWorkflowFormData((prev) => ({
      ...prev,
      uploadedTemplateFile: file,
    }));
  };

  const handleMarketplaceToggle = (marketplace: string) => {
    setWorkflowFormData((prev) => ({
      ...prev,
      marketplaceChannels: prev.marketplaceChannels.includes(marketplace)
        ? prev.marketplaceChannels.filter((m) => m !== marketplace)
        : [...prev.marketplaceChannels, marketplace],
    }));
  };

  // Handler to show mark as done modal
  const handleMarkWorkflowAsDone = (workflow: {
    id: string;
    workflow_name: string;
    brand_name: string;
    status: string;
  }) => {
    setSelectedWorkflowForCompletion(workflow);
    setMarkAsDoneFormData({
      webhookUrl: "",
      status: "ACTIVE",
    });
    setShowMarkAsDoneModal(true);
  };

  // Handler for mark as done form changes
  const handleMarkAsDoneFormChange = (field: string, value: string) => {
    setMarkAsDoneFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handler to confirm marking workflow as done
  const confirmMarkWorkflowAsDone = async () => {
    if (!selectedWorkflowForCompletion) return;

    // Validate required fields
    if (!markAsDoneFormData.webhookUrl.trim()) {
      alert("Please enter a webhook URL.");
      return;
    }

    try {
      const supabase = createClient();

      // Update workflow with webhook URL and status
      const { error } = await supabase
        .from("workflows")
        .update({
          webhook_url: markAsDoneFormData.webhookUrl.trim(),
          status: markAsDoneFormData.status,
        })
        .eq("id", selectedWorkflowForCompletion.id);

      if (error) {
        console.error("Error marking workflow as done:", error);
        alert("Failed to mark workflow as done. Please try again.");
        return;
      }

      // Close modal and reset state
      setShowMarkAsDoneModal(false);
      setSelectedWorkflowForCompletion(null);
      setMarkAsDoneFormData({
        webhookUrl: "",
        status: "ACTIVE",
      });

      // Refresh the workflow requests data
      if (workflowRequestsTab === "pending") {
        fetchWorkflowRequests("UNDER PROCESS");
      } else {
        fetchWorkflowRequests("NOT_UNDER_PROCESS");
      }

      // Show success message
      const actionText =
        selectedWorkflowForCompletion.status === "UNDER PROCESS"
          ? "marked as done"
          : "updated";
      alert(`Workflow ${actionText} successfully!`);
    } catch (error) {
      console.error("Error in confirmMarkWorkflowAsDone:", error);
      alert(
        "An error occurred while marking workflow as done. Please try again."
      );
    }
  };

  // Handler to show run workflow modal
  const handleRunWorkflow = (workflow: {
    id: string;
    workflow_name: string;
    brand_name: string;
    webhook_url?: string;
  }) => {
    setSelectedWorkflowForRun(workflow);
    setRunWorkflowFormData({
      templateSourceType: "url",
      templateUrl: "",
      templateFile: null,
    });
    setShowRunWorkflowModal(true);
  };

  // Handler for run workflow form changes
  const handleRunWorkflowFormChange = (
    field: string,
    value: string | File | null
  ) => {
    setRunWorkflowFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handler for template file upload in run workflow modal
  const handleRunTemplateFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    setRunWorkflowFormData((prev) => ({
      ...prev,
      templateFile: file,
    }));
  };

  // Handler to confirm adding workflow to execution queue
  const confirmAddToExecutionQueue = async () => {
    if (!selectedWorkflowForRun || !user?.id || !profile?.organization_id)
      return;

    // Validate required fields
    if (
      runWorkflowFormData.templateSourceType === "url" &&
      !runWorkflowFormData.templateUrl.trim()
    ) {
      alert("Please enter a template URL.");
      return;
    }

    if (
      runWorkflowFormData.templateSourceType === "file" &&
      !runWorkflowFormData.templateFile
    ) {
      alert("Please upload a template file.");
      return;
    }

    try {
      const supabase = createClient();

      // Show loading state
      const submitButton = document.querySelector(
        "[data-execution-queue-button]"
      ) as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Adding to Queue...";
      }

      let templateFileUrl = runWorkflowFormData.templateUrl;

      // Upload file to Supabase storage if user chose file upload
      if (
        runWorkflowFormData.templateSourceType === "file" &&
        runWorkflowFormData.templateFile
      ) {
        console.log("Uploading template file to Supabase storage...");

        const uploadedUrl = await uploadFileToSupabase(
          runWorkflowFormData.templateFile,
          "workflow-files",
          "template-files"
        );

        if (!uploadedUrl) {
          alert("Failed to upload template file. Please try again.");
          return;
        }

        templateFileUrl = uploadedUrl;
        console.log("Template file uploaded successfully:", uploadedUrl);
      }

      // Create entry in workflow_execute table
      const workflowExecuteData = {
        workflow_id: selectedWorkflowForRun.id,
        template_file: templateFileUrl,
        executed_by: user.id,
        generated_files: [], // Empty array initially
        organisation_id: profile.organization_id,
        webhook_url: selectedWorkflowForRun.webhook_url,
      };

      console.log("Creating workflow execution entry:", workflowExecuteData);

      const { data, error } = await supabase
        .from("workflow_execute")
        .insert([workflowExecuteData])
        .select();

      if (error) {
        console.error("Error creating workflow execution entry:", error);
        alert("Failed to add workflow to execution queue. Please try again.");
        return;
      }

      console.log("Workflow execution entry created successfully:", data);

      // Close modal and reset state
      setShowRunWorkflowModal(false);
      setSelectedWorkflowForRun(null);
      setRunWorkflowFormData({
        templateSourceType: "url",
        templateUrl: "",
        templateFile: null,
      });

      // Refresh the workflow executions list to show the new entry
      await fetchWorkflowExecutions();

      // Show success message
      showToast(
        "success",
        "Added to Queue",
        `Workflow "${
          selectedWorkflowForRun.workflow_name || "Unnamed Workflow"
        }" has been added to the execution queue successfully!`
      );
    } catch (error) {
      console.error("Error adding to execution queue:", error);
      showToast(
        "error",
        "Queue Error",
        "An error occurred while adding to execution queue. Please try again."
      );
    } finally {
      // Reset button state
      const submitButton = document.querySelector(
        "[data-execution-queue-button]"
      ) as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Add To Execution Queue";
      }
    }
  };

  // Handler to run workflow execution
  const handleRunWorkflowExecution = async (execution: {
    id: string;
    webhook_url?: string;
    workflow_id: string;
    template_file?: string;
  }) => {
    if (!execution.webhook_url) {
      alert("No webhook URL found for this execution.");
      return;
    }

    try {
      // Show loading state on the button
      const runButton = document.querySelector(
        `[data-run-execution="${execution.id}"]`
      ) as HTMLButtonElement;
      if (runButton) {
        runButton.disabled = true;
        runButton.innerHTML = `
          <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          RUNNING...
        `;
      }

      console.log("Making API call to webhook:", execution.webhook_url);

      // Make POST request to the webhook URL
      const response = await fetch(execution.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // You can add any required payload here if needed
        body: JSON.stringify({
          execution_id: execution.id,
          workflow_id: execution.workflow_id,
          template_file: execution.template_file,
        }),
      });

      console.log("Webhook response status:", response.status);

      if (response.status === 200) {
        const responseData = await response.json();
        console.log("Webhook response data:", responseData);

        // Check if response has the expected structure
        if (responseData.URLs) {
          const supabase = createClient();

          // Update the workflow_execute table with generated files and success status
          const { error: updateError } = await supabase
            .from("workflow_execute")
            .update({
              generated_files: responseData.URLs.split(","), // Store as array
              status: "SUCCESS",
            })
            .eq("id", execution.id);

          if (updateError) {
            console.error("Error updating workflow execution:", updateError);
            showToast(
              "error",
              "Update Failed",
              "Failed to update execution status. Please try again."
            );
            return;
          }

          console.log("Workflow execution updated successfully");

          // Refresh the workflow executions data
          fetchWorkflowExecutions();

          showToast(
            "success",
            "Workflow Executed Successfully",
            "Files have been generated and are ready for download."
          );
        } else {
          console.error("Invalid response structure:", responseData);
          showToast(
            "warning",
            "Invalid Response",
            "Workflow execution completed but response format is invalid."
          );
        }
      } else {
        console.error("Webhook request failed with status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        showToast(
          "error",
          "Execution Failed",
          `Workflow execution failed with status ${response.status}. Please try again.`
        );
      }
    } catch (error) {
      console.error("Error running workflow execution:", error);
      showToast(
        "error",
        "Network Error",
        "An error occurred while running the workflow. Please check your network connection and try again."
      );
    } finally {
      // Reset button state
      const runButton = document.querySelector(
        `[data-run-execution="${execution.id}"]`
      ) as HTMLButtonElement;
      if (runButton) {
        runButton.disabled = false;
        runButton.innerHTML = `
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          RUN
        `;
      }
    }
  };

  // Enhanced download utility function with Google Sheets handling
  const downloadFileFromUrl = async (
    url: string,
    filename?: string
  ): Promise<boolean> => {
    const finalFilename = filename || `download_${Date.now()}`;

    console.log(`🔽 Starting download: ${finalFilename}`);
    console.log(`🔗 URL: ${url}`);

    // Special handling for Google Sheets URLs
    if (url.includes("docs.google.com/spreadsheets/d/")) {
      console.log(
        "📊 Google Sheets URL detected, using iframe method directly"
      );
      const result = await downloadViaIframe(url, finalFilename);
      console.log(`📊 Google Sheets download result: ${result}`);
      return result;
    }

    // Strategy 1: Try direct fetch and blob download for other URLs
    try {
      console.log("🌐 Attempting fetch download...");
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: {
          Accept:
            "application/octet-stream, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, */*",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      console.log(`💾 Creating download link for: ${finalFilename}`);

      // Create a temporary anchor element to trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = finalFilename;
      link.style.display = "none";

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();

      // Wait a bit before removing the link to ensure download starts
      await new Promise((resolve) => setTimeout(resolve, 500));
      document.body.removeChild(link);

      // Clean up the object URL after a longer delay
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000);

      // Add delay to ensure download has started before returning success
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log(`✅ Fetch download completed: ${finalFilename}`);
      return true;
    } catch (fetchError) {
      console.log("❌ Fetch method failed, trying iframe method:", fetchError);

      // Strategy 2: Use hidden iframe for download (avoids new tabs completely)
      const result = await downloadViaIframe(url, finalFilename);
      console.log(`🖼️ Iframe download result: ${result}`);
      return result;
    }
  };

  // Download via hidden anchor element (works for most URLs including Google Sheets)
  const downloadViaIframe = (
    url: string,
    filename: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        // For Google Sheets, we'll use a direct anchor approach
        if (url.includes("docs.google.com/spreadsheets/d/")) {
          console.log("Using direct anchor download for Google Sheets");

          // Create a temporary anchor element
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.target = "_self"; // Ensure it doesn't open in new tab
          link.style.display = "none";

          // Add to DOM, click, and remove
          document.body.appendChild(link);

          // Use a timeout to ensure the link is properly added to DOM
          setTimeout(() => {
            link.click();
            setTimeout(() => {
              if (link.parentNode) {
                document.body.removeChild(link);
              }
              resolve(true);
            }, 100);
          }, 10);

          return;
        }

        // For other URLs, try iframe approach
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.style.visibility = "hidden";
        iframe.style.position = "absolute";
        iframe.style.left = "-9999px";
        iframe.style.top = "-9999px";
        iframe.style.width = "1px";
        iframe.style.height = "1px";

        // Set up event listeners
        let resolved = false;
        const cleanup = () => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        };

        iframe.onload = () => {
          if (!resolved) {
            resolved = true;
            setTimeout(cleanup, 2000);
            resolve(true);
          }
        };

        iframe.onerror = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            // If iframe fails, try direct anchor approach as fallback
            console.log("Iframe failed, trying direct anchor approach");
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.target = "_self";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              if (link.parentNode) {
                document.body.removeChild(link);
              }
            }, 100);
            resolve(true);
          }
        };

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(true);
          }
        }, 3000);

        // Append iframe and set source
        document.body.appendChild(iframe);
        iframe.src = url;
      } catch (error) {
        console.error("Download error:", error);
        // Final fallback - direct anchor approach
        try {
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.target = "_self";
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (link.parentNode) {
              document.body.removeChild(link);
            }
          }, 100);
          resolve(true);
        } catch (finalError) {
          console.error("Final fallback failed:", finalError);
          resolve(false);
        }
      }
    });
  };

  // Handler to download files from generated_files
  const handleDownloadFiles = async (execution: {
    id: string;
    generated_files?: string[];
  }) => {
    console.log("=== DOWNLOAD DEBUG START ===");
    console.log("Execution object:", execution);
    console.log("Generated files:", execution.generated_files);
    console.log("Generated files type:", typeof execution.generated_files);
    console.log("Generated files length:", execution.generated_files?.length);

    if (!execution.generated_files || execution.generated_files.length === 0) {
      showToast(
        "warning",
        "No Files Available",
        "No files available for download."
      );
      return;
    }

    // Check if generated_files contains nested arrays
    const firstItem = execution.generated_files[0];
    console.log("First item:", firstItem);
    console.log("First item type:", typeof firstItem);
    console.log("Is first item array?", Array.isArray(firstItem));

    try {
      // Show loading state on the button
      const downloadButton = document.querySelector(
        `[data-download-files="${execution.id}"]`
      ) as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.innerHTML = `
          <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          DOWNLOADING...
        `;
      }

      let successCount = 0;
      let failCount = 0;

      // Download each file with enhanced debugging
      for (let i = 0; i < execution.generated_files.length; i++) {
        const fileUrl = execution.generated_files[i];

        console.log(
          `\n--- Processing file ${i + 1}/${
            execution.generated_files.length
          } ---`
        );
        console.log("File URL:", fileUrl);
        console.log("File URL type:", typeof fileUrl);

        if (!fileUrl) {
          console.warn(`Skipping empty file URL at index ${i}`);
          failCount++;
          continue;
        }

        try {
          // Convert Google Sheets URL to export format
          let downloadUrl = fileUrl;
          let filename = `file_${i + 1}_${Date.now()}`;

          if (fileUrl.includes("docs.google.com/spreadsheets/d/")) {
            // Extract the file ID from the URL
            const fileIdMatch = fileUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (fileIdMatch && fileIdMatch[1]) {
              const fileId = fileIdMatch[1];
              downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
              filename = `spreadsheet_${fileId.substring(0, 8)}_${i + 1}.xlsx`;
            }
          } else {
            // Try to extract filename from URL
            const urlParts = fileUrl.split("/");
            const lastPart = urlParts[urlParts.length - 1];
            if (lastPart && lastPart.includes(".")) {
              const baseName = lastPart.split("?")[0]; // Remove query parameters
              const nameParts = baseName.split(".");
              const extension = nameParts.pop();
              const nameWithoutExt = nameParts.join(".");
              filename = `${nameWithoutExt}_${i + 1}.${extension}`;
            } else {
              filename = `download_${i + 1}_${Date.now()}.xlsx`;
            }
          }

          console.log("Download URL:", downloadUrl);
          console.log("Filename:", filename);

          // Use enhanced download function
          const success = await downloadFileFromUrl(downloadUrl, filename);

          console.log(`Download result for file ${i + 1}:`, success);

          if (success) {
            successCount++;
            console.log(
              `✅ Successfully downloaded file ${i + 1}: ${filename}`
            );
          } else {
            failCount++;
            console.log(`❌ Download failed for file ${i + 1}:`, downloadUrl);
          }

          // Add a longer delay between downloads to ensure each download completes
          if (i < execution.generated_files.length - 1) {
            console.log(`Waiting 2 seconds before next download...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (fileError) {
          console.error(`Error downloading file ${i + 1}:`, fileError);
          failCount++;
        }
      }

      console.log(`\n=== DOWNLOAD SUMMARY ===`);
      console.log(`Total files processed: ${execution.generated_files.length}`);
      console.log(`Successful downloads: ${successCount}`);
      console.log(`Failed downloads: ${failCount}`);
      console.log("=== DOWNLOAD DEBUG END ===\n");

      // Show completion toast with success/failure info
      if (successCount > 0 && failCount === 0) {
        showToast(
          "success",
          "Files Downloaded Successfully",
          `Successfully downloaded ${successCount} file(s). Check your downloads folder.`
        );
      } else if (successCount > 0 && failCount > 0) {
        showToast(
          "warning",
          "Partial Download Success",
          `Downloaded ${successCount} file(s) successfully. ${failCount} file(s) failed.`
        );
      } else if (failCount > 0) {
        showToast(
          "error",
          "Download Failed",
          `Failed to download ${failCount} file(s). Please check console for details.`
        );
      } else {
        showToast(
          "error",
          "Download Failed",
          "No files could be downloaded. Please try again."
        );
      }
    } catch (error) {
      console.error("Error downloading files:", error);
      showToast(
        "error",
        "Download Failed",
        "An error occurred while downloading files. Please try again."
      );
    } finally {
      // Reset button state
      const downloadButton = document.querySelector(
        `[data-download-files="${execution.id}"]`
      ) as HTMLButtonElement;
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.innerHTML = `
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m0 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          DOWNLOAD FILES
        `;
      }
    }
  };

  // File upload utility function
  const uploadFileToSupabase = async (
    file: File,
    bucket: string,
    path: string
  ): Promise<string | null> => {
    try {
      const supabase = createClient();

      // Check if user is authenticated
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        console.error("Authentication error:", authError);
        throw new Error("User not authenticated");
      }

      console.log("Upload attempt:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        bucket,
        path,
        userId: currentUser.id,
      });

      // Generate unique filename with user ID for better organization
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${path}/${currentUser.id}/${fileName}`;

      console.log("Uploading to path:", filePath);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error);
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          cause: error.cause,
        });
        throw error;
      }

      console.log("Upload successful:", data);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      console.log("Public URL generated:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("Error in uploadFileToSupabase:", error);
      return null;
    }
  };

  // Handle workflow form submission
  const handleSubmitWorkflow = async () => {
    try {
      const supabase = createClient();

      // Show loading state
      const submitButton = document.querySelector(
        "[data-submit-button]"
      ) as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      // Prepare workflow data
      let sourceFileUrl = workflowFormData.sourceSheetUrl;
      let templateFileUrl = workflowFormData.templateSheetUrl;

      // Upload source file if user chose file upload
      if (
        workflowFormData.dataSourceType === "file" &&
        workflowFormData.uploadedFile
      ) {
        console.log("Uploading source file...");
        const uploadedSourceUrl = await uploadFileToSupabase(
          workflowFormData.uploadedFile,
          "workflow-files",
          "source-files"
        );

        if (!uploadedSourceUrl) {
          alert("Failed to upload source file. Please try again.");
          return;
        }
        sourceFileUrl = uploadedSourceUrl;
      }

      // Upload template file if user chose file upload
      if (
        workflowFormData.templateSourceType === "file" &&
        workflowFormData.uploadedTemplateFile
      ) {
        console.log("Uploading template file...");
        const uploadedTemplateUrl = await uploadFileToSupabase(
          workflowFormData.uploadedTemplateFile,
          "workflow-files",
          "template-files"
        );

        if (!uploadedTemplateUrl) {
          alert("Failed to upload template file. Please try again.");
          return;
        }
        templateFileUrl = uploadedTemplateUrl;
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
        status: "UNDER PROCESS",
        created_at: new Date().toISOString(),
      };

      // Insert workflow data into database
      const { data, error } = await supabase
        .from("workflows")
        .insert([workflowData])
        .select();

      if (error) {
        console.error("Error inserting workflow:", error);
        alert("Failed to submit workflow. Please try again.");
        return;
      }

      console.log("Workflow submitted successfully:", data);

      // Reset form and close modal
      resetWorkflowForm();

      // Refresh workflows list
      fetchWorkflows();
    } catch (error) {
      console.error("Error submitting workflow:", error);
      alert(
        "An error occurred while submitting the workflow. Please try again."
      );
    } finally {
      // Reset button state
      const submitButton = document.querySelector(
        "[data-submit-button]"
      ) as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Request";
      }
    }
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 4) {
      // Submit the form
      handleSubmitWorkflow();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetWorkflowForm = () => {
    setShowWorkflowForm(false);
    setCurrentStep(1);
    setWorkflowFormData({
      workflowName: "",
      brandName: "",
      marketplaceChannels: [],
      dataSourceType: "url",
      sourceSheetUrl: "",
      uploadedFile: null,
      templateSourceType: "url",
      templateSheetUrl: "",
      uploadedTemplateFile: null,
      requirements: "",
    });
  };

  // Define navigation items based on permissions
  const getNavigationItems = () => {
    const permissions = profile?.permissions || [];
    const items = [];

    // Dashboard is always available
    items.push({
      id: "dashboard",
      name: "Dashboard",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z"
          />
        </svg>
      ),
      permission: null,
    });

    // Create Listings - Show for users with ADD_TRIGGER_LISTING permission
    if (permissions.includes("ADD_TRIGGER_LISTING")) {
      items.push({
        id: "create-listings",
        name: "Create Listings",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        ),
        permission: "ADD_TRIGGER_LISTING",
      });
    }

    // Generated Files - Show for users with ADD_TRIGGER_LISTING permission
    if (permissions.includes("ADD_TRIGGER_LISTING")) {
      items.push({
        id: "generated-files",
        name: "Generated Files",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        permission: "ADD_TRIGGER_LISTING",
      });
    }

    // Workflows - Show for users with ADD_WORKFLOW_RAW_DATA permission
    if (permissions.includes("ADD_WORKFLOW_RAW_DATA")) {
      items.push({
        id: "workflows",
        name: "Workflows",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
        permission: "ADD_WORKFLOW_RAW_DATA",
      });
    }

    // Workflow Requests - Show for users with BUILD_WORKFLOW permission
    if (permissions.includes("BUILD_WORKFLOW")) {
      items.push({
        id: "workflow-requests",
        name: "Workflow Requests",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        ),
        permission: "BUILD_WORKFLOW",
      });
    }

    // Generated Files
    if (
      permissions.includes("view_files") ||
      permissions.includes("manage_files")
    ) {
      items.push({
        id: "generated-files",
        name: "Generated Files",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        permission: "view_files",
      });
    }

    // Clients - Show for users with VIEW_CLIENTS permission
    if (permissions.includes("VIEW_CLIENTS")) {
      items.push({
        id: "clients",
        name: "Clients",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        ),
        permission: "VIEW_CLIENTS",
      });
    }

    // Team Management - Show for users with ASSIGN_AND_APPROVE permission
    if (permissions.includes("ASSIGN_AND_APPROVE")) {
      items.push({
        id: "team",
        name: "Team",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
        permission: "ASSIGN_AND_APPROVE",
      });
    }

    // Account Settings is always available
    items.push({
      id: "account-settings",
      name: "Account Settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      permission: null,
    });

    return items;
  };

  const navigationItems = getNavigationItems();

  // Generate snow positions only on client side to avoid hydration mismatch
  const generateSnowFlakes = (count: number) => {
    if (!mounted) return [];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 12,
    }));
  };

  const generateLargeSnowFlakes = (count: number) => {
    if (!mounted) return [];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 15 + Math.random() * 20,
    }));
  };

  const smallSnowFlakes = generateSnowFlakes(80);
  const largeSnowFlakes = generateLargeSnowFlakes(20);

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
                  animationDuration: `${flake.duration}s`,
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
                  animationDuration: `${flake.duration}s`,
                }}
              />
            ))}
          </div>

          {/* Winter background elements */}
          <div className="absolute bottom-0 right-0 w-1/3 h-1/4 opacity-20">
            <svg viewBox="0 0 300 200" className="w-full h-full">
              <path
                d="M0 200 L50 150 L100 130 L150 110 L200 100 L250 110 L300 120 L300 200 Z"
                fill="currentColor"
                className="text-blue-200"
              />
              <path
                d="M150 110 L170 105 L190 110 L200 100 L210 110 L230 105 L250 110"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-screen">
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            aria-hidden="true"
          ></div>
        )}

        {/* Enhanced Sidebar with Better Animations */}
        <div
          className={`fixed inset-y-0 left-0 z-30 w-80 bg-gradient-to-b from-white/95 via-blue-50/90 to-purple-50/90 backdrop-blur-md border-r border-white/20 shadow-xl flex flex-col overflow-hidden transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Winter decorative elements with floating animation */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Animated subtle snow pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div
                className="absolute top-12 right-8 w-1 h-1 bg-blue-200 rounded-full animate-ping"
                style={{ animationDelay: "1s" }}
              ></div>
              <div
                className="absolute top-20 left-12 w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse"
                style={{ animationDelay: "2s" }}
              ></div>
              <div
                className="absolute top-32 right-6 w-1 h-1 bg-white rounded-full animate-ping"
                style={{ animationDelay: "3s" }}
              ></div>
              <div
                className="absolute top-48 left-8 w-2 h-2 bg-blue-100 rounded-full animate-pulse"
                style={{ animationDelay: "4s" }}
              ></div>
              <div
                className="absolute top-64 right-12 w-1 h-1 bg-purple-100 rounded-full animate-ping"
                style={{ animationDelay: "5s" }}
              ></div>
            </div>

            {/* Animated gradient overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-purple-100/20 animate-pulse"
              style={{ animationDuration: "4s" }}
            ></div>
          </div>

          {/* Logo with entrance animation */}
          <div className="p-6 relative z-10 animate-in fade-in-0 slide-in-from-top-4 duration-500 delay-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-in zoom-in-50 duration-600 delay-200">
                  <svg
                    className="w-7 h-7 text-white drop-shadow-sm transition-transform duration-300 hover:rotate-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent hover:from-[#5146E5] hover:to-[#7C3AED] transition-all duration-500">
                  Catsy
                </h1>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-600"
              >
                <span className="sr-only">Close sidebar</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Request New Workflow Button with enhanced animations */}
          {(profile?.permissions?.includes("create_workflow") ||
            profile?.permissions?.includes("request_workflow")) && (
            <div className="px-6 mb-6 relative z-10 animate-in fade-in-0 slide-in-from-top-4 duration-500 delay-300">
              <button className="w-full bg-gradient-to-r from-[#5146E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-[1.03] hover:-translate-y-0.5 ring-1 ring-white/20 hover:ring-white/40 group">
                <svg
                  className="w-5 h-5 drop-shadow-sm transition-transform duration-300 group-hover:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span className="drop-shadow-sm">Request New Workflow</span>
              </button>
            </div>
          )}

          {/* Navigation with staggered animations */}
          <nav className="flex-1 px-6 relative z-10 overflow-y-auto">
            <ul className="space-y-2">
              {navigationItems.map((item, index) => (
                <li
                  key={item.id}
                  className={`animate-in fade-in-0 slide-in-from-left-4 duration-500`}
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 group relative overflow-hidden ${
                      activeTab === item.id
                        ? "bg-gradient-to-r from-[#5146E5] to-[#7C3AED] text-white shadow-lg ring-1 ring-white/20 transform scale-[1.02] animate-in zoom-in-95 duration-300"
                        : "text-gray-700 hover:bg-white/40 hover:shadow-md hover:ring-1 hover:ring-white/30 hover:transform hover:scale-[1.01] hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Animated background for active state */}
                    {activeTab === item.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#5146E5]/20 to-[#7C3AED]/20 animate-pulse"></div>
                    )}

                    <div
                      className={`transition-all duration-300 relative z-10 ${
                        activeTab === item.id
                          ? "drop-shadow-sm transform scale-110"
                          : "group-hover:text-gray-800 group-hover:scale-110"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={`font-medium transition-all duration-300 relative z-10 ${
                        activeTab === item.id
                          ? "drop-shadow-sm"
                          : "group-hover:text-gray-800"
                      }`}
                    >
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
                <svg
                  className="w-5 h-5 text-white drop-shadow-sm transition-transform duration-300 hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate drop-shadow-sm hover:text-[#5146E5] transition-colors duration-300">
                  {user?.user_metadata?.first_name &&
                  user?.user_metadata?.last_name
                    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                    : user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-gray-600 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-red-600 transition-all duration-300 hover:bg-red-50 p-1.5 rounded-lg hover:shadow-md hover:scale-110 group"
                title="Sign Out"
              >
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-3 text-center animate-in fade-in-0 duration-500 delay-1000">
              <p className="text-xs text-gray-500 font-medium hover:text-[#5146E5] transition-colors duration-300">
                Built by Nexen Labs
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm lg:hidden">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16 border-b border-gray-200">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-gray-500 hover:text-gray-600"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <h2 className="text-lg font-medium text-gray-900 capitalize">
                  {activeTab.replace("-", " ")}
                </h2>
                <div>{/* Placeholder for actions */}</div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-8 flex-1">
            {activeTab === "dashboard" && (
              <>
                {/* Account Inactive Status Card */}
                {profile?.status === 0 && (
                  <div className="mb-8 bg-white rounded-xl shadow-sm border border-red-200 p-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                        <svg
                          className="w-8 h-8 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Account Inactive
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                        Your account is on hold or it&apos;s inactive, please
                        contact your admin to reactivate your account.
                      </p>
                      <div className="mt-6 inline-flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-full">
                        <svg
                          className="w-4 h-4 text-red-500 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium text-red-700">
                          Status: Account Inactive
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Role Status Card */}
                {profile?.role === "PENDING" && profile?.status !== 0 && (
                  <div className="mb-8 bg-white rounded-xl shadow-sm border border-amber-200 p-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
                        <svg
                          className="w-8 h-8 text-amber-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Role Assignment Pending
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                        Ping your admin to hook you up with a role — once
                        that&apos;s done, you&apos;ll be all set to rock your
                        responsibilities like a boss! 😎
                      </p>
                      <div className="mt-6 inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                        <svg
                          className="w-4 h-4 text-amber-500 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium text-amber-700">
                          Status: Awaiting Admin Approval
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Welcome Section */}
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back
                    {user?.user_metadata?.first_name
                      ? `, ${user.user_metadata.first_name}`
                      : ""}
                    !
                  </h2>
                  <p className="text-gray-600">
                    {user?.user_metadata?.organisation_name
                      ? `Managing ${user.user_metadata.organisation_name} - You are successfully authenticated and ready to explore.`
                      : "You are successfully authenticated and ready to explore."}
                  </p>
                  {/* {profile && (
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
                  )} */}
                </div>

                {/* Enhanced Stats Grid - CLIENT, PROVIDER specific or default */}
                {profile?.category === "CLIENT" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    {/* Enhanced Total Workflows Created */}
                    <div className="group relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                              Active
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                            Workflows Created
                          </h3>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                              {clientStats.loading ? (
                                <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600"></span>
                              ) : clientStats.error ? (
                                <span className="text-red-500 text-lg">
                                  Error
                                </span>
                              ) : (
                                clientStats.totalWorkflowsCreated
                              )}
                            </p>
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              +12%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>85%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "85%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Total Workflows Executed */}
                    <div className="group relative bg-gradient-to-br from-emerald-50 via-white to-emerald-50 rounded-2xl shadow-lg border border-emerald-100 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-white drop-shadow-sm"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                              Running
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-300">
                            Workflows Executed
                          </h3>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-4xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                              {clientStats.loading ? (
                                <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-4 border-emerald-600"></span>
                              ) : clientStats.error ? (
                                <span className="text-red-500 text-lg">
                                  Error
                                </span>
                              ) : (
                                clientStats.totalWorkflowsExecuted
                              )}
                            </p>
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              +8%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Success Rate</span>
                              <span>92%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "92%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Total Files Generated */}
                    <div className="group relative bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-2xl shadow-lg border border-purple-100 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                              Generated
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-300">
                            Files Generated
                          </h3>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-4xl font-black text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
                              {clientStats.loading ? (
                                <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-4 border-purple-600"></span>
                              ) : clientStats.error ? (
                                <span className="text-red-500 text-lg">
                                  Error
                                </span>
                              ) : (
                                clientStats.totalFilesGenerated
                              )}
                            </p>
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              +15%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Quality Score</span>
                              <span>96%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "96%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : profile?.category === "PROVIDER" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {/* Enhanced Total Organizations Onboarded */}
                    <div className="group relative bg-gradient-to-br from-emerald-50 via-white to-emerald-50 rounded-2xl shadow-lg border border-emerald-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-200/20 to-transparent rounded-full -translate-y-12 translate-x-12"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-7 h-7 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                          </div>
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                            Live
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-300">
                            Organizations
                          </h3>
                          <div className="flex items-baseline space-x-1">
                            <p className="text-3xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                              {providerStats.loading ? (
                                <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-3 border-emerald-600"></span>
                              ) : providerStats.error ? (
                                <span className="text-red-500 text-sm">
                                  Error
                                </span>
                              ) : (
                                providerStats.totalOrganizationsOnboarded - 1
                              )}
                            </p>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              +5%
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "78%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Total Workflows Created */}
                    <div className="group relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full -translate-y-12 translate-x-12"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-7 h-7 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                          </div>
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                            Active
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                            Workflows
                          </h3>
                          <div className="flex items-baseline space-x-1">
                            <p className="text-3xl font-black text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                              {providerStats.loading ? (
                                <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-3 border-blue-600"></span>
                              ) : providerStats.error ? (
                                <span className="text-red-500 text-sm">
                                  Error
                                </span>
                              ) : (
                                providerStats.totalWorkflowsCreated
                              )}
                            </p>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              +12%
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "85%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Total Workflows Executed */}
                    <div className="group relative bg-gradient-to-br from-green-50 via-white to-green-50 rounded-2xl shadow-lg border border-green-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-200/20 to-transparent rounded-full -translate-y-12 translate-x-12"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-7 h-7 text-white drop-shadow-sm"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                            Running
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-gray-800 group-hover:text-green-700 transition-colors duration-300">
                            Executed
                          </h3>
                          <div className="flex items-baseline space-x-1">
                            <p className="text-3xl font-black text-gray-900 group-hover:text-green-600 transition-colors duration-300">
                              {providerStats.loading ? (
                                <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-3 border-green-600"></span>
                              ) : providerStats.error ? (
                                <span className="text-red-500 text-sm">
                                  Error
                                </span>
                              ) : (
                                providerStats.totalWorkflowsExecuted
                              )}
                            </p>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              +8%
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "92%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Total Files Generated */}
                    <div className="group relative bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-2xl shadow-lg border border-purple-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full -translate-y-12 translate-x-12"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-7 h-7 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1 animate-pulse"></div>
                            Files
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-300">
                            Generated
                          </h3>
                          <div className="flex items-baseline space-x-1">
                            <p className="text-3xl font-black text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
                              {providerStats.loading ? (
                                <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-3 border-purple-600"></span>
                              ) : providerStats.error ? (
                                <span className="text-red-500 text-sm">
                                  Error
                                </span>
                              ) : (
                                providerStats.totalFilesGenerated
                              )}
                            </p>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              +15%
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "96%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {/* Enhanced Status Card */}
                    <div className="group relative bg-gradient-to-br from-green-50 via-white to-green-50 rounded-2xl shadow-lg border border-green-100 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="text-right">
                            <div
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                profile?.status === 1
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                                  profile?.status === 1
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              ></div>
                              {profile?.status === 1 ? "Active" : "Inactive"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-green-700 transition-colors duration-300">
                            Account Status
                          </h3>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-4xl font-black text-gray-900 group-hover:text-green-600 transition-colors duration-300">
                              {profile?.role === "PENDING"
                                ? "Pending"
                                : profile?.status === 1
                                ? "Active"
                                : "Inactive"}
                            </p>
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              Verified
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Profile Completion</span>
                              <span>95%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "95%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Role Card */}
                    <div className="group relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div className="text-right">
                            <div
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                profile?.role === "PENDING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                                  profile?.role === "PENDING"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                                }`}
                              ></div>
                              {profile?.role === "PENDING"
                                ? "Pending"
                                : "Assigned"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                            User Role
                          </h3>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors duration-300 capitalize">
                              {profileLoading ? (
                                <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600"></span>
                              ) : (
                                profile?.role || "User"
                              )}
                            </p>
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              +Access
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Permissions</span>
                              <span>
                                {profile?.permissions
                                  ? `${profile.permissions.length}`
                                  : "0"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-[#5146E5] to-[#7C3AED] h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  width: profile?.permissions
                                    ? `${Math.min(
                                        profile.permissions.length * 20,
                                        100
                                      )}%`
                                    : "0%",
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Member Since Card */}
                    <div className="group relative bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-2xl shadow-lg border border-purple-100 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                              Member
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-300">
                            Member Since
                          </h3>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-4xl font-black text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
                              {user?.created_at
                                ? new Date(user.created_at).toLocaleDateString(
                                    "en-US",
                                    { month: "short", year: "numeric" }
                                  )
                                : "N/A"}
                            </p>
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              Loyal
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Experience</span>
                              <span>Expert</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "88%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Category Card */}
                    <div className="group relative bg-gradient-to-br from-indigo-50 via-white to-indigo-50 rounded-2xl shadow-lg border border-indigo-100 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-8 h-8 text-white drop-shadow-sm"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></div>
                              Category
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-700 transition-colors duration-300">
                            User Category
                          </h3>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-4xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors duration-300 capitalize">
                              {profileLoading ? (
                                <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-4 border-indigo-600"></span>
                              ) : (
                                profile?.category || "Not Set"
                              )}
                            </p>
                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              +Type
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Setup Complete</span>
                              <span>100%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: "100%" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Permissions Section */}
                {/* {profile?.permissions && profile.permissions.length > 0 && (
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
                )} */}

                {/* Empty Permissions State */}
                {profile?.permissions && profile.permissions.length === 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Your Permissions
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="text-center py-8">
                        <svg
                          className="w-12 h-12 text-gray-400 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <p className="text-gray-500">
                          No permissions assigned to your role yet.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Team Management Section */}
            {activeTab === "team" && (
              <div className="space-y-6">
                {/* Team Management Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Team Management
                      </h2>
                      <p className="text-gray-600">
                        {profile?.category === "PROVIDER"
                          ? "Manage your internal and external team members"
                          : "Manage your team members"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Provider and Client Categories - Two Sections (Vertical Layout) */}
                {(profile?.category === "PROVIDER" ||
                  profile?.category === "CLIENT") && (
                  <div className="space-y-8">
                    {/* Internal Team Management Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            Team Management
                          </h3>
                          <p className="text-gray-600">
                            Manage your organization's employees
                          </p>
                        </div>
                      </div>

                      {/* Internal Team Statistics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600 font-medium">
                                Total Members
                              </p>
                              <p className="text-2xl font-bold text-blue-900">
                                {teamLoading ? "..." : stats.totalMembers}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-green-600 font-medium">
                                Active Members
                              </p>
                              <p className="text-2xl font-bold text-green-900">
                                {teamLoading ? "..." : stats.activeMembers}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-orange-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-orange-600 font-medium">
                                Pending Members
                              </p>
                              <p className="text-2xl font-bold text-orange-900">
                                {teamLoading ? "..." : stats.pendingMembers}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-purple-600 font-medium">
                                Roles
                              </p>
                              <p className="text-2xl font-bold text-purple-900">
                                {teamLoading ? "..." : stats.roles}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tab Navigation */}
                      <div className="mb-6">
                        <div className="border-b border-gray-200">
                          <nav className="-mb-px flex space-x-8">
                            <button
                              onClick={() => setInternalTeamTab("members")}
                              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                internalTeamTab === "members"
                                  ? "border-[#5146E5] text-[#5146E5]"
                                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                              }`}
                            >
                              Members
                            </button>
                            <button
                              onClick={() => setInternalTeamTab("roles")}
                              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                internalTeamTab === "roles"
                                  ? "border-[#5146E5] text-[#5146E5]"
                                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                              }`}
                            >
                              Roles and Responsibility
                            </button>
                          </nav>
                        </div>
                      </div>

                      {/* Tab Content */}
                      {internalTeamTab === "members" && (
                        <div className="bg-white rounded-lg border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Team Members
                            </h4>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Member
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {teamLoading ? (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      Loading team members...
                                    </td>
                                  </tr>
                                ) : teamMembers.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      No team members found in your
                                      organization.
                                    </td>
                                  </tr>
                                ) : (
                                  teamMembers.map((member, index) => {
                                    const initials = member.full_name
                                      ? member.full_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase()
                                      : member.email
                                          .substring(0, 2)
                                          .toUpperCase();

                                    const colors = [
                                      "bg-blue-500",
                                      "bg-green-500",
                                      "bg-purple-500",
                                      "bg-pink-500",
                                      "bg-indigo-500",
                                      "bg-yellow-500",
                                      "bg-red-500",
                                      "bg-gray-500",
                                    ];
                                    const avatarColor =
                                      colors[index % colors.length];

                                    const roleColors = {
                                      PENDING: "bg-yellow-100 text-yellow-800",
                                      ADMIN: "bg-red-100 text-red-800",
                                      MANAGER: "bg-blue-100 text-blue-800",
                                      DEVELOPER: "bg-green-100 text-green-800",
                                      DESIGNER: "bg-purple-100 text-purple-800",
                                      default: "bg-gray-100 text-gray-800",
                                    };

                                    const roleColor =
                                      roleColors[
                                        member.role?.toUpperCase() as keyof typeof roleColors
                                      ] || roleColors.default;

                                    return (
                                      <tr
                                        key={member.id}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div
                                              className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-medium`}
                                            >
                                              {initials}
                                            </div>
                                            <div className="ml-4">
                                              <div className="text-sm font-medium text-gray-900">
                                                {member.full_name ||
                                                  `${member.first_name || ""} ${
                                                    member.last_name || ""
                                                  }`.trim() ||
                                                  "Unknown"}
                                              </div>
                                              <div className="text-sm text-gray-500">
                                                ID: {member.id.substring(0, 8)}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {member.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColor}`}
                                          >
                                            {member.role || "No Role"}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                              member.status === 1
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                                          >
                                            <svg
                                              className="w-2 h-2 mr-1"
                                              fill="currentColor"
                                              viewBox="0 0 8 8"
                                            >
                                              <circle cx="4" cy="4" r="3" />
                                            </svg>
                                            {member.status === 1
                                              ? "Active"
                                              : "Inactive"}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(
                                            member.created_at
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={() =>
                                                handleAssignRole(member as any)
                                              }
                                              className="text-blue-600 hover:text-blue-900 font-medium"
                                            >
                                              Assign Role
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleToggleStatus(
                                                  member as any
                                                )
                                              }
                                              className={`font-medium ${
                                                member.status === 1
                                                  ? "text-red-600 hover:text-red-900"
                                                  : "text-green-600 hover:text-green-900"
                                              }`}
                                            >
                                              {member.status === 1
                                                ? "Deactivate"
                                                : "Activate"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {internalTeamTab === "roles" && (
                        <div className="bg-white rounded-lg border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Roles and Responsibilities
                            </h4>
                          </div>

                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {/* Admin Role */}
                              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <svg
                                      className="w-5 h-5 text-gray-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <h5 className="text-xl font-semibold text-gray-900">
                                      Admin
                                    </h5>
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-4">
                                  Full access to all features and team
                                  management
                                </p>

                                <div className="mb-4">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-3">
                                    Permissions:
                                  </h6>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Manage all team members
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Access all workflows and analytics
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Request new workflows
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Manage generated files
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Configure account settings
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Billing and subscription management
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Editor Role */}
                              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <svg
                                      className="w-5 h-5 text-gray-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <h5 className="text-xl font-semibold text-gray-900">
                                      Editor
                                    </h5>
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-4">
                                  Can manage workflows and access most features
                                </p>

                                <div className="mb-4">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-3">
                                    Permissions:
                                  </h6>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Manage existing workflows
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Request new workflows
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Access workflow analytics
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Download generated files
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        View team information
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Analyst Role */}
                              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-center space-x-3 mb-4">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <svg
                                      className="w-5 h-5 text-gray-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <h5 className="text-xl font-semibold text-gray-900">
                                      Analyst
                                    </h5>
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-4">
                                  Read-only access to workflows and analytics
                                </p>

                                <div className="mb-4">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-3">
                                    Permissions:
                                  </h6>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        View all workflows
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Access analytics and reports
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        Download generated files
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-700">
                                        View team information
                                      </span>
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
                    {profile?.category === "PROVIDER" && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">
                              Manage Admins
                            </h3>
                            <p className="text-gray-600">
                              Manage administrators from other organizations
                            </p>
                          </div>
                        </div>

                        {/* External Team Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-green-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm text-green-600 font-medium">
                                  Total Members
                                </p>
                                <p className="text-2xl font-bold text-green-900">
                                  {externalTeamLoading
                                    ? "..."
                                    : externalStats.totalMembers}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-emerald-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm text-emerald-600 font-medium">
                                  Active Members
                                </p>
                                <p className="text-2xl font-bold text-emerald-900">
                                  {externalTeamLoading
                                    ? "..."
                                    : externalStats.activeMembers}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-amber-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm text-amber-600 font-medium">
                                  Pending Members
                                </p>
                                <p className="text-2xl font-bold text-amber-900">
                                  {externalTeamLoading
                                    ? "..."
                                    : externalStats.pendingMembers}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-teal-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm text-teal-600 font-medium">
                                  Companies
                                </p>
                                <p className="text-2xl font-bold text-teal-900">
                                  {externalTeamLoading
                                    ? "..."
                                    : externalStats.companies}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* External Team Members Table */}
                        <div className="bg-white rounded-lg border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Admin Members
                            </h4>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Member
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Company
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {externalTeamLoading ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      Loading external team members...
                                    </td>
                                  </tr>
                                ) : externalTeamMembers.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      No external team members found.
                                    </td>
                                  </tr>
                                ) : (
                                  externalTeamMembers.map((member, index) => {
                                    const initials = member.full_name
                                      ? member.full_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase()
                                      : member.email
                                          .substring(0, 2)
                                          .toUpperCase();

                                    const colors = [
                                      "bg-indigo-500",
                                      "bg-pink-500",
                                      "bg-orange-500",
                                      "bg-teal-500",
                                      "bg-purple-500",
                                      "bg-cyan-500",
                                      "bg-emerald-500",
                                      "bg-rose-500",
                                    ];
                                    const avatarColor =
                                      colors[index % colors.length];

                                    const roleColors = {
                                      PENDING: "bg-yellow-100 text-yellow-800",
                                      ADMIN: "bg-red-100 text-red-800",
                                      MANAGER: "bg-blue-100 text-blue-800",
                                      DEVELOPER: "bg-green-100 text-green-800",
                                      DESIGNER: "bg-purple-100 text-purple-800",
                                      default: "bg-gray-100 text-gray-800",
                                    };

                                    const roleColor =
                                      roleColors[
                                        member.role?.toUpperCase() as keyof typeof roleColors
                                      ] || roleColors.default;

                                    return (
                                      <tr
                                        key={member.id}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div
                                              className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-medium`}
                                            >
                                              {initials}
                                            </div>
                                            <div className="ml-4">
                                              <div className="text-sm font-medium text-gray-900">
                                                {member.full_name ||
                                                  `${member.first_name || ""} ${
                                                    member.last_name || ""
                                                  }`.trim() ||
                                                  "Unknown"}
                                              </div>
                                              <div className="text-sm text-gray-500">
                                                ID: {member.id.substring(0, 8)}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {member.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {member.organization_id ? (
                                            <div>
                                              <div className="font-medium">
                                                {member.organization_name ||
                                                  "Unknown Organization"}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                ID:{" "}
                                                {member.organization_id.substring(
                                                  0,
                                                  8
                                                )}
                                              </div>
                                            </div>
                                          ) : (
                                            "No Organization"
                                          )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColor}`}
                                          >
                                            {member.role || "No Role"}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                              member.status === 1
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                                          >
                                            <svg
                                              className="w-2 h-2 mr-1"
                                              fill="currentColor"
                                              viewBox="0 0 8 8"
                                            >
                                              <circle cx="4" cy="4" r="3" />
                                            </svg>
                                            {member.status === 1
                                              ? "Active"
                                              : "Inactive"}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(
                                            member.created_at
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={() =>
                                                handleAssignRole(member as any)
                                              }
                                              className="text-blue-600 hover:text-blue-900 font-medium"
                                            >
                                              Assign Role
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleToggleStatus(
                                                  member as any
                                                )
                                              }
                                              className={`font-medium ${
                                                member.status === 1
                                                  ? "text-red-600 hover:text-red-900"
                                                  : "text-green-600 hover:text-green-900"
                                              }`}
                                            >
                                              {member.status === 1
                                                ? "Deactivate"
                                                : "Activate"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
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
                {profile?.category &&
                  profile.category !== "PROVIDER" &&
                  profile.category !== "CLIENT" && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Team Management
                        </h3>
                        <p className="text-gray-600">
                          Team management features are being configured for your
                          category: {profile.category}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Account Settings Section */}
            {activeTab === "account-settings" && (
              <div className="space-y-6">
                {/* Account Settings Header */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <svg
            className="w-4 h-4 sm:w-6 sm:h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-0.5 sm:mb-1">
            Account Settings
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-snug sm:leading-normal">
            Manage your account information and preferences
          </p>
        </div>
      </div>
    </div>

                {/* User Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* User Profile Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-full flex items-center justify-center shadow-lg">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Profile Information
                        </h3>
                        <p className="text-sm text-gray-500">
                          Your account details
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Full Name
                        </p>
                        <p className="text-gray-900">
                          {user?.user_metadata?.first_name &&
                          user?.user_metadata?.last_name
                            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                            : user?.email?.split("@")[0] || "Not Set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Email Address
                        </p>
                        <p className="text-gray-900">
                          {user?.email || "Not Available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Organization
                        </p>
                        <p className="text-gray-900">
                          {user?.user_metadata?.organisation_name || "Not Set"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role & Status Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Role & Status
                        </h3>
                        <p className="text-sm text-gray-500">
                          Your current permissions
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Current Role
                        </p>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                              profile?.role === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {profileLoading
                              ? "Loading..."
                              : profile?.role || "Not Assigned"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Account Status
                        </p>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                              profile?.status === 1
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            <svg
                              className="w-2 h-2 mr-2"
                              fill="currentColor"
                              viewBox="0 0 8 8"
                            >
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            {profile?.status === 1 ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Category
                        </p>
                        <p className="text-gray-900 capitalize">
                          {profileLoading
                            ? "Loading..."
                            : profile?.category || "Not Set"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account Details Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Account Details
                        </h3>
                        <p className="text-sm text-gray-500">
                          Membership information
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Member Since
                        </p>
                        <p className="text-gray-900">
                          {user?.created_at
                            ? new Date(user.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )
                            : "Not Available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Account ID
                        </p>
                        <p className="text-gray-900 font-mono text-sm">
                          {user?.id
                            ? user.id.substring(0, 8) + "..."
                            : "Not Available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Permissions
                        </p>
                        <p className="text-gray-900">
                          {profile?.permissions
                            ? `${profile.permissions.length} granted`
                            : "0 granted"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logout Section */}
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 sm:w-6 sm:h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5">
              Sign Out
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 leading-snug">
              Securely log out of your account
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
    </div>
            )}

            {/* Workflows Section */}
            {activeTab === "workflows" && (
              <div className="space-y-6">
                {/* Workflows Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <svg
              className="w-4 h-4 sm:w-6 sm:h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-0.5 sm:mb-1">
              Workflows
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-snug sm:leading-normal">
              Manage and create your workflow processes
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowWorkflowForm(true)}
          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-[#5146E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 text-sm sm:text-base"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="hidden sm:inline">Request New Workflow</span>
          <span className="sm:hidden">Request New Workflow</span>
        </button>
      </div>
    </div>

                {/* Workflows Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Your Workflows
                      </h3>
                      <div className="text-sm text-gray-500">
                        {workflows.length} workflow
                        {workflows.length !== 1 ? "s" : ""} found
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Workflow
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Marketplaces
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workflowsLoading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                                <span>Loading workflows...</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflowsError ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-red-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                  />
                                </svg>
                                <span>{workflowsError}</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 font-medium">
                                    No workflows found
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    Create your first workflow to get started
                                  </p>
                                </div>
                                <button
                                  onClick={() => setShowWorkflowForm(true)}
                                  className="px-4 py-2 bg-[#5146E5] hover:bg-[#4338CA] text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                  </svg>
                                  <span>Create Workflow</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          workflows.map((workflow) => {
                            const statusColors = {
                              ACTIVE: "bg-green-100 text-green-800",
                              INACTIVE: "bg-gray-100 text-gray-800",
                              "UNDER PROCESS": "bg-yellow-100 text-yellow-800",
                            };

                            const statusColor =
                              statusColors[
                                workflow.status as keyof typeof statusColors
                              ] || statusColors["UNDER PROCESS"];

                            return (
                              <tr
                                key={workflow.id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                      {workflow.workflow_name
                                        ? workflow.workflow_name
                                            .substring(0, 2)
                                            .toUpperCase()
                                        : "WF"}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {workflow.workflow_name ||
                                          "Unnamed Workflow"}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        ID: {workflow.id.substring(0, 8)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {workflow.brand_name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {workflow.user_id &&
                                  workflowUsers[workflow.user_id] ? (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        {workflowUsers[workflow.user_id]
                                          .full_name
                                          ? workflowUsers[
                                              workflow.user_id
                                            ].full_name
                                              .split(" ")
                                              .map((n: string) => n[0])
                                              .join("")
                                              .toUpperCase()
                                          : workflowUsers[workflow.user_id]
                                              .first_name &&
                                            workflowUsers[workflow.user_id]
                                              .last_name
                                          ? `${
                                              workflowUsers[workflow.user_id]
                                                .first_name[0]
                                            }${
                                              workflowUsers[workflow.user_id]
                                                .last_name[0]
                                            }`.toUpperCase()
                                          : workflowUsers[
                                              workflow.user_id
                                            ].email
                                              ?.substring(0, 2)
                                              .toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {workflowUsers[workflow.user_id]
                                            .full_name ||
                                            (workflowUsers[workflow.user_id]
                                              .first_name &&
                                            workflowUsers[workflow.user_id]
                                              .last_name
                                              ? `${
                                                  workflowUsers[
                                                    workflow.user_id
                                                  ].first_name
                                                } ${
                                                  workflowUsers[
                                                    workflow.user_id
                                                  ].last_name
                                                }`
                                              : "Unknown User")}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {
                                            workflowUsers[workflow.user_id]
                                              .email
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        ?
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          Unknown User
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {workflow.user_id
                                            ? `ID: ${workflow.user_id.substring(
                                                0,
                                                8
                                              )}`
                                            : "No user ID"}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                   <div className="flex flex-wrap gap-1">
                                    {workflow.marketplace_channels
                                      .map((channel: string) => (
                                        <span
                                          key={channel}
                                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                                        >
                                          {channel}
                                        </span>
                                      ))}
                                    
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}
                                  >
                                    {workflow.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(
                                    workflow.created_at
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Requests Section */}
            {activeTab === "workflow-requests" && (
              <div className="space-y-6">
                {/* Workflow Requests Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Workflow Requests
                      </h2>
                      <p className="text-gray-600">
                        Build and manage workflow processes
                      </p>
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
                            onClick={() =>
                              handleWorkflowRequestsTabChange("pending")
                            }
                            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                              workflowRequestsTab === "pending"
                                ? "border-[#5146E5] text-[#5146E5]"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            Pending Workflows
                          </button>
                          <button
                            onClick={() =>
                              handleWorkflowRequestsTabChange("all")
                            }
                            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                              workflowRequestsTab === "all"
                                ? "border-[#5146E5] text-[#5146E5]"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            All Workflows
                          </button>
                        </nav>
                      </div>
                      
                    </div>
                  </div>

                  {/* Workflows Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Source File URL
                          </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Template File URL
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Marketplaces
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workflowRequestsLoading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                                <span>Loading workflow requests...</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflowRequestsError ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-red-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                  />
                                </svg>
                                <span>{workflowRequestsError}</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflowRequests.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                    />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 font-medium">
                                    {workflowRequestsTab === "pending"
                                      ? "No pending workflows found"
                                      : "No workflow requests found"}
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    {workflowRequestsTab === "pending"
                                      ? "All workflows have been processed"
                                      : "No workflow requests have been created yet"}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          workflowRequests.map((workflow) => {
                            const statusColors = {
                              ACTIVE: "bg-green-100 text-green-800",
                              INACTIVE: "bg-gray-100 text-gray-800",
                              "UNDER PROCESS": "bg-yellow-100 text-yellow-800",
                            };

                            const statusColor =
                              statusColors[
                                workflow.status as keyof typeof statusColors
                              ] || statusColors["UNDER PROCESS"];

                            return (
                              <tr
                                key={workflow.id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                      {workflow.workflow_name
                                        ? workflow.workflow_name
                                            .substring(0, 2)
                                            .toUpperCase()
                                        : "WF"}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {workflow.workflow_name ||
                                          "Unnamed Workflow"}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        ID: {workflow.id.substring(0, 8)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {workflow.brand_name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {workflow.user_id &&
                                  workflowRequestUsers[workflow.user_id] ? (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        {workflowRequestUsers[workflow.user_id]
                                          ?.full_name
                                          ? workflowRequestUsers[
                                              workflow.user_id
                                            ].full_name
                                              .split(" ")
                                              .map((n: string) => n[0])
                                              .join("")
                                              .toUpperCase()
                                          : workflowRequestUsers[
                                              workflow.user_id
                                            ]?.first_name &&
                                            workflowRequestUsers[
                                              workflow.user_id
                                            ]?.last_name
                                          ? `${
                                              workflowRequestUsers[
                                                workflow.user_id
                                              ].first_name[0]
                                            }${
                                              workflowRequestUsers[
                                                workflow.user_id
                                              ].last_name[0]
                                            }`.toUpperCase()
                                          : workflowRequestUsers[
                                              workflow.user_id
                                            ]?.email
                                              ?.substring(0, 2)
                                              .toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {workflowRequestUsers[
                                            workflow.user_id
                                          ].full_name ||
                                            (workflowRequestUsers[
                                              workflow.user_id
                                            ].first_name &&
                                            workflowRequestUsers[
                                              workflow.user_id
                                            ].last_name
                                              ? `${
                                                  workflowRequestUsers[
                                                    workflow.user_id
                                                  ].first_name
                                                } ${
                                                  workflowRequestUsers[
                                                    workflow.user_id
                                                  ].last_name
                                                }`
                                              : "Unknown User")}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {
                                            workflowRequestUsers[
                                              workflow.user_id
                                            ].email
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        ?
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          Unknown User
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {workflow.user_id
                                            ? `ID: ${workflow.user_id.substring(
                                                0,
                                                8
                                              )}`
                                            : "No user ID"}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                   {workflow.source_file_url ? (
                                      <div className="flex items-center">
                                        <svg
                                          className="w-4 h-4 text-blue-500 mr-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                        <a
                                          href={workflow.source_file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          View Source File
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">
                                        Source File missing
                                      </span>
                                    )}
                                </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                   {workflow.template_file_url ? (
                                      <div className="flex items-center">
                                        <svg
                                          className="w-4 h-4 text-blue-500 mr-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                        <a
                                          href={workflow.template_file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          View Template File
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">
                                        Template File missing
                                      </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-wrap gap-1">
                                    {workflow.marketplace_channels
                                      .map((channel: string) => (
                                        <span
                                          key={channel}
                                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                                        >
                                          {channel}
                                        </span>
                                      ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}
                                  >
                                    {workflow.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(
                                    workflow.created_at
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    {workflowRequestsTab === "pending" &&
                                      workflow.status === "UNDER PROCESS" && (
                                        <button
                                          onClick={() =>
                                            handleMarkWorkflowAsDone(workflow)
                                          }
                                          className="text-green-600 hover:text-green-900 font-medium transition-colors duration-200 hover:bg-green-50 px-2 py-1 rounded"
                                        >
                                          Mark as Done
                                        </button>
                                      )}
                                    {workflowRequestsTab === "all" &&
                                      workflow.status !== "UNDER PROCESS" && (
                                        <button
                                          onClick={() =>
                                            handleMarkWorkflowAsDone(workflow)
                                          }
                                          className="text-orange-600 hover:text-orange-900 font-medium transition-colors duration-200 hover:bg-orange-50 px-2 py-1 rounded"
                                        >
                                          Update
                                        </button>
                                      )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Create Listings Section */}
            {activeTab === "create-listings" && (
              <div className="space-y-6">
                {/* Create Listings Header */}
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <svg
            className="w-4 h-4 sm:w-6 sm:h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-2xl font-semibold text-gray-900 mb-0.5 sm:mb-1">
            Create Listings
          </h2>
          <p className="text-xs sm:text-base text-gray-600 leading-snug sm:leading-relaxed">
            Your active workflows appear here, you can create
            listing of any one of them by just adding the workflow
            to queue.
          </p>
        </div>
      </div>
    </div>s

                {/* Workflows Table for Create Listings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Active Workflows
                      </h3>
                      <div className="text-sm text-gray-500">
                        {activeWorkflows.length} active workflow
                        {activeWorkflows.length !== 1 ? "s" : ""} available
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Workflow
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Marketplaces
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activeWorkflowsLoading ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                                <span>Loading active workflows...</span>
                              </div>
                            </td>
                          </tr>
                        ) : activeWorkflowsError ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-6 py-8 text-center text-red-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                  />
                                </svg>
                                <span>{activeWorkflowsError}</span>
                              </div>
                            </td>
                          </tr>
                        ) : activeWorkflows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 font-medium">
                                    No active workflows found
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    No active workflows available for creating
                                    listings
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          activeWorkflows.map((workflow) => {
                            const statusColors = {
                              ACTIVE: "bg-green-100 text-green-800",
                              INACTIVE: "bg-gray-100 text-gray-800",
                              "UNDER PROCESS": "bg-yellow-100 text-yellow-800",
                            };

                            const statusColor =
                              statusColors[
                                workflow.status as keyof typeof statusColors
                              ] || statusColors["UNDER PROCESS"];

                            return (
                              <tr
                                key={workflow.id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                      {workflow.workflow_name
                                        ? workflow.workflow_name
                                            .substring(0, 2)
                                            .toUpperCase()
                                        : "WF"}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {workflow.workflow_name ||
                                          "Unnamed Workflow"}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        ID: {workflow.id.substring(0, 8)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {workflow.brand_name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {workflow.user_id &&
                                  activeWorkflowUsers[workflow.user_id] ? (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        {activeWorkflowUsers[workflow.user_id]
                                          .full_name
                                          ? activeWorkflowUsers[
                                              workflow.user_id
                                            ].full_name
                                              .split(" ")
                                              .map((n: string) => n[0])
                                              .join("")
                                              .toUpperCase()
                                          : activeWorkflowUsers[
                                              workflow.user_id
                                            ].first_name &&
                                            activeWorkflowUsers[
                                              workflow.user_id
                                            ].last_name
                                          ? `${
                                              activeWorkflowUsers[
                                                workflow.user_id
                                              ].first_name[0]
                                            }${
                                              activeWorkflowUsers[
                                                workflow.user_id
                                              ].last_name[0]
                                            }`.toUpperCase()
                                          : activeWorkflowUsers[
                                              workflow.user_id
                                            ].email
                                              ?.substring(0, 2)
                                              .toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {activeWorkflowUsers[workflow.user_id]
                                            .full_name ||
                                            (activeWorkflowUsers[
                                              workflow.user_id
                                            ].first_name &&
                                            activeWorkflowUsers[
                                              workflow.user_id
                                            ].last_name
                                              ? `${
                                                  activeWorkflowUsers[
                                                    workflow.user_id
                                                  ].first_name
                                                } ${
                                                  activeWorkflowUsers[
                                                    workflow.user_id
                                                  ].last_name
                                                }`
                                              : "Unknown User")}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {
                                            activeWorkflowUsers[
                                              workflow.user_id
                                            ].email
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        ?
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          Unknown User
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {workflow.user_id
                                            ? `ID: ${workflow.user_id.substring(
                                                0,
                                                8
                                              )}`
                                            : "No user ID"}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-wrap gap-1">
                                    {workflow.marketplace_channels
                                      .map((channel: string) => (
                                        <span
                                          key={channel}
                                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                                        >
                                          {channel}
                                        </span>
                                      ))}
                                    
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}
                                  >
                                    {workflow.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(
                                    workflow.created_at
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() =>
                                        handleRunWorkflow(workflow)
                                      }
                                      className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                      <svg
                                        className="w-4 h-4 mr-2"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                      Add To Queue
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Run Workflows Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Run Workflows
                      </h3>
                      <div className="text-sm text-gray-500">
                        {workflowExecutions.length} execution
                        {workflowExecutions.length !== 1 ? "s" : ""} found
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Workflow
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Executed By/ QUEUED By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Template File
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Executed At / QUEUED At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workflowExecutionsLoading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                                <span>Loading workflow executions...</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflowExecutionsError ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-red-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                  />
                                </svg>
                                <span>{workflowExecutionsError}</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflowExecutions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 font-medium">
                                    No workflow executions found
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    No workflows have been executed yet
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          workflowExecutions.map((execution) => {
                            const workflow =
                              workflowExecutionWorkflows[execution.workflow_id];
                            const executedByUser =
                              workflowExecutionUsers[execution.executed_by];

                            return (
                              <tr
                                key={execution.id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                      {workflow?.workflow_name
                                        ? workflow.workflow_name
                                            .substring(0, 2)
                                            .toUpperCase()
                                        : "WF"}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {workflow?.workflow_name ||
                                          "Unknown Workflow"}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Brand:{" "}
                                        {workflow?.brand_name || "Unknown"}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {executedByUser ? (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        {executedByUser.full_name
                                          ? executedByUser.full_name
                                              .split(" ")
                                              .map((n: string) => n[0])
                                              .join("")
                                              .toUpperCase()
                                          : executedByUser.first_name &&
                                            executedByUser.last_name
                                          ? `${executedByUser.first_name[0]}${executedByUser.last_name[0]}`.toUpperCase()
                                          : executedByUser.email
                                              .substring(0, 2)
                                              .toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {executedByUser.full_name ||
                                            (executedByUser.first_name &&
                                            executedByUser.last_name
                                              ? `${executedByUser.first_name} ${executedByUser.last_name}`
                                              : "Unknown User")}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {executedByUser.email}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                        ?
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          Unknown User
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {execution.executed_by
                                            ? `ID: ${execution.executed_by.substring(
                                                0,
                                                8
                                              )}`
                                            : "No user ID"}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {execution.template_file ? (
                                    <div className="flex items-center">
                                      <svg
                                        className="w-4 h-4 text-blue-500 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                      <a
                                        href={execution.template_file}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        View Template
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">
                                      No template
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(
                                    execution.created_at
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {execution.status ? (
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        execution.status === "SUCCESS"
                                          ? "bg-green-100 text-green-800"
                                          : execution.status === "QUEUED"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : execution.status === "FAILED"
                                          ? "bg-red-100 text-red-800"
                                          : execution.status === "PENDING"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {execution.status}
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                      UNKNOWN
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center space-x-2">
                                    {execution.status === "QUEUED" && (
                                      <button
                                        onClick={() =>
                                          handleRunWorkflowExecution(execution)
                                        }
                                        data-run-execution={execution.id}
                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                      >
                                        <svg
                                          className="w-4 h-4 mr-2"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        RUN
                                      </button>
                                    )}
                                    {execution.status === "SUCCESS" && (
                                      <button
                                        onClick={() =>
                                          handleDownloadFiles(execution)
                                        }
                                        data-download-files={execution.id}
                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                      >
                                        <svg
                                          className="w-4 h-4 mr-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 10v6m0 0l-3-3m0 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                        DOWNLOAD FILES
                                      </button>
                                    )}
                                    {execution.status === "FAILED" && (
                                      <button
                                        onClick={() =>
                                          handleRunWorkflowExecution(execution)
                                        }
                                        data-run-execution={execution.id}
                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                      >
                                        <svg
                                          className="w-4 h-4 mr-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                          />
                                        </svg>
                                        RETRY
                                      </button>
                                    )}
                                    {(!execution.status ||
                                      (execution.status !== "QUEUED" &&
                                        execution.status !== "SUCCESS" &&
                                        execution.status !== "FAILED")) && (
                                      <button className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                                        <svg
                                          className="w-4 h-4 mr-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        VIEW STATUS
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Files Section */}
            {activeTab === "generated-files" && (
              <div className="space-y-6">
                {/* Generated Files Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Generated Files
                      </h2>
                      <p className="text-gray-600">
                        View and download all successfully generated files
                      </p>
                    </div>
                  </div>
                </div>

                {/* Generated Files Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Generated Files
                      </h3>
                      <div className="text-sm text-gray-500">
                        {
                          workflowExecutions.filter(
                            (exec) => exec.status === "SUCCESS"
                          ).length
                        }{" "}
                        successful execution
                        {workflowExecutions.filter(
                          (exec) => exec.status === "SUCCESS"
                        ).length !== 1
                          ? "s"
                          : ""}{" "}
                        found
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Workflow
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Executed By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Template File
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Executed At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workflowExecutionsLoading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                                <span>Loading generated files...</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflowExecutionsError ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-red-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                  />
                                </svg>
                                <span>{workflowExecutionsError}</span>
                              </div>
                            </td>
                          </tr>
                        ) : workflowExecutions.filter(
                            (exec) => exec.status === "SUCCESS"
                          ).length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 font-medium">
                                    No generated files found
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    No successful workflow executions have
                                    generated files yet
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          workflowExecutions
                            .filter(
                              (execution) => execution.status === "SUCCESS"
                            )
                            .map((execution) => {
                              const workflow =
                                workflowExecutionWorkflows[
                                  execution.workflow_id
                                ];
                              const executedByUser =
                                workflowExecutionUsers[execution.executed_by];

                              return (
                                <tr
                                  key={execution.id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                        {workflow?.workflow_name
                                          ? workflow.workflow_name
                                              .substring(0, 2)
                                              .toUpperCase()
                                          : "WF"}
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                          {workflow?.workflow_name ||
                                            "Unknown Workflow"}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          Brand:{" "}
                                          {workflow?.brand_name || "Unknown"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {executedByUser ? (
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                          {executedByUser.full_name
                                            ? executedByUser.full_name
                                                .split(" ")
                                                .map((n: string) => n[0])
                                                .join("")
                                                .toUpperCase()
                                            : executedByUser.first_name &&
                                              executedByUser.last_name
                                            ? `${executedByUser.first_name[0]}${executedByUser.last_name[0]}`.toUpperCase()
                                            : executedByUser.email
                                                .substring(0, 2)
                                                .toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">
                                            {executedByUser.full_name ||
                                              (executedByUser.first_name &&
                                              executedByUser.last_name
                                                ? `${executedByUser.first_name} ${executedByUser.last_name}`
                                                : "Unknown User")}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {executedByUser.email}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-xs mr-3">
                                          ?
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">
                                            Unknown User
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {execution.executed_by
                                              ? `ID: ${execution.executed_by.substring(
                                                  0,
                                                  8
                                                )}`
                                              : "No user ID"}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {execution.template_file ? (
                                      <div className="flex items-center">
                                        <svg
                                          className="w-4 h-4 text-blue-500 mr-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                        <a
                                          href={execution.template_file}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          View Template
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">
                                        No template
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(
                                      execution.created_at
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      SUCCESS
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() =>
                                          handleDownloadFiles(execution)
                                        }
                                        data-download-files={execution.id}
                                        className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                      >
                                        <svg
                                          className="w-4 h-4 mr-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 10v6m0 0l-3-3m0 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                        DOWNLOAD FILES
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Clients Section */}
            {activeTab === "clients" && (
              <div className="space-y-6">
                {/* Clients Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Clients
                      </h2>
                      <p className="text-gray-600">
                        View all onboarded organizations and their details
                      </p>
                    </div>
                  </div>
                </div>

                {/* Organizations Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Organizations Using our Product
                      </h3>
                      <div className="text-sm text-gray-500">
                        {organizations.length} organization
                        {organizations.length !== 1 ? "s" : ""} found
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date of Joining
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {organizationsLoading ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5146E5]"></div>
                                <span>Loading organizations...</span>
                              </div>
                            </td>
                          </tr>
                        ) : organizationsError ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-6 py-8 text-center text-red-500"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                  />
                                </svg>
                                <span>{organizationsError}</span>
                              </div>
                            </td>
                          </tr>
                        ) : organizations.length === 0 ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-6 py-8 text-center text-gray-500"
                            >
                              <div className="flex flex-col items-center space-y-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                  <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 font-medium">
                                    No organizations found
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    No organizations have been onboarded yet
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          organizations.map((organization) => (
                            <tr
                              key={organization.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                    {organization.name
                                      ? organization.name
                                          .substring(0, 2)
                                          .toUpperCase()
                                      : "ORG"}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {organization.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      ID: {organization.id.substring(0, 8)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(
                                  organization.created_at
                                ).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Other tab content placeholders */}
            {activeTab !== "dashboard" &&
              activeTab !== "team" &&
              activeTab !== "account-settings" &&
              activeTab !== "workflows" &&
              activeTab !== "workflow-requests" &&
              activeTab !== "create-listings" &&
              activeTab !== "generated-files" &&
              activeTab !== "clients" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 capitalize">
                      {activeTab.replace("-", " ")}
                    </h3>
                    <p className="text-gray-600">
                      This section is coming soon. Content for{" "}
                      {activeTab.replace("-", " ")} will be implemented here.
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
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative p-6 rounded-t-2xl text-white bg-gradient-to-r from-blue-500 to-indigo-600">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">
                      Assign Role
                    </h3>
                    <p className="text-white/80 text-sm">
                      Update member permissions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignRoleModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
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
                          <span className="text-sm font-medium text-gray-600">
                            Member:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {selectedMember.email}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">
                            Current Role:
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedMember.role === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : selectedMember.role
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {selectedMember.role || "No Role"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-800">
                      <span className="flex items-center space-x-2">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                        <span>Select New Role</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>

                    <div className="space-y-3">
                      {/* Role Options */}
                      {selectedMember &&
                      selectedMember.organization_id !==
                        profile?.organization_id ? (
                        // External team member roles
                        <>
                          {["ADMIN", "ANALYST", "EDITOR"].map((role) => (
                            <label
                              key={role}
                              className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                selectedRole === role
                                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg"
                                  : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name="role"
                                value={role}
                                checked={selectedRole === role}
                                onChange={(e) =>
                                  setSelectedRole(e.target.value)
                                }
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                                  selectedRole === role
                                    ? "border-blue-500 bg-blue-500 shadow-md"
                                    : "border-gray-300 group-hover:border-gray-400"
                                }`}
                              >
                                {selectedRole === role && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-base font-semibold text-gray-800">
                                    {role}
                                  </span>
                                  {selectedRole === role && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {role === "ADMIN" &&
                                    "Full access to manage organization and workflows"}
                                  {role === "ANALYST" &&
                                    "Read-only access to workflows and analytics"}
                                  {role === "EDITOR" &&
                                    "Can manage workflows and access most features"}
                                </p>
                              </div>
                            </label>
                          ))}
                        </>
                      ) : // Internal team member roles - different roles based on user category
                      profile?.category === "CLIENT" ? (
                        // CLIENT users can assign these roles to their internal team
                        <>
                          {["ADMIN", "ANALYST", "EDITOR"].map((role) => (
                            <label
                              key={role}
                              className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                selectedRole === role
                                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg"
                                  : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name="role"
                                value={role}
                                checked={selectedRole === role}
                                onChange={(e) =>
                                  setSelectedRole(e.target.value)
                                }
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                                  selectedRole === role
                                    ? "border-blue-500 bg-blue-500 shadow-md"
                                    : "border-gray-300 group-hover:border-gray-400"
                                }`}
                              >
                                {selectedRole === role && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-base font-semibold text-gray-800">
                                    {role}
                                  </span>
                                  {selectedRole === role && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {role === "ADMIN" &&
                                    "Full access to manage organization and workflows"}
                                  {role === "ANALYST" &&
                                    "Read-only access to workflows and analytics"}
                                  {role === "EDITOR" &&
                                    "Can manage workflows and access most features"}
                                </p>
                              </div>
                            </label>
                          ))}
                        </>
                      ) : (
                        // PROVIDER users can assign these roles to their internal team
                        <>
                          {["SUPER_ADMIN", "APPROVER", "BUILDER"].map(
                            (role) => (
                              <label
                                key={role}
                                className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                                  selectedRole === role
                                    ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg"
                                    : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="role"
                                  value={role}
                                  checked={selectedRole === role}
                                  onChange={(e) =>
                                    setSelectedRole(e.target.value)
                                  }
                                  className="sr-only"
                                />
                                <div
                                  className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                                    selectedRole === role
                                      ? "border-blue-500 bg-blue-500 shadow-md"
                                      : "border-gray-300 group-hover:border-gray-400"
                                  }`}
                                >
                                  {selectedRole === role && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-base font-semibold text-gray-800">
                                      {role}
                                    </span>
                                    {selectedRole === role && (
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {role === "SUPER_ADMIN" &&
                                      "Ultimate access to all system features and management"}
                                    {role === "APPROVER" &&
                                      "Can review and approve workflows and team actions"}
                                    {role === "BUILDER" &&
                                      "Can create and modify workflows and system configurations"}
                                  </p>
                                </div>
                              </label>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Confirmation Section */}
                  {selectedRole && (
                    <div className="rounded-xl p-4 border-l-4 bg-blue-50 border-blue-400 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg
                            className="w-3 h-3 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-800">
                            Ready to Assign Role
                          </p>
                          <p className="text-sm text-blue-700 mt-1">
                            {selectedMember.email} will be assigned the{" "}
                            <strong>{selectedRole}</strong> role with
                            corresponding permissions.
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
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
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
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div
              className={`relative p-6 rounded-t-2xl text-white ${
                actionType === "activate"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : "bg-gradient-to-r from-red-500 to-rose-600"
              }`}
            >
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    {actionType === "activate" ? (
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">
                      {actionType === "activate"
                        ? "Activate Account"
                        : "Deactivate Account"}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {actionType === "activate"
                        ? "Grant system access"
                        : "Revoke system access"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
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
                          <span className="text-sm font-medium text-gray-600">
                            Member:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {selectedMember.email}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">
                            Current Status:
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedMember.status === 1
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            <svg
                              className="w-2 h-2 mr-1"
                              fill="currentColor"
                              viewBox="0 0 8 8"
                            >
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            {selectedMember.status === 1
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl p-4 border-l-4 ${
                      actionType === "activate"
                        ? "bg-green-50 border-green-400"
                        : "bg-red-50 border-red-400"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          actionType === "activate"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {actionType === "activate" ? (
                          <svg
                            className="w-3 h-3 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3 h-3 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            actionType === "activate"
                              ? "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          {actionType === "activate"
                            ? "Confirm Account Activation"
                            : "Confirm Account Deactivation"}
                        </p>
                        <p
                          className={`text-sm mt-1 ${
                            actionType === "activate"
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {actionType === "activate"
                            ? "This user will regain full access to the system and all associated features."
                            : "This user will lose access to the system and will not be able to log in or perform any actions."}
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
                  actionType === "activate"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                }`}
              >
                {actionType === "activate" ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                )}
                <span>
                  {actionType === "activate"
                    ? "Activate Account"
                    : "Deactivate Account"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request New Workflow Modal */}
      {showWorkflowForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-[#5146E5] to-[#7C3AED] p-4 sm:p-8 text-white flex-shrink-0">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-5 h-5 sm:w-7 sm:h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-xl font-bold text-white drop-shadow-sm">
                      Request New Workflow
                    </h3>
                    <p className="text-white/80 text-xs mt-1">
                      Step {currentStep} of 4 - Let's create something amazing
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetWorkflowForm}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[
                  {
                    step: 1,
                    title: "Basic Info",
                    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                  },
                  {
                    step: 2,
                    title: "Data Source",
                    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                  },
                  {
                    step: 3,
                    title: "Upload Templates",
                    icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
                  },
                  {
                    step: 4,
                    title: "Describe Requirements",
                    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                  },
                ].map((item, index) => (
                  <div
                    key={item.step}
                    className="flex flex-col items-center relative"
                  >
                    <div
                      className={`relative w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300 ${
                        item.step <= currentStep
                          ? "bg-gradient-to-br from-[#5146E5] to-[#7C3AED] text-white shadow-lg scale-110"
                          : item.step === currentStep + 1
                          ? "bg-gradient-to-br from-blue-100 to-purple-100 text-[#5146E5] border-2 border-[#5146E5]/30"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {item.step <= currentStep ? (
                        <svg
                          className="w-3 h-3 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-3 h-3 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={item.icon}
                          />
                        </svg>
                      )}
                      {item.step === currentStep && (
                        <div className="absolute -inset-1 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-full animate-pulse opacity-30"></div>
                      )}
                    </div>
                    <span
                      className={`mt-1 sm:mt-2 text-xs font-medium transition-colors duration-200 text-center ${
                        item.step <= currentStep
                          ? "text-[#5146E5]"
                          : "text-gray-500"
                      }`}
                    >
                      {item.title}
                    </span>
                    {index < 3 && (
                      <div
                        className={`absolute top-4 sm:top-6 left-1/2 w-16 sm:w-24 h-0.5 -translate-y-1/2 transition-colors duration-300 ${
                          item.step < currentStep
                            ? "bg-gradient-to-r from-[#5146E5] to-[#7C3AED]"
                            : "bg-gray-200"
                        }`}
                        style={{ marginLeft: "16px", zIndex: -1 }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                {currentStep === 1 && (
                  <div className="space-y-6 sm:space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg
                          className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        Basic Information
                      </h4>
                      <p className="text-gray-600 max-w-md mx-auto text-sm">
                        Let's start with the essentials. Tell us about your
                        brand and where you want to sell.
                      </p>
                    </div>

                    {/* Workflow Name Field */}
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-[#5146E5]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span>Workflow Name</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={workflowFormData.workflowName}
                        onChange={(e) =>
                          handleWorkflowFormChange(
                            "workflowName",
                            e.target.value
                          )
                        }
                        placeholder="Enter a descriptive name for this workflow (e.g., Nike Summer Collection 2024)"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium text-sm shadow-sm hover:shadow-md"
                      />
                    </div>

                    {/* Brand Name Field */}
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-[#5146E5]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                          <span>Brand Name</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={workflowFormData.brandName}
                        onChange={(e) =>
                          handleWorkflowFormChange("brandName", e.target.value)
                        }
                        placeholder="Enter your brand name (e.g., Nike, Apple, etc.)"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium text-sm shadow-sm hover:shadow-md"
                      />
                    </div>

                    {/* Marketplace Channels Field */}
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-[#5146E5]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          <span>Marketplace Channels</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose where you want to showcase your products. You can
                        select multiple platforms.
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {[
                          {
                            name: "AMAZON",
                            icon: "🛒",
                            color: "from-orange-400 to-yellow-500",
                          },
                          {
                            name: "FLIPKART",
                            icon: "🛍️",
                            color: "from-blue-400 to-blue-600",
                          },
                          {
                            name: "MYNTRA",
                            icon: "👗",
                            color: "from-pink-400 to-red-500",
                          },
                          {
                            name: "MEESHO",
                            icon: "📱",
                            color: "from-green-400 to-emerald-500",
                          },
                          {
                            name: "SHOPIFY",
                            icon: "🏪",
                            color: "from-purple-400 to-indigo-500",
                          },
                        ].map((marketplace) => (
                          <label
                            key={marketplace.name}
                            className={`group relative flex items-center p-4 sm:p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                              workflowFormData.marketplaceChannels.includes(
                                marketplace.name
                              )
                                ? "border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg"
                                : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={workflowFormData.marketplaceChannels.includes(
                                marketplace.name
                              )}
                              onChange={() =>
                                handleMarketplaceToggle(marketplace.name)
                              }
                              className="sr-only"
                            />
                            <div
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                                workflowFormData.marketplaceChannels.includes(
                                  marketplace.name
                                )
                                  ? "border-[#5146E5] bg-[#5146E5] shadow-md"
                                  : "border-gray-300 group-hover:border-gray-400"
                              }`}
                            >
                              {workflowFormData.marketplaceChannels.includes(
                                marketplace.name
                              ) && (
                                <svg
                                  className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <span className="text-xl sm:text-2xl flex-shrink-0">
                                {marketplace.icon}
                              </span>
                              <span className="text-sm font-semibold text-gray-800 truncate">
                                {marketplace.name}
                              </span>
                            </div>
                            {workflowFormData.marketplaceChannels.includes(
                              marketplace.name
                            ) && (
                              <div className="absolute top-2 right-2">
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
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
                  <div className="space-y-6 sm:space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg
                          className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        Data Source
                      </h4>
                      <p className="text-gray-600 max-w-md mx-auto text-sm">
                        Connect your product data by providing a spreadsheet URL
                        or uploading a file.
                      </p>
                    </div>

                    {/* Data Source Type Selection */}
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-4">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-[#5146E5]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Choose Data Source Type</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        <label
                          className={`group relative flex items-center p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            workflowFormData.dataSourceType === "url"
                              ? "border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg"
                              : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="dataSourceType"
                            value="url"
                            checked={workflowFormData.dataSourceType === "url"}
                            onChange={(e) =>
                              handleWorkflowFormChange(
                                "dataSourceType",
                                e.target.value
                              )
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                              workflowFormData.dataSourceType === "url"
                                ? "border-[#5146E5] bg-[#5146E5] shadow-md"
                                : "border-gray-300 group-hover:border-gray-400"
                            }`}
                          >
                            {workflowFormData.dataSourceType === "url" && (
                              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-gray-800 block">
                                Sheet URL
                              </span>
                              <p className="text-xs text-gray-600">
                                Connect via Google Sheets or Excel Online
                              </p>
                            </div>
                          </div>
                          {workflowFormData.dataSourceType === "url" && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </label>

                        <label
                          className={`group relative flex items-center p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            workflowFormData.dataSourceType === "file"
                              ? "border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg"
                              : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="dataSourceType"
                            value="file"
                            checked={workflowFormData.dataSourceType === "file"}
                            onChange={(e) =>
                              handleWorkflowFormChange(
                                "dataSourceType",
                                e.target.value
                              )
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                              workflowFormData.dataSourceType === "file"
                                ? "border-[#5146E5] bg-[#5146E5] shadow-md"
                                : "border-gray-300 group-hover:border-gray-400"
                            }`}
                          >
                            {workflowFormData.dataSourceType === "file" && (
                              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-gray-800 block">
                                Upload File
                              </span>
                              <p className="text-xs text-gray-600">
                                Upload Excel, CSV, or JSON files
                              </p>
                            </div>
                          </div>
                          {workflowFormData.dataSourceType === "file" && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* URL Input */}
                    {workflowFormData.dataSourceType === "url" && (
                      <div className="bg-gray-50 rounded-xl p-4 sm:p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          <span className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-[#5146E5]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                            <span>Source Sheet URL</span>
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                          </div>
                          <input
                            type="url"
                            value={workflowFormData.sourceSheetUrl}
                            onChange={(e) =>
                              handleWorkflowFormChange(
                                "sourceSheetUrl",
                                e.target.value
                              )
                            }
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="w-full pl-10 sm:pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium text-sm shadow-sm hover:shadow-md"
                          />
                        </div>
                        <p className="mt-3 text-xs sm:text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                          💡 <strong>Tip:</strong> Make sure your spreadsheet is
                          publicly accessible or shared with appropriate
                          permissions.
                        </p>
                      </div>
                    )}

                    {/* File Upload */}
                    {workflowFormData.dataSourceType === "file" && (
                      <div className="bg-gray-50 rounded-xl p-4 sm:p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          <span className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-[#5146E5]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span>Upload Data File</span>
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="mt-2 flex justify-center px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:border-[#5146E5] hover:bg-[#5146E5]/5 transition-all duration-300 group">
                          <div className="space-y-2 text-center">
                            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <svg
                                className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                            </div>
                            <div className="flex flex-col sm:flex-row text-sm text-gray-700 items-center justify-center">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer bg-white rounded-lg px-3 py-2 font-semibold text-[#5146E5] hover:text-[#4338CA] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#5146E5] shadow-sm hover:shadow-md transition-all duration-200"
                              >
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
                              <p className="pl-0 sm:pl-2 self-center mt-1 sm:mt-0">
                                or drag and drop
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Excel (.xlsx, .xls), CSV, or JSON files up to 10MB
                            </p>
                            {workflowFormData.uploadedFile && (
                              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3 text-green-700">
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <span className="font-medium text-sm text-center break-all">
                                    {workflowFormData.uploadedFile.name}
                                  </span>
                                  <span className="text-xs sm:text-sm">
                                    (
                                    {(
                                      workflowFormData.uploadedFile.size /
                                      1024 /
                                      1024
                                    ).toFixed(2)}{" "}
                                    MB)
                                  </span>
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
                  <div className="space-y-6 sm:space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg
                          className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        Upload Templates
                      </h4>
                      <p className="text-gray-600 max-w-md mx-auto text-sm">
                        Provide your template files to customize the output
                        format and structure.
                      </p>
                    </div>

                    {/* Template Source Type Selection */}
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-4">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-[#5146E5]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span>Choose Template Source Type</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        <label
                          className={`group relative flex items-center p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            workflowFormData.templateSourceType === "url"
                              ? "border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg"
                              : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="templateSourceType"
                            value="url"
                            checked={
                              workflowFormData.templateSourceType === "url"
                            }
                            onChange={(e) =>
                              handleWorkflowFormChange(
                                "templateSourceType",
                                e.target.value
                              )
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                              workflowFormData.templateSourceType === "url"
                                ? "border-[#5146E5] bg-[#5146E5] shadow-md"
                                : "border-gray-300 group-hover:border-gray-400"
                            }`}
                          >
                            {workflowFormData.templateSourceType === "url" && (
                              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-gray-800 block">
                                Template URL
                              </span>
                              <p className="text-xs text-gray-600">
                                Connect via Google Sheets or Excel Online
                              </p>
                            </div>
                          </div>
                          {workflowFormData.templateSourceType === "url" && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </label>

                        <label
                          className={`group relative flex items-center p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            workflowFormData.templateSourceType === "file"
                              ? "border-[#5146E5] bg-gradient-to-br from-[#5146E5]/10 to-[#7C3AED]/10 shadow-lg"
                              : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="templateSourceType"
                            value="file"
                            checked={
                              workflowFormData.templateSourceType === "file"
                            }
                            onChange={(e) =>
                              handleWorkflowFormChange(
                                "templateSourceType",
                                e.target.value
                              )
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                              workflowFormData.templateSourceType === "file"
                                ? "border-[#5146E5] bg-[#5146E5] shadow-md"
                                : "border-gray-300 group-hover:border-gray-400"
                            }`}
                          >
                            {workflowFormData.templateSourceType === "file" && (
                              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-gray-800 block">
                                Upload Template
                              </span>
                              <p className="text-xs text-gray-600">
                                Upload Excel, CSV, or JSON templates
                              </p>
                            </div>
                          </div>
                          {workflowFormData.templateSourceType === "file" && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Template URL Input */}
                    {workflowFormData.templateSourceType === "url" && (
                      <div className="bg-gray-50 rounded-xl p-4 sm:p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          <span className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-[#5146E5]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                            <span>Template Sheet URL</span>
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                          </div>
                          <input
                            type="url"
                            value={workflowFormData.templateSheetUrl}
                            onChange={(e) =>
                              handleWorkflowFormChange(
                                "templateSheetUrl",
                                e.target.value
                              )
                            }
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium text-sm shadow-sm hover:shadow-md"
                          />
                        </div>
                        <p className="mt-3 text-xs sm:text-sm text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-200">
                          📋 <strong>Tip:</strong> Your template should contain
                          the desired output format and column structure for the
                          generated files.
                        </p>
                      </div>
                    )}

                    {/* Template File Upload */}
                    {workflowFormData.templateSourceType === "file" && (
                      <div className="bg-gray-50 rounded-xl p-4 sm:p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          <span className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-[#5146E5]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span>Upload Template File</span>
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <div className="mt-2 flex justify-center px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:border-[#5146E5] hover:bg-[#5146E5]/5 transition-all duration-300 group">
                          <div className="space-y-2 text-center">
                            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <svg
                                className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex flex-col sm:flex-row text-sm sm:text-base text-gray-700 items-center justify-center">
                              <label
                                htmlFor="template-file-upload"
                                className="relative cursor-pointer bg-white rounded-lg px-3 sm:px-4 py-2 font-semibold text-[#5146E5] hover:text-[#4338CA] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#5146E5] shadow-sm hover:shadow-md transition-all duration-200"
                              >
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
                              <p className="pl-0 sm:pl-2 self-center mt-1 sm:mt-0">
                                or drag and drop
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Template files: Excel (.xlsx, .xls), CSV, or JSON
                              up to 10MB
                            </p>
                            {workflowFormData.uploadedTemplateFile && (
                              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3 text-green-700">
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <span className="font-medium text-sm text-center break-all">
                                    {workflowFormData.uploadedTemplateFile.name}
                                  </span>
                                  <span className="text-xs sm:text-sm">
                                    (
                                    {(
                                      workflowFormData.uploadedTemplateFile
                                        .size /
                                      1024 /
                                      1024
                                    ).toFixed(2)}{" "}
                                    MB)
                                  </span>
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
                  <div className="space-y-6 sm:space-y-8 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5146E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg
                          className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        Describe Requirements
                      </h4>
                      <p className="text-gray-600 max-w-md mx-auto text-sm">
                        Tell us about your specific requirements, preferences,
                        and any special instructions for this workflow.
                      </p>
                    </div>

                    {/* Requirements Text Area */}
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-[#5146E5]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          <span>Requirements & Instructions</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <textarea
                        value={workflowFormData.requirements}
                        onChange={(e) =>
                          handleWorkflowFormChange(
                            "requirements",
                            e.target.value
                          )
                        }
                        placeholder="Please describe your requirements in detail. Include any specific formatting needs, data transformations, output preferences, or special instructions for this workflow..."
                        rows={5}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5146E5] focus:border-[#5146E5] transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white font-medium text-sm shadow-sm hover:shadow-md resize-vertical min-h-[120px]"
                      />
                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <p className="text-xs sm:text-sm text-gray-600">
                          Be as specific as possible to help us create the
                          perfect workflow for you.
                        </p>
                        <span className="text-xs text-gray-500">
                          {workflowFormData.requirements.length} characters
                        </span>
                      </div>
                    </div>

                    {/* Helpful Tips */}
                    <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">
                            What to include in your requirements:
                          </h5>
                          <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
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
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Step {currentStep}
                    </h4>
                    <p className="text-gray-600">
                      This step will be implemented next.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Modal Footer - Sticky at bottom */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between space-y-3 space-y-reverse sm:space-y-0 p-4 sm:p-8">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                  className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-none"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span>Previous</span>
                </button>

                <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <button
                    onClick={resetWorkflowForm}
                    className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNextStep}
                    data-submit-button
                    disabled={
                      (currentStep === 1 &&
                        (!workflowFormData.workflowName ||
                          !workflowFormData.brandName ||
                          workflowFormData.marketplaceChannels.length === 0)) ||
                      (currentStep === 2 &&
                        ((workflowFormData.dataSourceType === "url" &&
                          !workflowFormData.sourceSheetUrl) ||
                          (workflowFormData.dataSourceType === "file" &&
                            !workflowFormData.uploadedFile))) ||
                      (currentStep === 3 &&
                        ((workflowFormData.templateSourceType === "url" &&
                          !workflowFormData.templateSheetUrl) ||
                          (workflowFormData.templateSourceType === "file" &&
                            !workflowFormData.uploadedTemplateFile))) ||
                      (currentStep === 4 &&
                        !workflowFormData.requirements.trim())
                    }
                    className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-[#5146E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
                  >
                    <span>
                      {currentStep === 4 ? "Submit Request" : "Continue"}
                    </span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          currentStep === 4 ? "M5 13l4 4L19 7" : "M9 5l7 7-7 7"
                        }
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Done Modal */}
      {showMarkAsDoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative p-6 rounded-t-2xl text-white bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">
                      {selectedWorkflowForCompletion?.status === "UNDER PROCESS"
                        ? "Mark as Done"
                        : "Update Workflow"}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {selectedWorkflowForCompletion?.status === "UNDER PROCESS"
                        ? "Complete workflow processing"
                        : "Update workflow details"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMarkAsDoneModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
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
                        {selectedWorkflowForCompletion.brand_name
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">
                            Brand:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {selectedWorkflowForCompletion.brand_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">
                            ID:
                          </span>
                          <span className="text-sm text-gray-500 font-mono">
                            {selectedWorkflowForCompletion.id.substring(0, 8)}
                            ...
                          </span>
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
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          <span>Webhook URL</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="url"
                        value={markAsDoneFormData.webhookUrl}
                        onChange={(e) =>
                          handleMarkAsDoneFormChange(
                            "webhookUrl",
                            e.target.value
                          )
                        }
                        placeholder="https://example.com/webhook"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white"
                      />
                    </div>

                    {/* Status Field */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Status</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            markAsDoneFormData.status === "ACTIVE"
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="ACTIVE"
                            checked={markAsDoneFormData.status === "ACTIVE"}
                            onChange={(e) =>
                              handleMarkAsDoneFormChange(
                                "status",
                                e.target.value
                              )
                            }
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                markAsDoneFormData.status === "ACTIVE"
                                  ? "border-green-500 bg-green-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {markAsDoneFormData.status === "ACTIVE" && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span className="font-medium">ACTIVE</span>
                          </div>
                        </label>

                        <label
                          className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            markAsDoneFormData.status === "INACTIVE"
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="INACTIVE"
                            checked={markAsDoneFormData.status === "INACTIVE"}
                            onChange={(e) =>
                              handleMarkAsDoneFormChange(
                                "status",
                                e.target.value
                              )
                            }
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                markAsDoneFormData.status === "INACTIVE"
                                  ? "border-red-500 bg-red-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {markAsDoneFormData.status === "INACTIVE" && (
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
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>
                  {selectedWorkflowForCompletion?.status === "UNDER PROCESS"
                    ? "Mark as Done"
                    : "Update Workflow"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Workflow Modal */}
      {showRunWorkflowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative p-6 rounded-t-2xl text-white bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-sm">
                      Run Workflow
                    </h3>
                    <p className="text-white/80 text-sm">
                      Configure template and Run
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRunWorkflowModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
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
                        {selectedWorkflowForRun.workflow_name
                          ? selectedWorkflowForRun.workflow_name
                              .substring(0, 2)
                              .toUpperCase()
                          : "WF"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">
                            Workflow:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {selectedWorkflowForRun.workflow_name ||
                              "Unnamed Workflow"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-gray-600">
                            Brand:
                          </span>
                          <span className="text-sm text-gray-500">
                            {selectedWorkflowForRun.brand_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Source Type Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-800">
                      <span className="flex items-center space-x-2">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>Template Source</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label
                        className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          runWorkflowFormData.templateSourceType === "url"
                            ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                            : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="templateSourceType"
                          value="url"
                          checked={
                            runWorkflowFormData.templateSourceType === "url"
                          }
                          onChange={(e) =>
                            handleRunWorkflowFormChange(
                              "templateSourceType",
                              e.target.value
                            )
                          }
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                            runWorkflowFormData.templateSourceType === "url"
                              ? "border-green-500 bg-green-500 shadow-md"
                              : "border-gray-300 group-hover:border-gray-400"
                          }`}
                        >
                          {runWorkflowFormData.templateSourceType === "url" && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">
                              Template URL
                            </span>
                            <p className="text-xs text-gray-600">
                              Connect via Google Sheets or Excel Online
                            </p>
                          </div>
                        </div>
                        {runWorkflowFormData.templateSourceType === "url" && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>

                      <label
                        className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          runWorkflowFormData.templateSourceType === "file"
                            ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                            : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="templateSourceType"
                          value="file"
                          checked={
                            runWorkflowFormData.templateSourceType === "file"
                          }
                          onChange={(e) =>
                            handleRunWorkflowFormChange(
                              "templateSourceType",
                              e.target.value
                            )
                          }
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all duration-200 ${
                            runWorkflowFormData.templateSourceType === "file"
                              ? "border-green-500 bg-green-500 shadow-md"
                              : "border-gray-300 group-hover:border-gray-400"
                          }`}
                        >
                          {runWorkflowFormData.templateSourceType ===
                            "file" && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-orange-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">
                              Upload File
                            </span>
                            <p className="text-xs text-gray-600">
                              Upload Excel, CSV, or JSON files
                            </p>
                          </div>
                        </div>
                        {runWorkflowFormData.templateSourceType === "file" && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* URL Input */}
                  {runWorkflowFormData.templateSourceType === "url" && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          <span>Template URL</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </div>
                        <input
                          type="url"
                          value={runWorkflowFormData.templateUrl}
                          onChange={(e) =>
                            handleRunWorkflowFormChange(
                              "templateUrl",
                              e.target.value
                            )
                          }
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* File Upload */}
                  {runWorkflowFormData.templateSourceType === "file" && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">
                        <span className="flex items-center space-x-2">
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span>Upload Template File</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="mt-2 flex justify-center px-6 pt-6 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-500 hover:bg-green-50/50 transition-all duration-300 group">
                        <div className="space-y-2 text-center">
                          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>
                          <div className="flex text-sm text-gray-700">
                            <label
                              htmlFor="run-template-file-upload"
                              className="relative cursor-pointer bg-white rounded-lg px-3 py-2 font-semibold text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 shadow-sm hover:shadow-md transition-all duration-200"
                            >
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
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-medium text-sm">
                                  {runWorkflowFormData.templateFile.name}
                                </span>
                                <span className="text-xs">
                                  (
                                  {(
                                    runWorkflowFormData.templateFile.size /
                                    1024 /
                                    1024
                                  ).toFixed(2)}{" "}
                                  MB)
                                </span>
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
                  (runWorkflowFormData.templateSourceType === "url" &&
                    !runWorkflowFormData.templateUrl.trim()) ||
                  (runWorkflowFormData.templateSourceType === "file" &&
                    !runWorkflowFormData.templateFile)
                }
                className="px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Add To Execution Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-md w-full min-w-[400px] bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-in slide-in-from-right-4 duration-300 ${
              toast.type === "success"
                ? "border-l-4 border-green-500"
                : toast.type === "error"
                ? "border-l-4 border-red-500"
                : toast.type === "warning"
                ? "border-l-4 border-yellow-500"
                : "border-l-4 border-blue-500"
            }`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === "success" && (
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                  {toast.type === "error" && (
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  )}
                  {toast.type === "warning" && (
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                  )}
                  {toast.type === "info" && (
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => removeToast(toast.id)}
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
