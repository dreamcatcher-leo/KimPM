import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OverviewClient from './OverviewClient'
import type { Project, MustCheckItem, Decision, Risk, Report, Feature } from '@/types'

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; item?: string }>
}) {
  const { id } = await params
  const { tab, item } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single() as { data: Project | null }

  if (!project) redirect('/dashboard')

  // 전체 데이터 병렬 조회
  const [
    { data: mustCheckItems },
    { data: decisions },
    { data: risks },
    { data: reports },
    { data: features },
  ] = await Promise.all([
    supabase.from('must_check_items').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('decisions').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('risks').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('reports').select('*, daily_assessments(*)').eq('project_id', id).order('report_date', { ascending: false }).limit(20),
    supabase.from('features').select('*').eq('project_id', id).order('order_key'),
  ])

  return (
    <OverviewClient
      project={project}
      projectId={id}
      initialTab={tab || 'must-check'}
      initialItem={item || null}
      mustCheckItems={(mustCheckItems || []) as MustCheckItem[]}
      decisions={(decisions || []) as Decision[]}
      risks={(risks || []) as Risk[]}
      reports={(reports || []) as Report[]}
      features={(features || []) as Feature[]}
    />
  )
}
