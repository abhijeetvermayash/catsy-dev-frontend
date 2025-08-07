import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract user data from the webhook payload
    const { record: user } = body
    
    if (!user) {
      return NextResponse.json({ error: "No user data provided" }, { status: 400 })
    }

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
      return NextResponse.json({ error: "Missing organisation_name" }, { status: 400 })
    }

    // Normalize organization name: trim spaces and convert to uppercase for comparison
    const normalizedOrgName = organisation_name.trim()
    const normalizedOrgNameUpper = normalizedOrgName.toUpperCase()

    if (!normalizedOrgName) {
      return NextResponse.json({ error: "Organisation name cannot be empty" }, { status: 400 })
    }

    // 1. Check if organization already exists (case-insensitive)
    const { data: existingOrg, error: searchError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .ilike("name", normalizedOrgNameUpper)
      .single()

    let orgData

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Organization search error:", searchError)
      return NextResponse.json({ error: "Organization lookup failed" }, { status: 500 })
    }

    if (existingOrg) {
      // Organization exists, use it
      orgData = existingOrg
      console.log(`Using existing organization: ${existingOrg.name} (ID: ${existingOrg.id})`)
    } else {
      // Organization doesn't exist, create new one with normalized name
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({ name: normalizedOrgName })
        .select()
        .single()

      if (orgError || !newOrg) {
        console.error("Organization creation error:", orgError)
        return NextResponse.json({ error: "Organization creation failed" }, { status: 500 })
      }

      orgData = newOrg
      console.log(`Created new organization: ${newOrg.name} (ID: ${newOrg.id})`)
    }

    // 2. Insert into profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id,
        full_name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        email,
        organization_id: orgData.id,
        role: "PENDING",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error("Profile Insert Error:", profileError)
      return NextResponse.json({ error: "Profile creation failed" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Organization and profile created successfully",
      organization_id: orgData.id 
    })

  } catch (error) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}