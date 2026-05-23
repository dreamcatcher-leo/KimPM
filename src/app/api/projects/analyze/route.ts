import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'

// =====================================================
// POST: 대표 요구사항 AI 분석 → 기능 목록 & 우선순위 생성
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      one_line,        // 한 줄 설명
      must_have,       // 꼭 필요한 기능
      nice_to_have,    // 있으면 좋은 기능
      out_of_scope,    // 제외 범위
      priority_basis,  // 우선순위 기준
      references,      // 참고 서비스
      core_problem,    // 핵심 문제
      constraints,     // 조건/제약
      project_name,    // 프로젝트명
      project_goal,    // 프로젝트 목표
    } = body

    // 입력값 검증
    if (!one_line && !must_have && !core_problem) {
      return NextResponse.json({ error: '최소 입력값이 필요합니다 (서비스 설명 또는 핵심 기능)', errorType: 'validation' }, { status: 400 })
    }

    const hasApiKey = !!(process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.trim() !== '' &&
      process.env.OPENAI_API_KEY !== '여기에_OpenAI_API키_붙여넣기')

    if (hasApiKey) {
      // AI 분석
      const prompt = `당신은 외주 개발 PM 전문가입니다. 대표가 입력한 요구사항을 분석하여 구조화된 기능 목록과 우선순위를 제안해주세요.

[입력 정보]
프로젝트명: ${project_name || '미입력'}
프로젝트 목표: ${project_goal || '미입력'}
서비스 한 줄 설명: ${one_line || '미입력'}
꼭 필요한 기능: ${must_have || '미입력'}
있으면 좋은 기능: ${nice_to_have || '없음'}
제외 범위: ${out_of_scope || '없음'}
우선순위 기준: ${priority_basis || '없음'}
참고 서비스: ${references || '없음'}
핵심 문제: ${core_problem || '미입력'}
제약 조건: ${constraints || '없음'}

[응답 형식 — 반드시 JSON]
{
  "summary": "AI가 이해한 프로젝트 핵심 2-3문장",
  "core_value": "핵심 가치 제안 1문장",
  "features": [
    {
      "order_key": "P0-1",
      "name": "기능명 (간결하게)",
      "priority_group": "P0",
      "category": "신규_개발 또는 기존_보완 또는 신규_개발_기존_보완",
      "description": "기능 설명 2-3문장",
      "expected_effect": "기대 효과 1-2문장",
      "priority_reason": "이 우선순위인 이유 (출시필수/운영효율/대표결정선행/외주난이도높음/후순위 중 하나 포함)",
      "risk_note": "주요 리스크 또는 대표 확인 필요 사항 (없으면 null)"
    }
  ],
  "risks": ["초기 리스크 1", "초기 리스크 2"],
  "founder_checks": ["대표 확인이 필요한 사항 1", "대표 확인이 필요한 사항 2"],
  "priority_guide": "P0/P1/P2 분류 기준 설명 1-2문장"
}

[우선순위 기준]
- P0: MVP 출시에 필수. 없으면 서비스 자체가 불가능한 기능
- P1: 출시 후 핵심 운영에 필요. 초기 사용자 확보에 중요
- P2: 있으면 좋지만 후순위로 미룰 수 있는 기능

최소 5개, 최대 15개 기능을 제안해주세요. 반드시 P0가 먼저 나와야 합니다.`

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 3000,
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')
      return NextResponse.json({ ...result, isFallback: false })
    } else {
      // Fallback: 입력값 기반 구조화된 기본 제안
      return NextResponse.json(generateFallbackAnalysis(body))
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Analyze error:', errMsg)
    // 에러 시에도 fallback 반환 (사용자 막히지 않게)
    const body = await request.json().catch(() => ({}))
    return NextResponse.json({ ...generateFallbackAnalysis(body), isFallback: true, error: errMsg })
  }
}

// =====================================================
// Fallback 분석 (OpenAI 없이)
// =====================================================
function generateFallbackAnalysis(body: Record<string, string>) {
  const { one_line, must_have, nice_to_have, project_name } = body
  const features = []
  let p0Count = 0
  let p1Count = 0

  // must_have를 줄 단위로 파싱해서 P0 기능으로
  if (must_have) {
    const lines = must_have.split('\n').filter(l => l.trim())
    lines.slice(0, 5).forEach((line, i) => {
      p0Count++
      features.push({
        order_key: `P0-${p0Count}`,
        name: line.replace(/^[-*•]\s*/, '').trim().substring(0, 40),
        priority_group: 'P0',
        category: '신규_개발',
        description: `${line.trim()} — 출시에 필수적인 핵심 기능입니다.`,
        expected_effect: '서비스 핵심 가치 제공 및 초기 사용자 경험 보장',
        priority_reason: '출시필수 — 대표가 꼭 필요하다고 명시한 기능',
        risk_note: '상세 범위 정의 후 외주사 공수 산정 필요',
      })
    })
  }

  // nice_to_have를 P1 기능으로
  if (nice_to_have) {
    const lines = nice_to_have.split('\n').filter(l => l.trim())
    lines.slice(0, 5).forEach((line) => {
      p1Count++
      features.push({
        order_key: `P1-${p1Count}`,
        name: line.replace(/^[-*•]\s*/, '').trim().substring(0, 40),
        priority_group: 'P1',
        category: '신규_개발',
        description: `${line.trim()} — 초기 운영 효율 또는 사용자 경험 향상에 기여합니다.`,
        expected_effect: '운영 효율화 및 사용자 만족도 향상',
        priority_reason: '운영효율 — 출시 후 빠르게 필요한 기능',
        risk_note: null,
      })
    })
  }

  // 기능이 없으면 기본 플레이스홀더
  if (features.length === 0) {
    features.push(
      { order_key: 'P0-1', name: '핵심 기능 1', priority_group: 'P0', category: '신규_개발', description: '요구사항을 입력하면 AI가 기능을 자동 제안합니다.', expected_effect: '서비스 핵심 가치 제공', priority_reason: '출시필수', risk_note: '상세 정의 필요' },
      { order_key: 'P0-2', name: '핵심 기능 2', priority_group: 'P0', category: '신규_개발', description: '요구사항 분석 후 세부 기능을 추가해주세요.', expected_effect: '사용자 경험 보장', priority_reason: '출시필수', risk_note: null },
      { order_key: 'P1-1', name: '부가 기능 1', priority_group: 'P1', category: '신규_개발', description: '1차 출시 후 추가할 기능입니다.', expected_effect: '운영 효율화', priority_reason: '운영효율', risk_note: null },
    )
  }

  return {
    summary: `"${project_name || '새 프로젝트'}" — ${one_line || '요구사항을 입력하면 AI가 프로젝트를 분석합니다.'}`,
    core_value: one_line || '핵심 가치 제안을 입력해주세요',
    features,
    risks: ['상세 기능 범위 정의 후 외주 공수 재산정 필요', '우선순위는 대표 확인 후 조정 가능'],
    founder_checks: ['각 기능의 상세 범위 검토', '외주 일정 및 예산과의 정합성 확인'],
    priority_guide: 'P0: 출시 필수 / P1: 초기 운영 필요 / P2: 후순위',
    isFallback: true,
  }
}
