import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MustCheckClient from './MustCheckClient'
import type { MustCheckItem } from '@/types'

export default async function MustCheckPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: items } = await supabase
    .from('must_check_items')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false }) as { data: MustCheckItem[] | null }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Must-Check</h2>
        <p className="text-sm text-slate-500 mt-0.5">대표가 직접 확인해야 하는 항목들입니다</p>
      </div>
      <MustCheckClient projectId={id} initialItems={items || []} />
    </div>
  )
}
