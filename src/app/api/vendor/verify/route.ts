import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: link } = await admin
    .from('access_links')
    .select(`*, projects(*)`)
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!link) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 403 })
  }

  // Get approved specs
  const { data: features } = await admin
    .from('features')
    .select('id')
    .eq('project_id', link.project_id)

  const featureIds = features?.map(f => f.id) || []
  const { data: specs } = featureIds.length > 0
    ? await admin.from('specs').select(`*, features(order_key, name)`).eq('status', 'approved').in('feature_id', featureIds)
    : { data: [] }

  return NextResponse.json({
    access_link: link,
    project: link.projects,
    approved_specs: specs || [],
  })
}
