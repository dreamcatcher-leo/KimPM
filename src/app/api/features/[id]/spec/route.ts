import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateSpec } from '@/lib/openai/client'

// =====================================================
// POST: AI 기능 정의서 생성 (fallback 포함)
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // 세션 없어도 admin client로 데이터 조회 (기능 정의서 생성은 인증보다 기능 접근성이 중요)
    // access_link 기반 vendor 온보딩 페이지에서도 호출 가능하도록 허용
    const admin = createAdminClient()

    const { data: feature } = await admin
      .from('features')
      .select(`*, projects(goal, name)`)
      .eq('id', id)
      .single()

    if (!feature) return NextResponse.json({ error: '기능을 찾을 수 없습니다', errorType: 'not_found' }, { status: 404 })

    // 입력값 검증
    if (!feature.name || feature.name.trim() === '') {
      return NextResponse.json({ error: '기능명이 없습니다. 기능 정보를 먼저 입력해주세요.', errorType: 'validation' }, { status: 400 })
    }

    const projectGoal = (feature.projects as { goal: string; name: string })?.goal || ''
    const projectName = (feature.projects as { goal: string; name: string })?.name || ''

    // 기존 draft 정의서가 있으면 버전 번호 계산
    const { data: existingSpecs } = await admin
      .from('specs')
      .select('version')
      .eq('feature_id', id)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existingSpecs && existingSpecs.length > 0 ? existingSpecs[0].version + 1 : 1

    let rawContent: string
    let isFallback = false

    // OpenAI API 키 체크
    const hasApiKey = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '' && process.env.OPENAI_API_KEY !== '여기에_OpenAI_API키_붙여넣기')

    if (hasApiKey) {
      try {
        // 타임아웃 처리 (55초)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 55000)
        
        rawContent = await generateSpec(feature, projectGoal)
        clearTimeout(timeoutId)
      } catch (aiErr: unknown) {
        const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr)
        
        if (errMsg.includes('aborted') || errMsg.includes('timeout')) {
          return NextResponse.json({ error: 'AI 생성 시간 초과(55초). 잠시 후 재시도해주세요.', errorType: 'timeout' }, { status: 504 })
        }
        if (errMsg.includes('401') || errMsg.includes('Unauthorized') || errMsg.includes('Invalid')) {
          return NextResponse.json({ error: 'OpenAI API 키가 유효하지 않습니다. 설정을 확인해주세요.', errorType: 'api_key' }, { status: 502 })
        }
        if (errMsg.includes('429') || errMsg.includes('rate limit')) {
          return NextResponse.json({ error: 'OpenAI API 한도 초과. 1분 후 재시도해주세요.', errorType: 'rate_limit' }, { status: 429 })
        }
        if (errMsg.includes('insufficient_quota')) {
          return NextResponse.json({ error: 'OpenAI 크레딧이 부족합니다. 충전 후 재시도해주세요.', errorType: 'quota' }, { status: 402 })
        }
        // 그 외 AI 에러 → fallback 초안 생성
        console.error('AI 생성 실패, fallback 전환:', errMsg)
        rawContent = generateFallbackSpec(feature, projectGoal, projectName)
        isFallback = true
      }
    } else {
      // API 키 없음 → fallback 초안
      rawContent = generateFallbackSpec(feature, projectGoal, projectName)
      isFallback = true
    }

    // 파싱
    const parsed = parseSpecContent(rawContent)

    // qa_checklist_raw → DB의 qa_checklist 컬럼 (jsonb)으로 변환
    const qaRawText = parsed.qa_checklist_raw as string | undefined
    delete parsed.qa_checklist_raw
    
    // QA 체크리스트를 jsonb 배열로 변환
    let qaChecklist: { id: string; item: string; checked: boolean }[] = []
    if (qaRawText) {
      const lines = qaRawText.split('\n').filter(l => l.trim().startsWith('- ['))
      qaChecklist = lines.map((line, idx) => ({
        id: `qa${idx + 1}`,
        item: line.replace(/^- \[[ x]\] /, '').trim(),
        checked: false,
      }))
    }

    const { data: spec, error: insertError } = await admin
      .from('specs')
      .insert({
        feature_id: id,
        version: nextVersion,
        status: 'draft',
        raw_content: rawContent,
        feature_name: feature.name,
        ...parsed,
        qa_checklist: qaChecklist.length > 0 ? qaChecklist : null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Spec insert error:', insertError)
      return NextResponse.json({ error: `DB 저장 실패: ${insertError.message}`, errorType: 'db_error' }, { status: 500 })
    }

    // Feature 상태 업데이트
    await admin.from('features').update({ status: 'spec_draft' }).eq('id', id)

    return NextResponse.json({ spec, isFallback, version: nextVersion })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Error generating spec:', errMsg)
    return NextResponse.json({ error: `정의서 생성 중 오류: ${errMsg}`, errorType: 'unknown' }, { status: 500 })
  }
}

