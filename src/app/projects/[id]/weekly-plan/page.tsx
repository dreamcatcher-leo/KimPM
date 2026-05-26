import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import FounderWeeklyPlanViewer from './FounderWeeklyPlanViewer'
import type { Feature } from '@/types'

export default async function WeeklyPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const [{ data: project }, { data: features }, { data: schedules }] = await Promise.all([
    supabase.from('projects').select('id, name, contract_start, contract_end').eq('id', id).single(),
    admin.from('features').select('id, order_key, name, priority_group, status').eq('project_id', id).order('order_key'),
    // task_schedules 조회 (테이블 없으면 빈 배열)
    admin.from('task_schedules' as 'features').select('*').eq('project_id', id).order('start_date').then(
      res => res,
      () => ({ data: [], error: null })
    ),
  ])

  return (
    <div className="p-6">
      <FounderWeeklyPlanViewer
        projectId={id}
        project={project}
        features={(features || []) as Feature[]}
        schedules={schedules || []}
      />
    </div>
  )
}
