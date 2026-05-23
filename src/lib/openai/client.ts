import OpenAI from 'openai'
import type { Feature, Spec, WeeklyPlan, Report, DailyAssessment } from '@/types'

// OPENAI_BASE_URL은 sandbox에 genspark 프록시 주소가 주입되어 있어
// sk-proj 키 사용 시 401 오류가 발생함. 명시적으로 미설정(= openai.com 직접 사용)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: undefined, // 시스템 환경변수 OPENAI_BASE_URL 무시, SDK 기본값 사용
})

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

// =====================================================
// AI 기능 정의서 생성
// =====================================================
export async function generateSpec(feature: Feature, projectGoal: string): Promise<string> {
  const prompt = `당신은 경험 많은 프로덕트 매니저입니다. 다음 기능에 대한 상세 기능 정의서를 작성해주세요.

프로젝트 목표: ${projectGoal}

기능 정보:
- 순서: ${feature.order_key}
- 기능명: ${feature.name}
- 분류: ${feature.category.replace(/_/g, ' ')}
- 우선순위: ${feature.priority_group}
- 상세 설명: ${feature.description || '없음'}
- 기대 효과: ${feature.expected_effect || '없음'}

아래 형식으로 정확히 작성해주세요. 각 섹션은 명확하고 실행 가능한 수준으로 작성해주세요.
비포펫은 강아지 도그워킹 매칭 플랫폼입니다.

---
## 기능명
[기능명]

## 기능 배경
[이 기능이 왜 필요한지, 현재 어떤 상황인지 2-3문장으로]

## 현재 문제
[현재 시스템/UX에서 발생하는 구체적인 문제점들]

## 관련 사용자
[이 기능과 관련된 사용자 유형과 각각의 니즈]

## 포함 범위 (In Scope)
[이번 개발에 포함되는 기능 범위를 bullet point로]

## 제외 범위 (Out of Scope)
[이번 개발에서 의도적으로 제외하는 항목]

## 화면 흐름
[주요 화면 전환 흐름을 단계별로 설명]

## 상태값 (State Values)
[시스템에서 관리되는 주요 상태값과 전환 조건]

## 알림 조건
[어떤 상황에서 누구에게 어떤 알림을 보내는지]

## 어드민 기능
[관리자가 이 기능과 관련해 할 수 있어야 하는 것들]

## 데이터 항목
[저장/관리해야 하는 주요 데이터 필드들]

## 예외 케이스
[처리해야 하는 엣지 케이스와 예외 상황들]

## 수용 기준 (Acceptance Criteria)
[이 기능이 완료되었다고 판단하는 기준 (Given-When-Then 또는 체크리스트 형식)]

## QA 체크리스트
[카테고리별 QA 항목들: 보호자 관점 / 도그워커 관점 / 어드민 관점 / 예외 케이스 / 알림 / 데이터 / 권한 / 회귀 확인]

## 외주사 예상 질문
[외주 개발사가 개발 중 물어볼 법한 질문들]

## 기본 답변 초안
[위 예상 질문들에 대한 기본 답변 초안]
---`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 4000,
  })

  return completion.choices[0].message.content || ''
}

// =====================================================
// 주간 계획 초안 생성
// =====================================================
export async function generateWeeklyPlan(
  features: Feature[],
  weekStart: string,
  weekEnd: string,
  projectGoal: string
): Promise<string> {
  const featureList = features
    .filter(f => ['planning', 'spec_approved', 'in_progress'].includes(f.status))
    .map(f => `- [${f.order_key}] ${f.name} (${f.status}, ${f.priority_group})`)
    .join('\n')

  const prompt = `당신은 외주 개발 PM입니다. 다음 정보를 바탕으로 이번 주(${weekStart} ~ ${weekEnd}) 작업 계획 초안을 생성해주세요.

프로젝트 목표: ${projectGoal}

진행 중이거나 계획된 기능들:
${featureList}

아래 JSON 형식으로 응답해주세요:
{
  "summary": "이번 주 전체 작업 방향을 1-2문장으로",
  "goals": ["이번 주 목표 1", "이번 주 목표 2", "이번 주 목표 3"],
  "feature_plans": [
    {
      "feature_id": "기능 ID (order_key 사용)",
      "feature_name": "기능명",
      "planned_work": "이번 주에 이 기능에서 할 작업",
      "expected_output": "주 말까지 나와야 하는 산출물"
    }
  ],
  "deliverables": ["이번 주 말까지 제출해야 하는 산출물 목록"],
  "notes": "외주사에게 전달할 추가 안내사항"
}

중요: 모든 메시지는 정중하고 협력적인 톤을 유지해주세요.`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  })

  return completion.choices[0].message.content || '{}'
}

