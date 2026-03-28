import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error_param = searchParams.get("error")
  const error_description = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/my-teams"

  // Supabase/GitHub may redirect back with an error in the query params
  if (error_param) {
    console.error("[auth/callback] OAuth error:", error_param, error_description)
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("error", error_param)
    if (error_description) loginUrl.searchParams.set("message", error_description)
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    console.error("[auth/callback] Code exchange failed:", error.message)
  }

  return NextResponse.redirect(new URL("/login?error=auth", request.url))
}
