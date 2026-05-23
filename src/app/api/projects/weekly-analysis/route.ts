import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    // 병렬로 데이터 조회
    const [
      { data: features },
      { data: weeklyPlan },
      { data: reports },
      { data: evidenceItems },
      { data: questions },
      { data: changeRequests },
      { data: risks },
      { data: decisions },
    ] = await Promise.all([
      supabase.from('features').select('id, order_key, name, status, priority_group').eq('project_id', projectId).order('order_key'),
      supabase.from('weekly_plans').select('*').eq('project_id', projectId).order('week_start', { ascending: false }).limit(1),
      supabase.from('reports').select('*').eq('project_id', projectId).gte('report_date', weekStart).lte('report_date', weekEnd).order('report_date', { ascending: false }),
      supabase.from('evidence_items').select('*').eq('project_id', projectId).gte('created_at', monday.toISOString()).lte('created_at', sunday.toISOString() + 'T23:59:59Z'),
      supabase.from('questions').select('*').eq('project_id', projectId).eq('is_resolved', false).limit(5),
      supabase.from('change_requests').select('*').eq('project_id', projectId).in('status', ['pending', 'reviewing']).limit(5),
      supabase.from('risks').select('*').eq('project_id', projectId).eq('is_resolved', false).limit(5),
      supabase.from('decisions').select('*').eq('project_id', projectId).eq('status', 'pending').limit(5),
    ])

    const currentPlan = weeklyPlan?.[0]
    const planContent = currentPlan?.final_plan || currentPlan?.vendor_modified || currentPlan?.ai_draft
    const weeklyGoals = planContent?.goals || []

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

    const prompt = `당신은 외주 개발 PM 보조 AI입니다. 이번 주 외주 개발 실행도와 지연 리스크를 분석해주세요.

[프로젝트] ${project.name}
[이번 주] ${weekStart} ~ ${weekEnd} (오늘: ${today}, 경과 ${workingDaysElapsed}/5 영업일)

[이번 주 계획 목표]
${weeklyGoals.length > 0 ? weeklyGoals.map((g: { feature?: string; target?: string; deliverable?: string; risk?: string }, i: number) => `${i+1}. [${g.feature || ''}] ${g.target || ''} → 결과물: ${g.deliverable || '미정'} | 리스크: ${g.risk || '없음'}`).join('\n') : '(이번 주 계획 없음)'}

[기능 현황]
- 전체: ${totalFeatures}개
- 진행 중: ${inProgressCount}개
- 완료: ${completedCount}개
- P0 미착수: ${features?.filter(f => f.priority_group === 'P0' && f.status === 'planning').length || 0}개

[이번 주 일일 보고]
- 제출: ${reportCount}/${workingDaysElapsed}일
${reports?.slice(0, 3).map(r => `- ${r.report_date}: ${r.summary} | blocker: ${r.blocker || '없음'}`).join('\n') || '(보고 없음)'}

[증빙 자료]
- 이번 주 증빙 수: ${evidenceCount}건
${evidenceItems?.slice(0, 3).map((e: { evidence_type?: string; title?: string }) => `- [${e.evidence_type}] ${e.title}`).join('\n') || '(증빙 없음)'}

[블로커 요인]
- 미해결 질문: ${questions?.length || 0}건
- 진행 중 변경 요청: ${changeRequests?.length || 0}건
- 미결 의사결정: ${decisions?.length || 0}건
- 오픈 리스크: ${risks?.length || 0}건

[계산된 기본 실행도]
- 보고 달성률: ${Math.round(reportScore)}%
- 기능 진척률: ${Math.round(progressScore)}%
- 증빙 달성률: ${Math.round(evidenceScore)}%
- 종합 실행도(계산): ${baseExecution}%

아래 JSON 형식으로 분석해주세요:
{
  "execution_score": 0~100,
  "execution_summary": "실행도에 대한 1문장 요약",
  "delay_risk_level": "낮음|보통|높음|매우높음",
  "delay_risk_reason": "지연 위험 주요 원인 1문장",
  "top3_delay_risks": [
    {
      "rank": 1,
      "title": "위험 항목 제목",
      "description": "구체적인 설명 2문장",
      "severity": "높음|보통|낮음",
      "related_type": "blocker|보고부족|증빙부족|의사결정대기|변경요청|QA미확정",
      "action_needed": "즉시 필요한 액션 1문장"
    }
  ],
  "positive_signals": ["잘 되고 있는 점 1", "잘 되고 있는 점 2"],
  "ai_comment": "대표에게 전달할 종합 코멘트 2-3문장. 현실적이고 직관적으로."
}

중요: 
- execution_score는 보고/증빙/진척을 종합한 AI 판단값 (계산된 ${baseExecution}%를 참고하되 AI 판단으로 조정)
- top3_delay_risks는 반드시 3개, 없으면 "특이사항 없음" 형태로
- 단정적 표현보다 가능성/신호로 표현`

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
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
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
