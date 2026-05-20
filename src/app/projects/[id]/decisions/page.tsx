import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DecisionsClient from './DecisionsClient'
import type { Decision } from '@/types'

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: decisions } = await supabase
    .from('decisions')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false }) as { data: Decision[] | null }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">의사결정함</h2>
        <p className="text-sm text-slate-500 mt-0.5">대표가 승인/반려해야 하는 항목들</p>
      </div>
      <DecisionsClient projectId={id} initialDecisions={decisions || []} />
    </div>
  )
}
