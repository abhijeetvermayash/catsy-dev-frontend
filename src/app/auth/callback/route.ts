import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  
  // Simply redirect to dashboard and let client-side handle the session
  // The URL fragment (#) contains the access token that client-side can process
  return NextResponse.redirect(`${origin}/dashboard`)
}