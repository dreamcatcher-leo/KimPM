import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeaturesClient from './FeaturesClient'
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

  const { data: features } = await supabase
    .from('features')
    .select('*')
    .eq('project_id', id)
    .order('order_key') as { data: Feature[] | null }

  return <FeaturesClient projectId={id} initialFeatures={features || []} />
}
