import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// OPENAI_BASE_URL을 실수로 전달하면 sandbox genspark 프록시로 가서 401이 남으니 baseURL: undefined으로 강제지정
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: undefined })
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) console.error('Weekly analysis auth error:', authError.message)
    if (!user) return NextResponse.json({ error: 'Unauthorized', reason: 'session_expired' }, { status: 401 })

    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    // 프로젝트 확인
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('founder_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // 이번 주 날짜 범위
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const weekStart = monday.toISOString().split('T')[0]
    const weekEnd = sunday.toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    // ── 계약 시작 전 조기 종료: 0% + "계약 기간 미시작" 반환 ──
    if (project.contract_start && today < project.contract_start) {
      return NextResponse.json({
        execution_score: 0,
        execution_summary: '아직 계약 기간이 시작되지 않았습니다.',
        delay_risk_level: '낮음',
        delay_risk_reason: `계약 시작일(${project.contract_start}) 전입니다. 현재는 준비 기간입니다.`,
        top3_delay_risks: [
          {
            rank: 1,
            title: '계약 기간 미시작',
            description: `계약은 ${project.contract_start}부터 시작됩니다. 현재 날짜(${today})는 계약 시작 전입니다.`,
            severity: '낮음',
            related_type: 'blocker',
            action_needed: '계약 시작일 이후 분석이 가능합니다.',
          },
          {
            rank: 2,
            title: '특이사항 없음',
            description: '계약 시작 전으로 분석할 실행 데이터가 없습니다.',
            severity: '낮음',
            related_type: 'blocker',
            action_needed: '계약 시작일 이후 확인하세요.',
          },
          {
            rank: 3,
            title: '특이사항 없음',
            description: '계약 시작 전으로 분석할 실행 데이터가 없습니다.',
            severity: '낮음',
            related_type: 'blocker',
            action_needed: '계약 시작일 이후 확인하세요.',
          },
        ],
        positive_signals: ['계약이 준비되어 있습니다.'],
        ai_comment: `계약 기간이 ${project.contract_start}부터 시작됩니다. 계약 시작일 이후부터 실행도 분석이 제공됩니다.`,
        meta: {
          report_count: 0,
          working_days_elapsed: 0,
          evidence_count: 0,
          week_start: weekStart,
          week_end: weekEnd,
          contract_not_started: true,
          contract_start: project.contract_start,
        }
      })
    }

    // 병렬로 데이터 조회 (각 쿼리 에러가 전체를 깨지 않도록 개별 처리)
    // 'reviewing'은 DB enum에 없음 → 'pending' 만 조회
    const [
      featuresRes, weeklyPlanRes, reportsRes, evidenceRes,
      questionsRes, changeReqRes, risksRes, decisionsRes,
    ] = await Promise.all([
      supabase.from('features').select('id, order_key, name, status, priority_group').eq('project_id', projectId).order('order_key'),
      supabase.from('weekly_plans').select('*').eq('project_id', projectId).order('week_start', { ascending: false }).limit(1),
      supabase.from('reports').select('*').eq('project_id', projectId).gte('report_date', weekStart).lte('report_date', weekEnd).order('report_date', { ascending: false }),
      supabase.from('evidence_items').select('*').eq('project_id', projectId).gte('created_at', monday.toISOString()).lte('created_at', sunday.toISOString() + 'T23:59:59Z'),
      supabase.from('questions').select('*').eq('project_id', projectId).eq('is_resolved', false).limit(5),
      supabase.from('change_requests').select('*').eq('project_id', projectId).eq('status', 'pending').limit(5),
      supabase.from('risks').select('*').eq('project_id', projectId).eq('is_resolved', false).limit(5),
      supabase.from('decisions').select('*').eq('project_id', projectId).eq('status', 'pending').limit(5),
    ])

    // 쿼리별 에러 로그
    if (featuresRes.error)   console.error('features query error:', featuresRes.error.message)
    if (weeklyPlanRes.error) console.error('weekly_plans query error:', weeklyPlanRes.error.message)
    if (reportsRes.error)    console.error('reports query error:', reportsRes.error.message)
    if (evidenceRes.error)   console.error('evidence_items query error:', evidenceRes.error.message)
    if (questionsRes.error)  console.error('questions query error:', questionsRes.error.message)
    if (changeReqRes.error)  console.error('change_requests query error:', changeReqRes.error.message)
    if (risksRes.error)      console.error('risks query error:', risksRes.error.message)
    if (decisionsRes.error)  console.error('decisions query error:', decisionsRes.error.message)

    const features      = featuresRes.data
    const weeklyPlan    = weeklyPlanRes.data
    const reports       = reportsRes.data
    const evidenceItems = evidenceRes.data
    const questions     = questionsRes.data
    const changeRequests= changeReqRes.data
    const risks         = risksRes.data
    const decisions     = decisionsRes.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPlan = (weeklyPlan as any)?.[0] ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planContent = currentPlan?.final_plan || currentPlan?.vendor_modified || currentPlan?.ai_draft || null as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weeklyGoals: any[] = planContent?.goals || []

    // 실행도 기본 계산
    const workingDaysElapsed = Math.max(0, Math.min(5, Math.floor((now.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)) + 1))
    const reportCount = reports?.length || 0
    const evidenceCount = evidenceItems?.length || 0
    const inProgressCount = features?.filter(f => f.status === 'in_progress').length || 0
    const completedCount = features?.filter(f => ['approved', 'completed'].includes(f.status)).length || 0
    const totalFeatures = features?.length || 0

    // 기본 실행도 계산 (보고 + 증빙 + 진행 비율 기반)
    const reportScore = workingDaysElapsed > 0 ? Math.min(100, (reportCount / workingDaysElapsed) * 100) : 0
    const progressScore = totalFeatures > 0 ? ((inProgressCount * 0.5 + completedCount) / totalFeatures) * 100 : 0
    const evidenceScore = reportCount > 0 ? Math.min(100, (evidenceCount / reportCount) * 80) : 0
    const baseExecution = Math.round((reportScore * 0.4 + progressScore * 0.4 + evidenceScore * 0.2))

    // OpenAI로 AI 분석
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        generateFallbackAnalysis(weeklyGoals, reports || [], evidenceItems || [], features || [], questions || [], changeRequests || [], decisions || [], risks || [], baseExecution),
        { status: 200 }
      )
    }

    // 계약 기간 경과율 계산
    const contractStart = project.contract_start ? new Date(project.contract_start) : null
    const contractEnd = project.contract_end ? new Date(project.contract_end) : null
    const contractElapsedDays = contractStart
      ? Math.max(0, Math.floor((now.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24)))
      : null
    const contractTotalDays = (contractStart && contractEnd)
      ? Math.ceil((contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const contractProgressPct = (contractElapsedDays !== null && contractTotalDays && contractTotalDays > 0)
      ? Math.min(100, Math.round((contractElapsedDays / contractTotalDays) * 100))
      : null

    const prompt = `당신은 외주 개발 PM 보조 AI입니다. 이번 주 외주 개발 실행도와 지연 리스크를 분석해주세요.

⚠️ 핵심 원칙 — 데이터 수치 정직성:
- 아래 제공된 실제 수치(보고 횟수, 증빙 수 등)를 있는 그대로 반영하세요.
- 보고 0건이면 보고 달성률은 0%입니다. 데이터 없는 항목은 "없음/미제출"로 명시하세요.
- execution_score는 계산된 기본값(${baseExecution}%) 기준 ±15% 내에서만 조정 가능합니다.
- 없는 데이터를 있는 것처럼 해석하거나 수치를 부풀리지 마세요.

[프로젝트] ${project.name}
[계약 기간] ${project.contract_start || '미설정'} ~ ${project.contract_end || '미설정'} (${contractProgressPct !== null ? `${contractProgressPct}% 경과, ${contractElapsedDays}일/${contractTotalDays}일` : '기간 미설정'})
[이번 주] ${weekStart} ~ ${weekEnd} (오늘: ${today}, 경과 ${workingDaysElapsed}/5 영업일)

[이번 주 계획 목표]
${weeklyGoals.length > 0 ? weeklyGoals.map((g: { feature?: string; target?: string; deliverable?: string; risk?: string }, i: number) => `${i+1}. [${g.feature || ''}] ${g.target || ''} → 결과물: ${g.deliverable || '미정'} | 리스크: ${g.risk || '없음'}`).join('\n') : '(이번 주 계획 없음)'}

[기능 현황] ← 이 수치 그대로 사용
- 전체: ${totalFeatures}개
- 진행 중: ${inProgressCount}개
- 완료(승인): ${completedCount}개
- P0 미착수: ${features?.filter(f => f.priority_group === 'P0' && f.status === 'planning').length || 0}개

[이번 주 일일 보고] ← 이 수치 그대로 사용
- 제출: ${reportCount}건 / 경과 ${workingDaysElapsed}영업일
${reports && reports.length > 0
  ? reports.slice(0, 3).map(r => `- ${r.report_date}: ${r.summary || '(내용 없음)'} | blocker: ${r.blocker || '없음'}`).join('\n')
  : '- (이번 주 보고 없음 — 보고달성률 0%로 반영하세요)'}

[증빙 자료] ← 이 수치 그대로 사용
- 이번 주 증빙 수: ${evidenceCount}건
${(evidenceItems || []).length > 0
  ? (evidenceItems || []).slice(0, 3).map((e) => `- [${(e as {evidence_type?: string}).evidence_type || ''}] ${(e as {title?: string}).title || ''}`).join('\n')
  : '- (이번 주 증빙 없음 — 증빙달성률 0%로 반영하세요)'}

[블로커 요인]
- 미해결 질문: ${questions?.length || 0}건
- 진행 중 변경 요청: ${changeRequests?.length || 0}건
- 미결 의사결정: ${decisions?.length || 0}건
- 오픈 리스크: ${risks?.length || 0}건

[계산된 기본 실행도] ← AI 조정은 ±15% 이내만 허용
- 보고 달성률: ${Math.round(reportScore)}% (${reportCount}건 / ${workingDaysElapsed}일)
- 기능 진척률: ${Math.round(progressScore)}% (완료${completedCount}+진행중${inProgressCount}/전체${totalFeatures})
- 증빙 달성률: ${Math.round(evidenceScore)}%
- 종합 실행도(계산값): ${baseExecution}%
- 허용 범위: ${Math.max(0, baseExecution - 15)}% ~ ${Math.min(100, baseExecution + 15)}%

아래 JSON 형식으로 분석해주세요:
{
  "execution_score": ${Math.max(0, baseExecution - 15)}~${Math.min(100, baseExecution + 15)} 사이 정수,
  "execution_summary": "실행도에 대한 1문장 요약 (반드시 위 실제 수치 기반으로)",
  "delay_risk_level": "낮음|보통|높음|매우높음",
  "delay_risk_reason": "지연 위험 주요 원인 1문장",
  "top3_delay_risks": [
    {
      "rank": 1,
      "title": "위험 항목 제목",
      "description": "구체적인 설명 2문장 (실제 데이터 기반)",
      "severity": "높음|보통|낮음",
      "related_type": "blocker|보고부족|증빙부족|의사결정대기|변경요청|QA미확정",
      "action_needed": "즉시 필요한 액션 1문장"
    }
  ],
  "positive_signals": ["잘 되고 있는 점 (없으면 빈 배열)"],
  "ai_comment": "대표에게 전달할 종합 코멘트 2-3문장 (반드시 실제 수치 기반으로 정직하게)"
}

최종 자기검증:
1. execution_score가 ${Math.max(0, baseExecution - 15)}~${Math.min(100, baseExecution + 15)} 범위 내인지 확인
2. top3_delay_risks가 정확히 3개인지 확인 (부족하면 "특이사항 없음"으로 채움)
3. 보고가 ${reportCount}건임을 execution_summary에 반영했는지 확인`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({
      execution_score: result.execution_score ?? baseExecution,
      execution_summary: result.execution_summary || '분석 중',
      delay_risk_level: result.delay_risk_level || '보통',
      delay_risk_reason: result.delay_risk_reason || '',
      top3_delay_risks: result.top3_delay_risks || [],
      positive_signals: result.positive_signals || [],
      ai_comment: result.ai_comment || '',
      meta: {
        report_count: reportCount,
        working_days_elapsed: workingDaysElapsed,
        evidence_count: evidenceCount,
        week_start: weekStart,
        week_end: weekEnd,
      }
    })

  } catch (error) {
    console.error('Weekly analysis error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Analysis failed', detail: msg }, { status: 500 })
  }
}

