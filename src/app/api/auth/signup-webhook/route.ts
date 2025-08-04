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

    // 1. Insert or fetch organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .upsert(
        { name: organisation_name },
        { onConflict: "name" }
      )
      .select()
      .single()

    if (orgError || !orgData) {
      console.error("Org Error:", orgError)
      return NextResponse.json({ error: "Org creation failed" }, { status: 500 })
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