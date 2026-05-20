import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateDailyAssessment } from '@/lib/openai/client'
import { notifyDailyReport, notifyMustCheck } from '@/lib/discord/webhook'
import type { Spec, WeeklyPlan, Report } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const {
      project_id, access_link_id, report_date, work_types,
      related_feature_ids, summary, blocker, files_modified,
      conclusion, tomorrow_plan, needs_founder_check
    } = body

    // Validate vendor access
    if (access_link_id) {
      const { data: link } = await admin
        .from('access_links')
        .select('*')
        .eq('id', access_link_id)
        .eq('project_id', project_id)
        .eq('is_active', true)
        .single()

      if (!link) return NextResponse.json({ error: 'Invalid access' }, { status: 403 })

      // Update last_used_at
      await admin.from('access_links').update({ last_used_at: new Date().toISOString() }).eq('id', access_link_id)
    }

    // Create report
    const { data: report, error: reportError } = await admin
      .from('reports')
      .insert({
        project_id, access_link_id, report_date, work_types,
        related_feature_ids: related_feature_ids || [],
        summary, blocker, files_modified, conclusion, tomorrow_plan,
        needs_founder_check: needs_founder_check || false,
      })
      .select()
      .single() as { data: Report | null; error: unknown }

    if (reportError || !report) throw reportError

    // Fetch context for AI assessment
    const [
      { data: specs },
      { data: weeklyPlan },
      { data: previousReports },
      { data: project },
    ] = await Promise.all([
      admin.from('specs').select('*').eq('status', 'approved').in(
        'feature_id',
        related_feature_ids?.length > 0 ? related_feature_ids : ['00000000-0000-0000-0000-000000000000']
      ),
      admin.from('weekly_plans').select('*').eq('project_id', project_id)
        .in('status', ['approved', 'vendor_agreed'])
        .order('week_start', { ascending: false }).limit(1),
      admin.from('reports').select('blocker').eq('project_id', project_id)
        .not('blocker', 'is', null).order('report_date', { ascending: false }).limit(5),
      admin.from('projects').select('discord_webhook_url, vendor_name').eq('id', project_id).single(),
    ])

    // Generate AI assessment
    const previousBlockers = previousReports?.map((r: { blocker: string | null }) => r.blocker).filter(Boolean) as string[] || []
    const assessment = await generateDailyAssessment(
      report,
      weeklyPlan?.[0] || null,
      specs || [],
      previousBlockers
    )

    const { data: savedAssessment } = await admin
      .from('daily_assessments')
      .insert(assessment)
      .select()
      .single()

    // Check Must-Check conditions
    const mustCheckTriggers = []

    if (needs_founder_check) {
      mustCheckTriggers.push({
        project_id,
        trigger_type: '외주사_확인_요청',
        title: `${report_date}: 외주사 대표 확인 요청`,
        description: `외주사가 오늘 보고에서 대표 확인을 요청했습니다.\n요약: ${summary}`,
        related_report_id: report.id,
      })
    }

    if (savedAssessment?.alignment_signal === '점검_권장') {
      mustCheckTriggers.push({
        project_id,
        trigger_type: '점검_권장_신호',
        title: `${report_date}: 정합성 신호 '점검 권장'`,
        description: `AI 판단 카드에서 '점검 권장' 신호가 감지되었습니다.\n${savedAssessment.ai_comment || ''}`,
        related_report_id: report.id,
      })
    }

    // Check for repeated blocker
    if (blocker && previousBlockers.length >= 2) {
      const sameBlocker = previousBlockers.filter(b => b && b.includes(blocker.slice(0, 20)))
      if (sameBlocker.length >= 2) {
        mustCheckTriggers.push({
          project_id,
          trigger_type: '반복_blocker',
          title: `반복 Blocker 감지`,
          description: `동일한 blocker가 3회 이상 반복되었습니다:\n${blocker}`,
          related_report_id: report.id,
        })
      }
    }

    if (mustCheckTriggers.length > 0) {
      await admin.from('must_check_items').insert(mustCheckTriggers)
    }

    // Auto-detect risks
    if (savedAssessment?.alignment_signal === '점검_권장') {
      await admin.from('risks').insert({
        project_id,
        risk_type: 'Weekly_Plan_미정합',
        level: '주의',
        title: `${report_date}: 주간 계획 정합성 낮음`,
        description: savedAssessment.ai_comment,
        related_report_id: report.id,
      })
    }

    if (!summary && !blocker) {
      await admin.from('risks').insert({
        project_id,
        risk_type: '보고_누락',
        level: '주의',
        title: `${report_date}: 보고 내용 부족`,
        description: '보고 내용이 매우 부족합니다.',
        related_report_id: report.id,
      })
    }

    // Discord notifications
    if (project?.discord_webhook_url) {
      await notifyDailyReport(
        project.discord_webhook_url,
        project_id,
        report.id,
        project.vendor_name,
        summary,
        savedAssessment?.alignment_signal || '주의',
        blocker,
        report_date
      )

      // Notify Must-Check items
      for (const trigger of mustCheckTriggers) {
        await notifyMustCheck(
          project.discord_webhook_url,
          project_id,
          trigger.title,
          trigger.trigger_type,
          trigger.description
        )
      }
    }

    return NextResponse.json({
      report,
      assessment: savedAssessment,
      must_check_count: mustCheckTriggers.length,
    })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}
