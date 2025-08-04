import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function handlePostSignup(user: User, accessToken?: string) {
  try {
    console.log('Starting post-signup process for user:', user.id)
    console.log('User metadata:', user.user_metadata)

    const {
      id,
      email,
      user_metadata: {
        first_name,
        last_name,
        organisation_name
      }
    } = user

    if (!organisation_name) {
      console.error("Missing organisation_name in user metadata")
      throw new Error("Missing organisation_name")
    }

    // Create Supabase client with user's session if available
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : {}
      }
    })

    console.log('Checking if organization exists:', organisation_name)

    // 1. First, try to find existing organization
    const { data: existingOrg, error: findError } = await supabase
      .from("organizations")
      .select('*')
      .eq('name', organisation_name)
      .single()

    let orgData = null

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error checking for existing organization:", {
        message: findError.message,
        details: findError.details,
        hint: findError.hint,
        code: findError.code
      })
      throw new Error(`Organization lookup failed: ${findError.message}`)
    }

    if (existingOrg) {
      console.log('Found existing organization:', existingOrg.id)
      orgData = existingOrg
    } else {
      console.log('Organization does not exist, creating new one:', organisation_name)
      
      // 2. Create new organization if it doesn't exist
      const { data: newOrg, error: createError } = await supabase
        .from("organizations")
        .insert({ name: organisation_name })
        .select()
        .single()

      if (createError) {
        console.error("Organization Creation Error Details:", {
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        })
        throw new Error(`Organization creation failed: ${createError.message}`)
      }

      if (!newOrg) {
        console.error("No organization data returned after creation")
        throw new Error("Organization creation failed: No data returned")
      }

      console.log('New organization created successfully:', newOrg.id)
      orgData = newOrg
    }
    console.log('Attempting to create user profile...')

    // 2. Insert into profiles
    const profileData = {
      id,
      full_name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
      first_name: first_name ?? null,
      last_name: last_name ?? null,
      email: email ?? '',
      organization_id: orgData.id,
      role: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('Profile data to insert:', profileData)

    const { error: profileError, data: profileResult } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()

    if (profileError) {
      console.error("Profile Insert Error Details:", {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      })
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    console.log('Profile created successfully:', profileResult)

    return {
      success: true,
      organization_id: orgData.id,
      organization_name: orgData.name,
      profile_id: id
    }

  } catch (error) {
    console.error("Post-signup Error:", error)
    throw error
  }
}