// =====================================================
// AI 일일 보고 판단 카드 생성
// =====================================================
export async function generateDailyAssessment(
  report: Report,
  weeklyPlan: WeeklyPlan | null,
  specs: Spec[],
  previousBlockers: string[]
): Promise<Omit<DailyAssessment, 'id' | 'created_at'>> {
  const planContent = weeklyPlan?.final_plan || weeklyPlan?.vendor_modified || weeklyPlan?.ai_draft
  const specSummaries = specs.map(s => `[${s.feature_name}] 포함범위: ${s.in_scope?.substring(0, 200)}`).join('\n')

  const prompt = `당신은 외주 개발 PM 보조 시스템입니다. 오늘 외주사의 일일 보고를 분석하여 판단 보조 카드를 생성해주세요.

[오늘 보고]
- 날짜: ${report.report_date}
- 작업 유형: ${report.work_types.join(', ')}
- 한 줄 요약: ${report.summary}
- 막힌 점: ${report.blocker || '없음'}
- 수정 파일: ${report.files_modified || '없음'}
- 오늘 결론: ${report.conclusion || '없음'}
- 내일 계획: ${report.tomorrow_plan || '없음'}

[이번 주 계획]
${planContent ? JSON.stringify(planContent, null, 2) : '(주간 계획 미수립)'}

[관련 기능 정의서 요약]
${specSummaries || '(기능 정의서 없음)'}

[반복 blocker 이력]
${previousBlockers.length > 0 ? previousBlockers.join('\n') : '없음'}

아래 JSON 형식으로 분석해주세요:
{
  "alignment_signal": "정상|주의|점검_권장",
  "work_type_estimate": "보고된 작업 유형의 적절성 평가 1-2문장",
  "spec_alignment": "기능 정의서와의 정합성 분석 1-2문장",
  "weekly_plan_alignment": "주간 계획과의 정합성 분석 1-2문장",
  "progress_signal": "실질 진척 신호 평가 1-2문장",
  "evidence_strength": "증빙 강도 평가 (있으면 분석, 없으면 텍스트 보고 기준으로)",
  "risk_signals": "감지된 위험 신호 (없으면 '특이사항 없음')",
  "recommended_actions": "추천 후속 액션 (없으면 '계속 진행')",
  "ai_comment": "전체적인 보조 코멘트 2-3문장. 정중하고 중립적인 톤으로.",
  "spec_alignment_score": 0~100,
  "weekly_plan_score": 0~100,
  "evidence_score": 0~100
}

중요:
1. "지연 확정"을 판단하지 마세요. "이번 주 계획과의 정합성 신호"만 출력하세요.
2. alignment_signal 기준: 정상=계획과 잘 맞음, 주의=일부 이탈 가능성, 점검_권장=계획과 크게 다르거나 blocker 해소 불투명
3. 모든 평가는 보조 자료임을 인식하고 단정적 표현을 피하세요.`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 1500,
  })

  const raw = completion.choices[0].message.content || '{}'
  const parsed = JSON.parse(raw)

  return {
    report_id: report.id,
    project_id: report.project_id,
    assessment_date: report.report_date,
    alignment_signal: parsed.alignment_signal || '주의',
    work_type_estimate: parsed.work_type_estimate,
    spec_alignment: parsed.spec_alignment,
    weekly_plan_alignment: parsed.weekly_plan_alignment,
    progress_signal: parsed.progress_signal,
    evidence_strength: parsed.evidence_strength,
    risk_signals: parsed.risk_signals,
    recommended_actions: parsed.recommended_actions,
    ai_comment: parsed.ai_comment,
    raw_response: raw,
    spec_alignment_score: parsed.spec_alignment_score || 0,
    weekly_plan_score: parsed.weekly_plan_score || 0,
    evidence_score: parsed.evidence_score || 0,
  }
}

