import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import PrivateNotesClient from './PrivateNotesClient'

export default async function PrivateNotesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: link } = await admin
    .from('access_links')
    .select('*, projects(id, name)')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!link) redirect('/')

  const project = link.projects as { id: string; name: string } | null
  if (!project) redirect('/')

  // 기존 비공개 메모 조회
  const { data: notes } = await admin
    .from('vendor_private_notes')
    .select('*')
    .eq('access_link_id', link.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">비공개 메모</h1>
        <p className="text-sm text-gray-500 mt-1">
          외주사 내부용 메모입니다. Founder에게는 공개되지 않습니다.
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded-full">
          <span>🔒</span>
          <span>이 메모는 외주사만 볼 수 있습니다</span>
        </div>
      </div>
      <PrivateNotesClient
        projectId={project.id}
        accessLinkId={link.id}
        token={token}
        initialNotes={notes || []}
      />
    </div>
  )
}
