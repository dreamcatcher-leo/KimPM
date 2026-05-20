import { createAdminClient } from '@/lib/supabase/admin'
import QuestionsForm from './QuestionsForm'
import type { AccessLink, Project, Feature } from '@/types'

export default async function VendorQuestionsPage({
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

  if (!link) return <div>유효하지 않은 링크</div>

  const { data: features } = await admin
    .from('features')
    .select('id, order_key, name')
    .eq('project_id', link.project_id)
    .in('status', ['spec_approved', 'in_progress'])
    .order('order_key') as { data: Feature[] | null }

  const { data: myQuestions } = await admin
    .from('questions')
    .select('*')
    .eq('access_link_id', link.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">질문 등록</h1>
      <p className="text-sm text-slate-500 mb-6">개발 중 궁금한 점을 남겨주세요</p>
      <QuestionsForm
        projectId={link.project_id}
        accessLinkId={link.id}
        features={features || []}
        existingQuestions={myQuestions || []}
        token={token}
      />
    </div>
  )
}