// =====================================================
// Founder Daily Brief 생성
// =====================================================
export async function generateFounderBrief(
  projectName: string,
  reports: Report[],
  mustCheckItems: { title: string; trigger_type: string }[],
  pendingDecisions: { title: string; decision_type: string | null }[],
  openRisks: { title: string; level: string }[]
): Promise<{ key_signals: object[]; report_summary: string; full_content: string }> {
  const reportSummary = reports.length > 0
    ? reports.map(r => `- ${r.report_date}: ${r.summary} (blocker: ${r.blocker || '없음'})`).join('\n')
    : '오늘 보고 없음'

  const prompt = `당신은 대표를 위한 외주 PM 브리핑 시스템입니다. 오늘의 핵심 이슈를 30초 안에 파악할 수 있도록 간결하게 요약해주세요.

프로젝트: ${projectName}

[오늘 외주사 보고]
${reportSummary}

[Must-Check 항목]
${mustCheckItems.map(m => `- ${m.title} (${m.trigger_type})`).join('\n') || '없음'}

[의사결정 대기]
${pendingDecisions.map(d => `- ${d.title}`).join('\n') || '없음'}

[오픈 리스크]
${openRisks.map(r => `- [${r.level}] ${r.title}`).join('\n') || '없음'}

아래 JSON 형식으로 응답해주세요:
{
  "key_signals": [
    {"type": "positive|warning|critical", "title": "신호 제목", "description": "1문장 설명"},
    {"type": "positive|warning|critical", "title": "신호 제목", "description": "1문장 설명"},
    {"type": "positive|warning|critical", "title": "신호 제목", "description": "1문장 설명"}
  ],
  "report_summary": "외주사 보고 1줄 요약",
  "full_content": "전체 브리프 마크다운 (대표가 웹앱에서 볼 상세 내용)"
}

중요: 대표는 30초~5분만 사용합니다. 핵심만 담아주세요.`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 1500,
  })

  const parsed = JSON.parse(completion.choices[0].message.content || '{}')
  return {
    key_signals: parsed.key_signals || [],
    report_summary: parsed.report_summary || '',
    full_content: parsed.full_content || '',
  }
}

// =====================================================
// 변경 요청 AI 권고 생성
// =====================================================
export async function generateChangeRequestRecommendation(
  title: string,
  content: string,
  reason: string,
  scheduleImpact: string,
  costImpact: string,
  alternative: string
): Promise<string> {
  const prompt = `당신은 외주 개발 PM입니다. 다음 변경 요청에 대한 AI 권고의견을 작성해주세요.

변경 요청:
- 제목: ${title}
- 내용: ${content}
- 사유: ${reason}
- 일정 영향: ${scheduleImpact}
- 비용 영향: ${costImpact}
- 대안: ${alternative}

3-5문장으로 객관적인 AI 권고의견을 작성해주세요. 승인/반려를 결정하지 말고, 고려해야 할 포인트와 리스크를 제시해주세요.`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  })

  return completion.choices[0].message.content || ''
}

// =====================================================
// 완료 축하 메시지 생성
// =====================================================
export async function generateCompletionMessage(featureName: string, vendorName: string): Promise<string> {
  const prompt = `${featureName} 기능이 완료되었습니다. 외주사(${vendorName})에게 보낼 짧고 진심 어린 축하 메시지를 한국어로 작성해주세요. 2-3문장, 정중하고 따뜻한 톤으로.`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 200,
  })

  return completion.choices[0].message.content || `${featureName} 기능 완료를 축하드립니다! 수고 많으셨습니다.`
}

export { openai }
