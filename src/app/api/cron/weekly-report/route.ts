import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 주간 PM 리포트 자동 생성 Cron Job
 * Vercel Cron: 매주 금요일 18:00 KST (09:00 UTC)
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 이번 주 범위 계산 (월~금)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = friday.toISOString().split('T')[0]

  // 활성 프로젝트 조회
  const { data: projects } = await admin
    .from('projects')
    .select('*')
    .eq('status', 'active')

  const results = []

  for (const project of projects || []) {
    try {
      // 이번 주 데이터 수집
      const [
        { data: reports },
        { data: features },
        { data: completions },
        { data: changeRequests },
        { data: risks },
        { data: decisions },
        { data: mustChecks },
        { data: weeklyPlan },
      ] = await Promise.all([
        admin.from('reports')
          .select('*, daily_assessments(*)')
          .eq('project_id', project.id)
          .gte('report_date', weekStart)
          .lte('report_date', weekEnd)
          .order('report_date', { ascending: true }),
        admin.from('features')
          .select('*')
          .eq('project_id', project.id)
          .order('priority'),
        admin.from('completion_candidates')
          .select('*, features(order_key, name)')
          .eq('project_id', project.id)
          .in('status', ['approved', 'pending'])
          .gte('created_at', `${weekStart}T00:00:00`),
        admin.from('change_requests')
          .select('*')
          .eq('project_id', project.id)
          .gte('created_at', `${weekStart}T00:00:00`),
        admin.from('risks')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_resolved', false),
        admin.from('decisions')
          .select('*')
          .eq('project_id', project.id)
          .gte('created_at', `${weekStart}T00:00:00`),
        admin.from('must_check_items')
          .select('*')
          .eq('project_id', project.id)
          .gte('created_at', `${weekStart}T00:00:00`),
        admin.from('weekly_plans')
          .select('*')
          .eq('project_id', project.id)
          .eq('week_start', weekStart)
          .single(),
      ])

      // 기능 진행 현황 집계
      const featureStats = {
        total: features?.length || 0,
        p0: features?.filter(f => f.priority === 'P0').length || 0,
        p1: features?.filter(f => f.priority === 'P1').length || 0,
        approved_completions: completions?.filter(c => c.status === 'approved').length || 0,
        pending_completions: completions?.filter(c => c.status === 'pending').length || 0,
      }

      // 주간 보고 통계
      const reportStats = {
        total_reports: reports?.length || 0,
        on_track: reports?.filter(r => r.overall_status === 'on_track').length || 0,
        at_risk: reports?.filter(r => r.overall_status === 'at_risk').length || 0,
        blocked: reports?.filter(r => r.overall_status === 'blocked').length || 0,
        progress_avg: reports?.length
          ? Math.round(reports.reduce((sum, r) => sum + (r.progress_rate || 0), 0) / reports.length)
          : 0,
      }

      // AI 판단 신호 집계
      const aiSignals = reports?.flatMap(r => r.daily_assessments || []) || []
      const signalStats = {
        normal: aiSignals.filter((a: { alignment_signal?: string }) => a.alignment_signal === 'normal').length,
        caution: aiSignals.filter((a: { alignment_signal?: string }) => a.alignment_signal === 'caution').length,
        check_required: aiSignals.filter((a: { alignment_signal?: string }) => a.alignment_signal === 'check_required').length,
      }

      // 주간 계획 달성률 계산
      let planAchievementRate = null
      if (weeklyPlan && (weeklyPlan as { plan_items?: { planned?: boolean; achieved?: boolean }[] }).plan_items) {
        const planData = weeklyPlan as { plan_items: { planned?: boolean; achieved?: boolean }[] }
        const items = planData.plan_items
        const total = items.length
        const achieved = items.filter(item => item.achieved).length
        planAchievementRate = total > 0 ? Math.round((achieved / total) * 100) : null
      }

      // 주간 리포트 데이터 구조 생성
      const weeklyReportData = {
        project_id: project.id,
        week_start: weekStart,
        week_end: weekEnd,
        feature_stats: featureStats,
        report_stats: reportStats,
        signal_stats: signalStats,
        plan_achievement_rate: planAchievementRate,
        new_change_requests: changeRequests?.length || 0,
        new_must_checks: mustChecks?.length || 0,
        resolved_decisions: decisions?.filter((d: { status: string }) => d.status !== 'pending').length || 0,
        open_risks: risks?.length || 0,
        high_risks: risks?.filter((r: { level: string }) => r.level === 'high' || r.level === 'critical').length || 0,
        key_completions: (completions || []).slice(0, 5).map((c: { features?: { order_key: string; name: string } | null; status: string; summary: string }) => ({
          feature: c.features ? `${c.features.order_key} ${c.features.name}` : '알 수 없음',
          status: c.status,
          summary: c.summary,
        })),
        report_date: weekEnd,
        generated_at: new Date().toISOString(),
      }

      // Discord 주간 리포트 발송
      if (project.discord_webhook_url) {
        const statusEmoji = reportStats.blocked > 0 ? '🔴' : reportStats.at_risk > 0 ? '🟡' : '🟢'
        const fields = [
          { name: '📊 주간 보고 현황', value: `총 ${reportStats.total_reports}건 | 정상 ${reportStats.on_track} · 주의 ${reportStats.at_risk} · 블록 ${reportStats.blocked}`, inline: false },
          { name: '⚡ AI 정합성 신호', value: `정상 ${signalStats.normal} · 주의 ${signalStats.caution} · 점검권장 ${signalStats.check_required}`, inline: false },
          { name: '✅ 기능 완료', value: `승인 ${featureStats.approved_completions}건 / 검토중 ${featureStats.pending_completions}건`, inline: true },
          { name: '🔴 미해소 리스크', value: `${risks?.length || 0}건 (고위험 ${weeklyReportData.high_risks}건)`, inline: true },
        ]

        if (planAchievementRate !== null) {
          fields.push({ name: '📋 주간 계획 달성률', value: `${planAchievementRate}%`, inline: true })
        }

        if (weeklyReportData.key_completions.length > 0) {
          fields.push({
            name: '🎉 이번 주 완료 항목',
            value: weeklyReportData.key_completions.map(c => `• ${c.feature}`).join('\n'),
            inline: false,
          })
        }

        const discordPayload = {
          embeds: [{
            title: `${statusEmoji} 주간 PM 리포트 — ${project.name}`,
            description: `📅 **${weekStart} ~ ${weekEnd}** 주간 리포트가 생성되었습니다.\n\n대시보드에서 전체 내용을 확인하세요.`,
            color: reportStats.blocked > 0 ? 0xef4444 : reportStats.at_risk > 0 ? 0xf59e0b : 0x22c55e,
            fields,
            footer: { text: '김PM — AI 외주 개발 관리' },
            timestamp: new Date().toISOString(),
          }],
        }

        await fetch(project.discord_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload),
        })
      }

      results.push({
        project_id: project.id,
        week_start: weekStart,
        week_end: weekEnd,
        report_stats: reportStats,
        signal_stats: signalStats,
      })

    } catch (err) {
      console.error(`Failed to generate weekly report for project ${project.id}:`, err)
    }
  }

  return NextResponse.json({
    processed: results.length,
    week_start: weekStart,
    week_end: weekEnd,
    results,
  })
}
