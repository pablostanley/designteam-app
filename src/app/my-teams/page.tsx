import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"

export default async function MyTeamsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: teams } = await supabase
    .from("teams")
    .select("id, short_id, name, agent_count, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold">
            Design Team
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/build">
              <Button size="sm">New Team</Button>
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">My Teams</h1>
        <p className="text-muted-foreground mt-1">
          {teams?.length ?? 0} team{teams?.length !== 1 ? "s" : ""}
        </p>

        <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team) => (
            <Link
              key={team.id}
              href={`/team/${team.short_id}`}
              className="block border rounded-lg p-4 hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold">{team.name}</h3>
              <p className="text-sm text-muted-foreground">
                {team.agent_count} agent{team.agent_count !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(team.updated_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
          {(!teams || teams.length === 0) && (
            <p className="text-muted-foreground col-span-full">
              No teams yet.{" "}
              <Link href="/build" className="underline">
                Build your first team.
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
