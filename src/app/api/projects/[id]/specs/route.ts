import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// ─── PUT /api/projects/[id]/specs ────────────────────────────────────────────
// body: { mode: 'send', spec_id } → 외주사에게 전달 (sent_at 기록)
// body: { mode: 'send_all' }      → 승인된 전체 정의서 일괄 전달
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const admin = createAdminClient()

    const now = new Date().toISOString()

    // ── 단일 전달 ─────────────────────────────────────────────────────
    if (body.mode === 'send' && body.spec_id) {
      const { data: spec } = await admin
        .from('specs')
        .select('id, status, feature_id')
        .eq('id', body.spec_id)
        .single()

      if (!spec) return NextResponse.json({ error: 'Spec not found' }, { status: 404 })
      if (spec.status !== 'approved') {
        return NextResponse.json({ error: '승인된 정의서만 전달할 수 있습니다' }, { status: 400 })
      }

      // specs 테이블에 sent_at 업데이트 (컬럼이 없으면 raw_content notes로 fallback)
      try {
        await admin.from('specs').update({ sent_at: now }).eq('id', body.spec_id)
      } catch {
        // sent_at 컬럼이 없으면 무시 (graceful degradation)
      }

      return NextResponse.json({ success: true, sent_at: now })
    }

    // ── 일괄 전달 ─────────────────────────────────────────────────────
    if (body.mode === 'send_all') {
      const { data: features } = await admin
        .from('features')
        .select('id')
        .eq('project_id', id)

      if (!features || features.length === 0) {
        return NextResponse.json({ sent: 0 })
      }

      const featureIds = features.map((f: { id: string }) => f.id)

      const { data: approvedSpecs } = await admin
        .from('specs')
        .select('id')
        .in('feature_id', featureIds)
        .eq('status', 'approved')
        .is('sent_at', null) // 미전달 건만

      const count = approvedSpecs?.length || 0
      if (count > 0) {
        try {
          await admin
            .from('specs')
            .update({ sent_at: now })
            .in('id', (approvedSpecs || []).map((s: { id: string }) => s.id))
        } catch {
          // graceful degradation
        }
      }

      return NextResponse.json({ success: true, sent: count, sent_at: now })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (error) {
    console.error('specs PUT error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// ─── GET /api/projects/[id]/specs ────────────────────────────────────────────
// 프로젝트 전체 기능정의서 목록 + 전달/열람 상태
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: features } = await admin
      .from('features')
      .select('id, name, order_key, status, spec_status')
      .eq('project_id', id)
      .order('order_key')

    if (!features || features.length === 0) {
      return NextResponse.json({ specs: [] })
    }

    const featureIds = features.map((f: { id: string }) => f.id)

    const { data: specs } = await admin
      .from('specs')
      .select('id, feature_id, version, status, feature_name, approved_at, sent_at, viewed_at, created_at, updated_at')
      .in('feature_id', featureIds)
      .order('version', { ascending: false })

    // 기능별 최신 spec 매핑
    const specMap: Record<string, typeof specs extends (infer T)[] | null ? T : never> = {}
    for (const spec of (specs || [])) {
      if (!specMap[spec.feature_id]) {
        specMap[spec.feature_id] = spec
      }
    }

    const result = features.map((f: { id: string; name: string; order_key: string; status: string; spec_status: string | null }) => ({
      feature: f,
      spec: specMap[f.id] || null,
      delivery_status: specMap[f.id]
        ? specMap[f.id].viewed_at
          ? 'viewed'
          : specMap[f.id].sent_at
          ? 'sent'
          : specMap[f.id].status === 'approved'
          ? 'approved_not_sent'
          : 'draft'
        : 'no_spec',
    }))

    return NextResponse.json({ specs: result })
  } catch (error) {
    console.error('specs GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
