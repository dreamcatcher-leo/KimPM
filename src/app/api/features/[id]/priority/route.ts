import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// PATCH: 기능 우선순위 그룹 변경 (Drag & Drop 보드)
// Body: { priority_group: 'P0' | 'P1' | 'P2' | 'P3', reason?: string }
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { priority_group, reason } = body

    if (!['P0', 'P1', 'P2', 'P3'].includes(priority_group)) {
      return NextResponse.json({ error: '잘못된 우선순위 그룹입니다' }, { status: 400 })
    }

    // 현재 기능 조회
    const { data: feature, error: fetchError } = await supabase
      .from('features')
      .select('*, projects(founder_id)')
      .eq('id', id)
      .single()

    if (fetchError || !feature) {
      return NextResponse.json({ error: '기능을 찾을 수 없습니다' }, { status: 404 })
    }

    // 권한 확인
    if (feature.projects?.founder_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const prevGroup = feature.priority_group

    // 우선순위 업데이트
    const { error: updateError } = await supabase
      .from('features')
      .update({
        priority_group,
        priority: priority_group, // priority 컬럼도 동기화
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 변경 이력 저장 (must_check_items 테이블 활용 또는 별도 로그)
    // decisions 테이블에 자동 기록 — 대표가 직접 변경했으므로 approved 상태
    if (prevGroup !== priority_group) {
      await supabase.from('decisions').insert({
        project_id: feature.project_id,
        title: `기능 우선순위 변경: ${feature.name}`,
        description: `${prevGroup} → ${priority_group}${reason ? ` (사유: ${reason})` : ''}`,
        decision_type: '우선순위_변경',
        related_feature_id: id,
        status: 'approved',
        founder_decision: `${prevGroup}에서 ${priority_group}으로 변경`,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
      }).then(() => {}) // 실패해도 무시
    }

    return NextResponse.json({
      success: true,
      feature_id: id,
      prev_group: prevGroup,
      new_group: priority_group,
    })
  } catch (err) {
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
