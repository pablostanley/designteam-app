"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm">
          Sign in
        </Button>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/my-teams"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        My Teams
      </Link>
      <button
        onClick={async () => {
          await supabase.auth.signOut()
          window.location.href = "/"
        }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  )
}