// =====================================================
// PUT: 정의서 수정
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const admin = createAdminClient()

    // 최신 draft 정의서 업데이트
    const { data: latestSpec } = await admin
      .from('specs')
      .select('id')
      .eq('feature_id', id)
      .eq('status', 'draft')
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (!latestSpec) return NextResponse.json({ error: '수정할 초안 정의서가 없습니다' }, { status: 404 })

    // raw_content가 포함된 경우 → 구조화 필드 재파싱해서 함께 업데이트
    let updatePayload = { ...body }
    if (body.raw_content) {
      const parsed = parseSpecContent(body.raw_content)
      // qa_checklist_raw는 jsonb 컬럼으로 별도 변환
      const qaRawText = parsed.qa_checklist_raw as string | undefined
      delete parsed.qa_checklist_raw
      let qaChecklist: { id: string; item: string; checked: boolean }[] | null = null
      if (qaRawText) {
        const lines = qaRawText.split('\n').filter(l => l.trim().startsWith('- ['))
        qaChecklist = lines.map((line, idx) => ({
          id: `qa${idx + 1}`,
          item: line.replace(/^- \[[ x]\] /, '').trim(),
          checked: false,
        }))
      }
      updatePayload = {
        ...body,
        ...parsed,
        ...(qaChecklist && qaChecklist.length > 0 ? { qa_checklist: qaChecklist } : {}),
      }
    }

    const { data: spec, error } = await admin
      .from('specs')
      .update(updatePayload)
      .eq('id', latestSpec.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ spec })
  } catch (error) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}

// =====================================================
// Fallback 초안 생성 (OpenAI 없이)
// =====================================================
function generateFallbackSpec(feature: Record<string, unknown>, projectGoal: string, projectName: string): string {
  const fname = String(feature.name || '')
  const fdesc = String(feature.description || '상세 설명이 입력되지 않았습니다.')
  const feffect = String(feature.expected_effect || '기대 효과가 입력되지 않았습니다.')
  const fpriority = String(feature.priority_group || '')

  return `---
## 기능명
${fname}

## 기능 배경
[AI 초안 — 직접 수정 필요]
프로젝트: ${projectName}
목표: ${projectGoal}
우선순위: ${fpriority}

기능 설명: ${fdesc}

## 현재 문제
[직접 작성 필요]
이 기능이 없을 때 발생하는 구체적인 문제를 작성해주세요.
- 문제 1:
- 문제 2:

## 관련 사용자
[직접 작성 필요]
이 프로젝트의 실제 사용자 유형과 각자의 니즈를 작성해주세요.
- 사용자 유형 1: 니즈
- 사용자 유형 2: 니즈

## 포함 범위 (In Scope)
[직접 작성 필요]
- [ ] 이번 개발에 포함될 기능 1
- [ ] 이번 개발에 포함될 기능 2
- [ ] 이번 개발에 포함될 기능 3

## 제외 범위 (Out of Scope)
[직접 작성 필요]
- 이번 범위에서 제외할 사항:

## 화면 흐름
[직접 작성 필요]
1. 사용자가 → 화면 진입
2. → 액션 수행
3. → 결과 확인

## 상태값 (State Values)
[직접 작성 필요]
- 상태값 1: 설명
- 상태값 2: 설명

## 알림 조건
[직접 작성 필요]
- 어떤 상황에서 누구에게 어떤 알림을 보내는지 작성

## 어드민 기능
[직접 작성 필요]
- 관리자가 할 수 있어야 하는 기능:

## 데이터 항목
[직접 작성 필요]
- 필드명: 타입, 설명
- 필드명: 타입, 설명

## 예외 케이스
[직접 작성 필요]
- 케이스 1: 처리 방법
- 케이스 2: 처리 방법

## 수용 기준 (Acceptance Criteria)
[직접 작성 필요]
- [ ] Given: / When: / Then:
- [ ] Given: / When: / Then:

## QA 체크리스트
[직접 작성 필요]
**정상 플로우**
- [ ] 기본 동작 확인
- [ ] 성공 시나리오 확인

**예외 케이스**
- [ ] 빈 값 처리 확인
- [ ] 권한 없는 접근 확인

## 외주사 예상 질문
[직접 작성 필요]
- Q: 예상 질문 1
- Q: 예상 질문 2

## 기본 답변 초안
[직접 작성 필요]
- A: 질문 1에 대한 답변
- A: 질문 2에 대한 답변
---

> ⚠️ 이 정의서는 AI 없이 생성된 기본 템플릿입니다.
> [직접 작성 필요] 항목을 채워주시거나,
> OpenAI API 키를 설정한 후 "AI 재생성" 버튼을 눌러주세요.
> 기능 설명: ${fdesc}
> 기대 효과: ${feffect}`
}

// =====================================================
// 파싱 함수
// =====================================================
function parseSpecContent(raw: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const sectionMap: Record<string, string> = {
    '기능 배경': 'background',
    '현재 문제': 'current_problem',
    '관련 사용자': 'related_users',
    '포함 범위': 'in_scope',
    '제외 범위': 'out_of_scope',
    '화면 흐름': 'screen_flow',
    '상태값': 'state_values',
    '알림 조건': 'notification_conditions',
    '어드민 기능': 'admin_features',
    '데이터 항목': 'data_items',
    '예외 케이스': 'edge_cases',
    '수용 기준': 'acceptance_criteria',
    'QA 체크리스트': 'qa_checklist_raw', // raw text, parsed separately
    '외주사 예상 질문': 'vendor_expected_questions',
    '기본 답변 초안': 'vendor_answer_drafts',
  }

  Object.entries(sectionMap).forEach(([heading, field]) => {
    const regex = new RegExp(`## ${heading}[^\n]*\n([\\s\\S]*?)(?=\n## |$)`, 'i')
    const match = raw.match(regex)
    if (match) {
      sections[field] = match[1].trim()
    }
  })

  return sections
}
