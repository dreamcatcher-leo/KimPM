import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeaturesClient from './FeaturesClient'
import SpecDeliveryPanel from '@/components/features/SpecDeliveryPanel'
import type { Feature } from '@/types'

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: features }, { data: accessLinks }] = await Promise.all([
    supabase
      .from('features')
      .select('*')
      .eq('project_id', id)
      .order('order_key'),
    supabase
      .from('access_links')
      .select('token')
      .eq('project_id', id)
      .eq('is_active', true)
      .limit(1),
  ])

  const vendorToken = accessLinks?.[0]?.token || undefined

  return (
    <div>
      {/* 기능정의서 전달 현황 패널 — features 콘텐츠 상단 */}
      <div className="px-6 pt-6">
        <SpecDeliveryPanel
          projectId={id}
          vendorToken={vendorToken}
        />
      </div>
      {/* 기능 목록 (자체 p-6 있음) */}
      <FeaturesClient projectId={id} initialFeatures={(features || []) as Feature[]} />
    </div>
  )
}
