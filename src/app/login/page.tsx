"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const authError = searchParams.get("error")
  const errorMessage = searchParams.get("message")
  const supabase = createClient()

  async function handleGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleMagicLink() {
    if (!email) return
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">
            to save and manage your teams
          </p>
        </div>

        {authError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage || "Sign in failed. Try again or use a different method."}
          </div>
        )}

        <Button onClick={handleGitHub} className="w-full" size="lg">
          Continue with GitHub
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {sent ? (
          <p className="text-center text-sm text-muted-foreground">
            Check your email for a login link.
          </p>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              onClick={handleMagicLink}
              variant="outline"
              className="w-full"
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Send magic link"}
            </Button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/login" className="underline hover:text-foreground">
            Signing in creates one automatically.
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
