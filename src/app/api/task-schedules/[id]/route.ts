import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/task-schedules/[id]
 * 대표자가 일정 승인/반려 (founder 인증)
 *
 * DELETE /api/task-schedules/[id]
 * 외주사가 일정 삭제 (token 기반 또는 대표자)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { status, project_id } = body

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 프로젝트 소유자 확인
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('founder_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await admin
      .from('task_schedules' as 'features')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        approved_by: status === 'approved' ? user.id : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[task-schedules/PATCH] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedule: data })
  } catch (error) {
    console.error('[task-schedules/PATCH] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()
    const body = await request.json().catch(() => ({}))
    const { token } = body

    if (token) {
      // 외주사: 토큰으로 access_link_id 검증
      const { data: link } = await admin
        .from('access_links')
        .select('id')
        .eq('token', token)
        .eq('is_active', true)
        .single()

      if (!link) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

      const { error } = await admin
        .from('task_schedules' as 'features')
        .delete()
        .eq('id', id)
        .eq('access_link_id', link.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // 대표자: 세션 인증
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { error } = await admin
        .from('task_schedules' as 'features')
        .delete()
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[task-schedules/DELETE] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
