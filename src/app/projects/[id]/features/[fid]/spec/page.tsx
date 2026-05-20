import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SpecPageClient from './SpecPageClient'
import type { Feature, Spec } from '@/types'

export default async function SpecPage({
  params,
}: {
  params: Promise<{ id: string; fid: string }>
}) {
  const { id, fid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: feature } = await supabase
    .from('features')
    .select(`*, projects(name, goal)`)
    .eq('id', fid)
    .eq('project_id', id)
    .single() as { data: (Feature & { projects: { name: string; goal: string } }) | null }

  if (!feature) redirect(`/projects/${id}/features`)

  const { data: spec } = await supabase
    .from('specs')
    .select('*')
    .eq('feature_id', fid)
    .order('version', { ascending: false })
    .limit(1)
    .single() as { data: Spec | null }

  return (
    <SpecPageClient
      projectId={id}
      feature={feature}
      spec={spec}
    />
  )
}
