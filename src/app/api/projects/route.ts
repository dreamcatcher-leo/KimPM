import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const BEFOREPET_SEED_FEATURES = [
  { order_key: 'P0-1', name: '업로드·촬영 장애 핫픽스', category: '기존_보완', description: '사진 업로드 및 촬영 기능에서 발생하는 장애를 긴급 수정합니다. 사용자가 강아지 사진, 신분증, 활동 증빙을 업로드할 때 실패하는 케이스를 모두 식별하고 수정합니다.', expected_effect: '가입 완료율 및 서비스 신청 완료율 향상. 현재 업로드 실패로 인한 이탈 감소.', priority_group: 'P0' },
  { order_key: 'P0-2', name: '보호자·도그워커 가입 루트 병렬화', category: '기존_보완', description: '보호자와 도그워커 가입 경로를 완전히 분리하여 각 역할에 최적화된 온보딩 흐름을 제공합니다. 현재 단일 가입 루트로 인한 혼란을 해소합니다.', expected_effect: '역할별 가입 완료율 향상. 잘못된 역할 선택으로 인한 CS 문의 감소.', priority_group: 'P0' },
  { order_key: 'P0-3', name: '강아지 프로필 생성 분리', category: '기존_보완', description: '기존 회원가입 단계에 포함된 강아지 프로필 생성을 별도 단계로 분리합니다. 가입 완료 후 서비스 이용 시점에 강아지 프로필을 등록하도록 UX를 개선합니다.', expected_effect: '가입 완료율 향상. 강아지 프로필 정보의 정확도 향상.', priority_group: 'P0' },
  { order_key: 'P0-4', name: '주소 기반 서비스 가능 지역 판별', category: '기존_보완', description: '보호자가 입력한 주소를 기반으로 서비스 가능 지역 여부를 실시간으로 판별합니다. 서비스 불가 지역에서의 신청 시도를 사전에 안내합니다.', expected_effect: '서비스 불가 지역 신청으로 인한 매칭 실패 감소. 운영 효율화.', priority_group: 'P0' },
  { order_key: 'P0-5', name: '맹견·입질견 신청 차단', category: '신규_개발_기존_보완', description: '법정 맹견 또는 입질 이력이 있는 강아지의 서비스 신청을 자동으로 차단합니다. 견종 선택 및 추가 질문을 통해 판별하며, 차단 시 안내 메시지를 제공합니다.', expected_effect: '도그워커 안전 보호. 법적 리스크 감소. 서비스 품질 유지.', priority_group: 'P0' },
  { order_key: 'P0-6', name: '모드 고정 기능', category: '기존_보완', description: '보호자/도그워커 이중 역할 사용자가 특정 모드로 앱을 고정할 수 있는 설정을 제공합니다. 모드 전환 시 불필요한 혼란을 방지합니다.', expected_effect: 'UX 혼란 감소. 이중 역할 사용자의 편의성 향상.', priority_group: 'P0' },
  { order_key: 'P0-7', name: '기본 퍼널 계측', category: '신규_개발_기존_보완', description: '핵심 사용자 퍼널의 각 단계별 전환율을 계측하는 이벤트 트래킹을 구현합니다.', expected_effect: '데이터 기반 의사결정 가능. 이탈 지점 식별 및 개선 방향 도출.', priority_group: 'P0' },
  { order_key: 'P1-1', name: '도그워커 필수 온보딩 게이트', category: '신규_개발', description: '도그워커가 서비스를 시작하기 전 필수 이수해야 하는 온보딩 과정을 게이트로 구현합니다. 신분 확인, 교육 이수, 프로필 완성도 검토가 포함됩니다.', expected_effect: '서비스 품질 보장. 보호자 신뢰도 향상. 미완성 프로필 도그워커로 인한 매칭 실패 감소.', priority_group: 'P1' },
  { order_key: 'P1-2', name: '구독형 요청 노출 및 요일 체인 수락', category: '신규_개발', description: '보호자의 정기 산책 구독 요청을 도그워커에게 노출하고, 도그워커가 특정 요일 패턴으로 요청을 수락할 수 있는 체인 수락 기능을 구현합니다.', expected_effect: '정기 매칭율 향상. 도그워커 수익 안정성 향상.', priority_group: 'P1' },
  { order_key: 'P1-3', name: '일정 변경·취소 자동 처리', category: '신규_개발', description: '보호자 또는 도그워커가 일정 변경/취소 요청 시 자동으로 상대방에게 알림을 발송하고, 정책에 따라 패널티 또는 환불을 처리합니다.', expected_effect: '수동 CS 처리 시간 감소. 일정 변경 관련 분쟁 감소.', priority_group: 'P1' },
  { order_key: 'P1-4', name: '구독형 미이행 회차 환불·보전 처리', category: '신규_개발_기존_보완', description: '구독형 서비스에서 도그워커 미이행 또는 취소 발생 시 해당 회차에 대한 환불 또는 크레딧 보전을 자동으로 처리합니다.', expected_effect: '보호자 신뢰 보호. 환불 관련 CS 자동화. 구독 유지율 향상.', priority_group: 'P1' },
  { order_key: 'P1-5', name: '정산 및 세무 자료 자동화', category: '신규_개발_기존_보완', description: '도그워커 정산을 자동화하고, 세무 신고에 필요한 자료를 자동으로 생성하여 제공합니다.', expected_effect: '정산 처리 시간 감소. 세무 관련 오류 감소.', priority_group: 'P1' },
  { order_key: 'P1-6', name: '도그워커 베네핏·페널티 어드민', category: '신규_개발', description: '도그워커의 성과 기반 베네핏 및 페널티를 어드민에서 관리할 수 있는 시스템을 구현합니다.', expected_effect: '도그워커 퀄리티 관리 자동화. 1인 운영 효율화.', priority_group: 'P1' },
  { order_key: 'P1-7', name: '푸시·알림톡 이벤트 관리', category: '신규_개발_기존_보완', description: '앱 푸시 알림 및 카카오 알림톡의 이벤트 트리거, 메시지 템플릿, 발송 이력을 어드민에서 관리할 수 있는 시스템을 구현합니다.', expected_effect: '알림 발송 오류 감소. 알림 관리 효율화.', priority_group: 'P1' },
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { seed_data, ai_features, start_mode, ai_analysis, ...projectData } = body

    const admin = createAdminClient()

    const { data: project, error } = await admin
      .from('projects')
      .insert({
        ...projectData,
        founder_id: user.id,
        contract_amount: projectData.contract_amount ? parseInt(projectData.contract_amount) : null,
      })
      .select()
      .single()

    if (error) throw error

    // AI 분석 기능 목록 저장
    if (ai_features && Array.isArray(ai_features) && ai_features.length > 0 && project) {
      const featuresWithProject = ai_features.map((f: Record<string, unknown>) => ({
        order_key: f.order_key,
        name: f.name,
        category: f.category || '신규_개발',
        description: String(f.description || ''),
        expected_effect: String(f.expected_effect || ''),
        priority_group: f.priority_group || 'P0',
        project_id: project.id,
        status: 'planning',
        is_seed: false,
      }))
      await admin.from('features').insert(featuresWithProject)
    }

    // 비포펫 예시 템플릿 기능 저장
    if (seed_data && project) {
      const featuresWithProject = BEFOREPET_SEED_FEATURES.map(f => ({
        ...f,
        project_id: project.id,
        status: 'planning',
        is_seed: true,
      }))
      await admin.from('features').insert(featuresWithProject)
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('founder_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
