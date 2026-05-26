import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/task-schedules
 * 외주사가 작업 일정 추가 (access_link_id 기반 인증)
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { token, feature_id, project_id, start_date, end_date, note } = body

    if (!token || !feature_id || !project_id || !start_date || !end_date) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // 토큰 검증
    const { data: link } = await admin
      .from('access_links')
      .select('id, project_id, is_active')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!link || link.project_id !== project_id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // 날짜 유효성 검사
    if (start_date > end_date) {
      return NextResponse.json({ error: '시작일이 종료일보다 늦을 수 없습니다.' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('task_schedules' as 'features')
      .insert({
        project_id,
        feature_id,
        access_link_id: link.id,
        start_date,
        end_date,
        note: note || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('[task-schedules/POST] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedule: data })
  } catch (error) {
    console.error('[task-schedules/POST] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
