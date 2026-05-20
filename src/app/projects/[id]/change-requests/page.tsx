import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChangeRequestsClient from './ChangeRequestsClient'

export default async function ChangeRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: changeRequests } = await supabase
    .from('change_requests')
    .select(`
      *,
      features(order_key, name, priority)
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">변경 요청</h1>
        <p className="text-sm text-gray-500 mt-1">
          외주사가 제출한 변경 요청을 검토하고 승인/반려 처리합니다.
        </p>
      </div>
      <ChangeRequestsClient
        projectId={id}
        initialChangeRequests={changeRequests || []}
      />
    </div>
  )
}
