import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SidebarWrapper from '@/components/layout/SidebarWrapper'
import type { Profile, Project } from '@/types'
import type { ProjectSummary } from '@/components/layout/AppSidebar'

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

  const [profileResult, projectResult, allProjectsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('projects').select('*').eq('id', id).eq('founder_id', user.id).single(),
    supabase.from('projects').select('id, name, status').eq('founder_id', user.id).order('created_at', { ascending: false }),
  ])
  const profile = profileResult.data as Profile | null
  const project = projectResult.data as Project | null
  const allProjects = allProjectsResult.data || []

  if (!project) redirect('/dashboard')

  // 현재 프로젝트 알림 카운트
  const [
    { count: mustChecks },
    { count: decisions },
    { count: risks },
  ] = await Promise.all([
    supabase.from('must_check_items').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('is_resolved', false),
    supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('status', 'pending'),
    supabase.from('risks').select('*', { count: 'exact', head: true }).eq('project_id', id).eq('is_resolved', false),
  ])

  // 각 프로젝트별 알림 카운트 (스위처 배지용) — 병렬 조회
  const projectsWithCounts: ProjectSummary[] = await Promise.all(
    allProjects.map(async (p) => {
      if (p.id === id) {
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          mustChecks: mustChecks || 0,
          decisions: decisions || 0,
          risks: risks || 0,
        }
      }
      const [{ count: mc }, { count: dc }, { count: rc }] = await Promise.all([
        supabase.from('must_check_items').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('is_resolved', false),
        supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'pending'),
        supabase.from('risks').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('is_resolved', false),
      ])
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        mustChecks: mc || 0,
        decisions: dc || 0,
        risks: rc || 0,
      }
    })
  )

  return (
    <SidebarWrapper
      projectId={id}
      projectName={project.name}
      pendingMustChecks={mustChecks || 0}
      pendingDecisions={decisions || 0}
      pendingRisks={risks || 0}
      projects={projectsWithCounts}
      profile={profile}
    >
      {children}
    </SidebarWrapper>
  )
}
