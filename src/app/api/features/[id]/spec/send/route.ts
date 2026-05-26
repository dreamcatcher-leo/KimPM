// 대표 → 외주사: 기능 정의서 전송 (sent_at 기록)
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // 최신 spec 조회 (draft 또는 approved)
    const { data: spec } = await admin
      .from('specs')
      .select('id, status, sent_at')
      .eq('feature_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (!spec) return NextResponse.json({ error: '정의서가 없습니다' }, { status: 404 })

    const now = new Date().toISOString()

    // sent_at 기록 (재전송 허용)
    const { error } = await admin
      .from('specs')
      .update({ sent_at: now })
      .eq('id', spec.id)

    if (error) {
      // sent_at 컬럼이 없으면 무시하고 성공 처리
      if (error.code === '42703') {
        return NextResponse.json({ success: true, warning: 'sent_at 컬럼 없음 — Supabase에서 추가 필요' })
      }
      throw error
    }

    // feature status를 spec_approved 이전 상태로 되돌리지 않고 그대로 유지
    // vendor가 볼 수 있도록 feature 조회 허용 (spec_approved 상태여야 외주사 포털에서 보임)

    return NextResponse.json({ success: true, sent_at: now })
  } catch (error) {
    console.error('Error sending spec:', error)
    return NextResponse.json({ error: '전송 실패' }, { status: 500 })
  }
}
