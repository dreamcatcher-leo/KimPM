import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { AccessLink, Project, Feature } from '@/types'
import VendorCalendarClient from './VendorCalendarClient'

export default async function VendorWeeklyPlanPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: link } = await admin
    .from('access_links')
    .select(`*, projects(*)`)
    .eq('token', token)
    .eq('is_active', true)
    .single() as { data: (AccessLink & { projects: Project }) | null }

  if (!link) redirect('/auth/login')

  const project = link.projects

  // 기능 목록 (spec_approved, in_progress, planning 전부 — 일정 배치 대상)
  const { data: features } = await admin
    .from('features')
    .select('id, order_key, name, priority_group, status, description')
    .eq('project_id', project.id)
    .order('order_key') as { data: Feature[] | null }

  // 기존 일정 (이 access_link가 입력한 것)
  const { data: schedules } = await admin
    .from('task_schedules' as 'features')
    .select('*')
    .eq('project_id', project.id)
    .order('start_date')
    .then(r => r, () => ({ data: [] }))

  return (
    <VendorCalendarClient
      token={token}
      project={project}
      features={(features || []) as Feature[]}
      schedules={schedules || []}
    />
  )
}