function generateFallbackAnalysis(
  weeklyGoals: { feature?: string; target?: string }[],
  reports: { report_date: string; summary: string; blocker?: string }[],
  evidenceItems: unknown[],
  features: { status: string; priority_group: string }[],
  questions: unknown[],
  changeRequests: unknown[],
  decisions: unknown[],
  risks: unknown[],
  baseExecution: number
) {
  const blockerCount = (questions?.length || 0) + (changeRequests?.length || 0) + (decisions?.length || 0)
  const riskLevel = blockerCount >= 3 ? '높음' : blockerCount >= 1 ? '보통' : '낮음'
  
  const top3Risks = []
  if ((reports?.length || 0) < 3) {
    top3Risks.push({ rank: 1, title: '일일 보고 미제출', description: '이번 주 보고가 충분하지 않아 진척 파악이 어렵습니다.', severity: '보통', related_type: '보고부족', action_needed: '일일 보고 제출 독려 필요' })
  }
  if ((evidenceItems?.length || 0) === 0) {
    top3Risks.push({ rank: top3Risks.length + 1, title: '증빙 자료 없음', description: '이번 주 증빙(PR/커밋/스크린샷)이 첨부되지 않았습니다.', severity: '보통', related_type: '증빙부족', action_needed: '증빙 자료 첨부 요청' })
  }
  if ((decisions?.length || 0) > 0) {
    top3Risks.push({ rank: top3Risks.length + 1, title: `의사결정 대기 ${decisions?.length}건`, description: '대표 승인을 기다리는 의사결정이 있어 개발이 지연될 수 있습니다.', severity: '높음', related_type: '의사결정대기', action_needed: '의사결정 항목 즉시 확인 필요' })
  }
  while (top3Risks.length < 3) {
    top3Risks.push({ rank: top3Risks.length + 1, title: '특이사항 없음', description: '이 순위에서 특별한 지연 위험 신호가 감지되지 않았습니다.', severity: '낮음', related_type: 'blocker', action_needed: '계속 모니터링' })
  }

  return {
    execution_score: baseExecution,
    execution_summary: `이번 주 실행도는 ${baseExecution}% 수준입니다.`,
    delay_risk_level: riskLevel,
    delay_risk_reason: blockerCount > 0 ? `${blockerCount}건의 미해결 블로커가 진행을 막고 있습니다.` : '현재 명확한 지연 위험 신호는 없습니다.',
    top3_delay_risks: top3Risks.slice(0, 3),
    positive_signals: [(reports?.length || 0) > 0 ? '일일 보고가 제출되고 있습니다.' : ''].filter(Boolean),
    ai_comment: 'OpenAI API 키가 필요합니다. 현재는 기본 분석 결과를 표시합니다.',
    meta: { report_count: reports?.length || 0, week_start: '', week_end: '', working_days_elapsed: 0, evidence_count: evidenceItems?.length || 0 }
  }
}
