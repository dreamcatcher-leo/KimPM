import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RisksClient from './RisksClient'
import type { Risk } from '@/types'

export default async function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: risks } = await supabase
    .from('risks')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false }) as { data: Risk[] | null }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">리스크 대시보드</h2>
        <p className="text-sm text-slate-500 mt-0.5">감지된 리스크 항목을 관리하세요</p>
      </div>
      <RisksClient projectId={id} initialRisks={risks || []} />
    </div>
  )
}
