import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppSidebar from '@/components/layout/AppSidebar'
import TopBar from '@/components/layout/TopBar'
import type { Profile, Project } from '@/types'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileResult, projectResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('projects').select('*').eq('id', id).eq('founder_id', user.id).single(),
  ])
  const profile = profileResult.data as Profile | null
  const project = projectResult.data as Project | null

  if (!project) redirect('/dashboard')

  const [
    { count: mustChecks },
    { count: decisions },
  ] = await Promise.all([
    supabase.from('must_check_items').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('is_resolved', false),
    supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'pending'),
  ])

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar
        projectId={id}
        projectName={project.name}
        pendingMustChecks={mustChecks || 0}
        pendingDecisions={decisions || 0}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
