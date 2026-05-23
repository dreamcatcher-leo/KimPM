-- =====================================================
-- DeliveryGuard PM — BeforePet POC 데모 시드 데이터 v2
-- 스키마 완전 정합 버전 | WeeklyReport 포함
-- 실행: Supabase SQL Editor → 전체 복붙 → Run
-- 전제: 001_initial_schema.sql 실행 완료 + 대표 계정 1개 존재
-- =====================================================
-- 생성 데이터:
--   Project 1개, Feature 14개, Spec 8개
--   WeeklyPlan 3주치 (지난주 완료 + 이번주 진행 + 다음주 초안)
--   Report 14개 (7일 분산), Evidence 21개
--   DailyAssessment 14개, MustCheckItem 5개
--   Risk 8개, Decision 4개, ChangeRequest 3개
--   CompletionCandidate 2개, FounderDailyBrief 4일치
--   Question 4개
-- =====================================================

-- =====================================================
-- STEP 0. 기존 데모 데이터 초기화 (재실행 안전)
-- =====================================================
DO $$
DECLARE
  v_pid UUID;
BEGIN
  SELECT id INTO v_pid FROM projects WHERE name = 'BeforePet 앱 개발 (외주 1차)';
  IF v_pid IS NOT NULL THEN
    DELETE FROM notifications WHERE project_id = v_pid;
    DELETE FROM founder_daily_briefs WHERE project_id = v_pid;
    DELETE FROM must_check_items WHERE project_id = v_pid;
    DELETE FROM daily_assessments WHERE project_id = v_pid;
    DELETE FROM evidence_items WHERE project_id = v_pid;
    DELETE FROM vendor_private_notes WHERE project_id = v_pid;
    DELETE FROM completion_candidates WHERE project_id = v_pid;
    DELETE FROM change_requests WHERE project_id = v_pid;
    DELETE FROM decisions WHERE project_id = v_pid;
    DELETE FROM questions WHERE project_id = v_pid;
    DELETE FROM risks WHERE project_id = v_pid;
    DELETE FROM reports WHERE project_id = v_pid;
    DELETE FROM weekly_plans WHERE project_id = v_pid;
    DELETE FROM specs WHERE feature_id IN (SELECT id FROM features WHERE project_id = v_pid);
    DELETE FROM features WHERE project_id = v_pid;
    DELETE FROM access_links WHERE project_id = v_pid;
    DELETE FROM projects WHERE id = v_pid;
  END IF;
END $$;

-- =====================================================
-- STEP 1 ~ END. 전체 데이터 생성 (단일 DO 블록)
-- =====================================================
DO $$
DECLARE
  -- 핵심 UUID
  v_founder_id    UUID;
  v_project_id    UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_link_id       UUID := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  v_token         TEXT := 'beforepet-vendor-demo-token-2024';

  -- Feature IDs (P0)
  fid_p0_1 UUID := '00000001-0001-0000-0000-000000000001';
  fid_p0_2 UUID := '00000001-0001-0000-0000-000000000002';
  fid_p0_3 UUID := '00000001-0001-0000-0000-000000000003';
  fid_p0_4 UUID := '00000001-0001-0000-0000-000000000004';
  fid_p0_5 UUID := '00000001-0001-0000-0000-000000000005';
  fid_p0_6 UUID := '00000001-0001-0000-0000-000000000006';
  fid_p0_7 UUID := '00000001-0001-0000-0000-000000000007';
  -- Feature IDs (P1)
  fid_p1_1 UUID := '00000001-0001-0000-0000-000000000011';
  fid_p1_2 UUID := '00000001-0001-0000-0000-000000000012';
  fid_p1_3 UUID := '00000001-0001-0000-0000-000000000013';
  fid_p1_4 UUID := '00000001-0001-0000-0000-000000000014';
  fid_p1_5 UUID := '00000001-0001-0000-0000-000000000015';
  fid_p1_6 UUID := '00000001-0001-0000-0000-000000000016';
  fid_p1_7 UUID := '00000001-0001-0000-0000-000000000017';

  -- Spec IDs
  sid_p0_1_v1 UUID := '00000002-0001-0000-0000-000000000001';
  sid_p0_1_v2 UUID := '00000002-0001-0000-0000-000000000002';
  sid_p0_2_v1 UUID := '00000002-0001-0000-0000-000000000003';
  sid_p0_3_v1 UUID := '00000002-0001-0000-0000-000000000004';
  sid_p0_4_v1 UUID := '00000002-0001-0000-0000-000000000005';
  sid_p0_5_v1 UUID := '00000002-0001-0000-0000-000000000006';
  sid_p1_1_v1 UUID := '00000002-0001-0000-0000-000000000011';
  sid_p1_5_v1 UUID := '00000002-0001-0000-0000-000000000015';

  -- WeeklyPlan IDs
  wp_prev UUID := '00000003-0001-0000-0000-000000000001';
  wp_curr UUID := '00000003-0001-0000-0000-000000000002';
  wp_next UUID := '00000003-0001-0000-0000-000000000003';

  -- Report IDs (14개)
  rid_01 UUID := '00000004-0001-0000-0000-000000000001';
  rid_02 UUID := '00000004-0001-0000-0000-000000000002';
  rid_03 UUID := '00000004-0001-0000-0000-000000000003';
  rid_04 UUID := '00000004-0001-0000-0000-000000000004';
  rid_05 UUID := '00000004-0001-0000-0000-000000000005';
  rid_06 UUID := '00000004-0001-0000-0000-000000000006';
  rid_07 UUID := '00000004-0001-0000-0000-000000000007';
  rid_08 UUID := '00000004-0001-0000-0000-000000000008';
  rid_09 UUID := '00000004-0001-0000-0000-000000000009';
  rid_10 UUID := '00000004-0001-0000-0000-000000000010';
  rid_11 UUID := '00000004-0001-0000-0000-000000000011';
  rid_12 UUID := '00000004-0001-0000-0000-000000000012';
  rid_13 UUID := '00000004-0001-0000-0000-000000000013';
  rid_14 UUID := '00000004-0001-0000-0000-000000000014';

  -- Risk IDs
  risk_01 UUID := '00000005-0001-0000-0000-000000000001';
  risk_02 UUID := '00000005-0001-0000-0000-000000000002';
  risk_03 UUID := '00000005-0001-0000-0000-000000000003';
  risk_04 UUID := '00000005-0001-0000-0000-000000000004';
  risk_05 UUID := '00000005-0001-0000-0000-000000000005';
  risk_06 UUID := '00000005-0001-0000-0000-000000000006';
  risk_07 UUID := '00000005-0001-0000-0000-000000000007';
  risk_08 UUID := '00000005-0001-0000-0000-000000000008';

  -- Decision IDs
  dec_01 UUID := '00000006-0001-0000-0000-000000000001';
  dec_02 UUID := '00000006-0001-0000-0000-000000000002';
  dec_03 UUID := '00000006-0001-0000-0000-000000000003';
  dec_04 UUID := '00000006-0001-0000-0000-000000000004';

  -- ChangeRequest IDs
  cr_01 UUID := '00000007-0001-0000-0000-000000000001';
  cr_02 UUID := '00000007-0001-0000-0000-000000000002';
  cr_03 UUID := '00000007-0001-0000-0000-000000000003';

  -- CompletionCandidate IDs
  cc_01 UUID := '00000008-0001-0000-0000-000000000001';
  cc_02 UUID := '00000008-0001-0000-0000-000000000002';

  -- Question IDs
  q_01 UUID := '00000009-0001-0000-0000-000000000001';
  q_02 UUID := '00000009-0001-0000-0000-000000000002';
  q_03 UUID := '00000009-0001-0000-0000-000000000003';
  q_04 UUID := '00000009-0001-0000-0000-000000000004';

  -- MustCheck IDs
  mc_01 UUID := '00000010-0001-0000-0000-000000000001';
  mc_02 UUID := '00000010-0001-0000-0000-000000000002';
  mc_03 UUID := '00000010-0001-0000-0000-000000000003';
  mc_04 UUID := '00000010-0001-0000-0000-000000000004';
  mc_05 UUID := '00000010-0001-0000-0000-000000000005';

  -- 날짜 변수 (현재 기준 상대)
  d_7 DATE := CURRENT_DATE - 7;
  d_6 DATE := CURRENT_DATE - 6;
  d_5 DATE := CURRENT_DATE - 5;
  d_4 DATE := CURRENT_DATE - 4;
  d_3 DATE := CURRENT_DATE - 3;
  d_2 DATE := CURRENT_DATE - 2;
  d_1 DATE := CURRENT_DATE - 1;
  d_0 DATE := CURRENT_DATE;
  d_p1 DATE := CURRENT_DATE + 1;
  d_p7 DATE := CURRENT_DATE + 7;
  d_p14 DATE := CURRENT_DATE + 14;

BEGIN

  -- =====================================================
  -- STEP 1. Founder ID 조회
  -- =====================================================
  SELECT id INTO v_founder_id FROM profiles LIMIT 1;
  IF v_founder_id IS NULL THEN
    RAISE EXCEPTION '❌ Founder 계정 없음. Supabase Auth에서 유저를 먼저 생성해주세요.';
  END IF;

  -- =====================================================
  -- STEP 2. 프로젝트 생성
  -- =====================================================
  INSERT INTO projects (
    id, name, vendor_name, vendor_contact_name, vendor_contact_email,
    contract_start, contract_end, contract_amount,
    goal, description, status, founder_id, brief_send_time
  ) VALUES (
    v_project_id,
    'BeforePet 앱 개발 (외주 1차)',
    '(주)데브스튜디오',
    '김민준',
    'minjun@devstudio.kr',
    CURRENT_DATE - 30,
    CURRENT_DATE + 60,
    24000000,
    '비포펫 앱의 핵심 UX 장애 해소 및 P0 기능 전량 완료. 가입 완료율 80% 이상 달성.',
    '보호자·도그워커 가입 루트 정비, 업로드 핫픽스, 맹견 차단, 퍼널 계측 포함 P0 7개 + P1 7개 총 14개 기능 외주 개발 프로젝트.',
    'active',
    v_founder_id,
    '09:00'
  );

  -- =====================================================
  -- STEP 3. 외주사 접근 링크
  -- =====================================================
  INSERT INTO access_links (id, project_id, token, vendor_name, vendor_email, is_active)
  VALUES (
    v_link_id, v_project_id,
    v_token,
    '(주)데브스튜디오',
    'minjun@devstudio.kr',
    TRUE
  );

  -- =====================================================
  -- STEP 4. Feature 14개 (P0-1 ~ P0-7, P1-1 ~ P1-7)
  -- 상태 분포: approved×2, completed_candidate×1,
  --            in_progress×4, spec_draft×3, planning×4
  -- =====================================================

  -- [시나리오 A] P0-1: 완료 승인 — 업로드 핫픽스
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p0_1, v_project_id, 'P0-1', '업로드·촬영 장애 핫픽스', '기존_보완',
    '사진 업로드 및 촬영 기능에서 발생하는 장애를 긴급 수정합니다. 강아지 사진, 신분증, 활동 증빙 업로드 실패 케이스를 모두 식별하고 수정합니다. iOS 15 이상에서 카메라 권한 재요청 버그, Android S22 기종 특정 용량 초과 시 silent 실패 문제 포함.',
    '가입 완료율 및 서비스 신청 완료율 향상. 업로드 실패로 인한 이탈 15~20% 감소 예상.',
    'P0', 'approved', TRUE);

  -- [시나리오 E] P0-2: 완료 후보 — QA 미완료
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p0_2, v_project_id, 'P0-2', '보호자·도그워커 가입 루트 병렬화', '기존_보완',
    '보호자와 도그워커 가입 경로를 완전히 분리하여 각 역할에 최적화된 온보딩 흐름을 제공합니다. 현재 단일 가입 루트로 인해 역할 선택 혼란이 발생하고, 잘못된 역할로 가입 후 CS 문의가 월 40건 이상 발생 중.',
    '역할별 가입 완료율 향상. 잘못된 역할 선택으로 인한 CS 문의 50% 감소.',
    'P0', 'completed_candidate', TRUE);

  -- [시나리오 C] P0-3: 진행중 — 보고는 하지만 진척 불명확
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p0_3, v_project_id, 'P0-3', '강아지 프로필 생성 분리', '기존_보완',
    '기존 회원가입 단계에 포함된 강아지 프로필 생성을 별도 단계로 분리합니다. 가입 완료 후 서비스 이용 시점에 강아지 프로필을 등록하도록 UX를 개선합니다. 현재 가입 중 프로필 입력으로 인한 이탈률이 32%.',
    '가입 완료율 향상. 강아지 프로필 정보 정확도 향상.',
    'P0', 'in_progress', TRUE);

  -- [시나리오 D] P0-4: 진행중 — 대표 판단 필요 (정의서와 다른 방향 제안)
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p0_4, v_project_id, 'P0-4', '주소 기반 서비스 가능 지역 판별', '기존_보완',
    '보호자가 입력한 주소를 기반으로 서비스 가능 지역 여부를 실시간으로 판별합니다. 서비스 불가 지역에서의 신청 시도를 사전에 안내합니다. 현재 서비스 불가 지역 신청으로 인한 매칭 실패가 월 60건.',
    '서비스 불가 지역 신청으로 인한 매칭 실패 80% 감소. 운영 효율화.',
    'P0', 'in_progress', TRUE);

  -- P0-5: 정의서 작성중
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p0_5, v_project_id, 'P0-5', '맹견·입질견 신청 차단', '신규_개발_기존_보완',
    '법정 맹견 또는 입질 이력이 있는 강아지의 서비스 신청을 자동으로 차단합니다. 견종 선택 및 추가 질문을 통해 판별하며, 차단 시 안내 메시지를 제공합니다.',
    '도그워커 안전 보호. 법적 리스크 감소. 서비스 품질 유지.',
    'P0', 'spec_draft', TRUE);

  -- P0-6: 정의서 작성중
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p0_6, v_project_id, 'P0-6', '모드 고정 기능', '기존_보완',
    '보호자/도그워커 이중 역할 사용자가 특정 모드로 앱을 고정할 수 있는 설정을 제공합니다. 모드 전환 시 불필요한 혼란을 방지합니다.',
    'UX 혼란 감소. 이중 역할 사용자 편의성 향상.',
    'P0', 'spec_draft', TRUE);

  -- P0-7: 미시작
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p0_7, v_project_id, 'P0-7', '기본 퍼널 계측', '신규_개발_기존_보완',
    '핵심 사용자 퍼널(가입→프로필→서비스신청→매칭→완료)의 각 단계별 전환율을 계측하는 이벤트 트래킹을 구현합니다.',
    '데이터 기반 의사결정 가능. 이탈 지점 식별 및 개선 방향 도출.',
    'P0', 'planning', TRUE);

  -- [시나리오 B] P1-1: 진행중 — PR 없는 의미 있는 작업
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p1_1, v_project_id, 'P1-1', '도그워커 필수 온보딩 게이트', '신규_개발',
    '도그워커가 서비스를 시작하기 전 필수 이수해야 하는 온보딩 과정을 게이트로 구현합니다. 신분 확인, 교육 이수, 프로필 완성도 검토가 포함됩니다.',
    '서비스 품질 보장. 보호자 신뢰도 향상. 미완성 프로필 도그워커로 인한 매칭 실패 감소.',
    'P1', 'in_progress', TRUE);

  -- [시나리오 A 변형] P1-2: 진행중 — 정상 진행
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p1_2, v_project_id, 'P1-2', '구독형 요청 노출 및 요일 체인 수락', '신규_개발',
    '보호자의 정기 산책 구독 요청을 도그워커에게 노출하고, 도그워커가 특정 요일 패턴으로 요청을 수락할 수 있는 체인 수락 기능을 구현합니다.',
    '정기 매칭율 향상. 도그워커 수익 안정성 향상.',
    'P1', 'in_progress', TRUE);

  -- P1-3: 미시작
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p1_3, v_project_id, 'P1-3', '일정 변경·취소 자동 처리', '신규_개발',
    '보호자 또는 도그워커가 일정 변경/취소 요청 시 자동으로 상대방에게 알림을 발송하고, 정책에 따라 패널티 또는 환불을 처리합니다.',
    '수동 CS 처리 시간 감소. 일정 변경 관련 분쟁 감소.',
    'P1', 'planning', TRUE);

  -- P1-4: 미시작
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p1_4, v_project_id, 'P1-4', '구독형 미이행 회차 환불·보전 처리', '신규_개발_기존_보완',
    '구독형 서비스에서 도그워커 미이행 또는 취소 발생 시 해당 회차에 대한 환불 또는 크레딧 보전을 자동으로 처리합니다.',
    '보호자 신뢰 보호. 환불 관련 CS 자동화. 구독 유지율 향상.',
    'P1', 'planning', TRUE);

  -- [시나리오 A] P1-5: 완료 승인 — 정산 자동화
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p1_5, v_project_id, 'P1-5', '정산 및 세무 자료 자동화', '신규_개발_기존_보완',
    '도그워커 정산을 자동화하고, 세무 신고에 필요한 자료(간이영수증, 거래 내역)를 자동으로 생성하여 제공합니다. 매월 수동 정산 작업 8시간 이상 소요 중.',
    '정산 처리 시간 90% 감소. 세무 관련 오류 감소. 도그워커 만족도 향상.',
    'P1', 'approved', TRUE);

  -- P1-6: 정의서 작성중
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p1_6, v_project_id, 'P1-6', '도그워커 베네핏·페널티 어드민', '신규_개발',
    '도그워커의 성과 기반 베네핏(보너스, 배지, 우선 노출) 및 페널티(경고, 정지)를 어드민에서 관리할 수 있는 시스템을 구현합니다.',
    '도그워커 퀄리티 관리 자동화. 1인 운영 효율화.',
    'P1', 'spec_draft', TRUE);

  -- P1-7: 미시작
  INSERT INTO features (id, project_id, order_key, name, category, description, expected_effect, priority_group, status, is_seed)
  VALUES (fid_p1_7, v_project_id, 'P1-7', '푸시·알림톡 이벤트 관리', '신규_개발_기존_보완',
    '앱 푸시 알림 및 카카오 알림톡의 이벤트 트리거, 메시지 템플릿, 발송 이력을 어드민에서 관리할 수 있는 시스템을 구현합니다.',
    '알림 발송 오류 감소. 알림 관리 효율화. 사용자 참여율 향상.',
    'P1', 'planning', TRUE);

  -- =====================================================
  -- STEP 5. Spec 8개
  -- =====================================================

  -- P0-1 v1 (초안) — 업로드 핫픽스 초기 정의서
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, acceptance_criteria, qa_checklist,
    approved_at, approved_by, created_at)
  VALUES (sid_p0_1_v1, fid_p0_1, 1, 'archived',
    '[P0-1] 업로드·촬영 장애 핫픽스 v1',
    '비포펫 앱에서 사진 업로드 실패 케이스가 다수 보고되어 가입 이탈이 발생하고 있습니다.',
    'iOS 15+ 카메라 권한 재요청 누락, Android S22 계열 4MB 초과 시 silent 실패, 일부 HEIC 포맷 미처리.',
    '카메라 권한 재요청 로직 수정, Android 용량 초과 명시 에러 처리, HEIC 자동 변환 추가',
    '신규 업로드 UI 개편, 동영상 업로드',
    '1. iOS 15에서 카메라 권한 거부 후 재요청 시 설정 유도 팝업 표시\n2. 4MB 초과 파일 선택 시 명확한 에러 메시지 노출\n3. HEIC 파일 업로드 성공률 100%',
    '[{"id":"qa1","item":"iOS 15 카메라 권한 거부 후 재요청 플로우","checked":true},{"id":"qa2","item":"Android S22 4MB 초과 에러 메시지","checked":true},{"id":"qa3","item":"HEIC 파일 업로드 변환","checked":true}]',
    NOW() - INTERVAL '20 days', v_founder_id, NOW() - INTERVAL '25 days');

  -- P0-1 v2 (승인) — 대표 피드백 반영 최종본
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, acceptance_criteria, qa_checklist,
    edge_cases, vendor_expected_questions,
    approved_at, approved_by, created_at)
  VALUES (sid_p0_1_v2, fid_p0_1, 2, 'approved',
    '[P0-1] 업로드·촬영 장애 핫픽스 v2 (대표 피드백 반영)',
    '업로드 장애로 인해 가입 완료율이 저하되고 있으며, 특히 iOS 15+ 및 Android S22 기종에서 집중적으로 발생합니다. 월 평균 CS 접수 28건 중 17건이 업로드 관련.',
    'iOS 15+: 카메라 권한 재요청 시 OS 팝업 미표시\nAndroid S22: 4MB 초과 파일 선택 시 silent 실패 (에러 메시지 없음)\nHEIC 포맷: 서버에서 미처리로 업로드 실패',
    '카메라 권한 재요청 → iOS 설정 유도 딥링크\nAndard 파일 용량 초과 명시 에러 + 가이드\nHEIC → JPEG 클라이언트 사이드 자동 변환\n업로드 실패 시 구체적 에러 코드 로깅',
    '신규 업로드 UI 리디자인\n동영상 업로드 기능\n서버 사이드 이미지 처리 변경',
    '1. iOS 15 이상에서 카메라 권한 거부 후 재요청 시 → 앱 설정 유도 팝업 노출 및 딥링크 작동\n2. Android에서 4MB 초과 파일 선택 시 "파일 크기가 초과되었습니다 (최대 4MB)" 메시지 노출\n3. HEIC 파일 선택 시 JPEG 변환 후 업로드 성공\n4. 업로드 실패 시 Sentry에 에러 코드 기록',
    '[{"id":"qa1","item":"iOS 15 카메라 권한 거부 후 재요청 플로우 확인","checked":true},{"id":"qa2","item":"iOS 16, 17 정상 동작 확인","checked":true},{"id":"qa3","item":"Android S22 4MB 초과 에러 메시지 확인","checked":true},{"id":"qa4","item":"HEIC 파일 업로드 후 서버 이미지 확인","checked":true},{"id":"qa5","item":"Sentry 에러 로그 기록 확인","checked":true}]',
    '삼성 Galaxy S23 이상에서도 동일 현상 확인 필요. PNG 파일은 기존 로직 그대로.',
    'HEIC 변환 라이브러리 선택 기준이 있나요? → 번들 용량 최소화 원칙으로 heic2any 경량 버전 사용',
    NOW() - INTERVAL '15 days', v_founder_id, NOW() - INTERVAL '18 days');

  -- P0-2 v1 (승인) — 가입 루트 병렬화
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, acceptance_criteria, qa_checklist,
    edge_cases, approved_at, approved_by, created_at)
  VALUES (sid_p0_2_v1, fid_p0_2, 1, 'approved',
    '[P0-2] 보호자·도그워커 가입 루트 병렬화',
    '현재 단일 가입 플로우에서 역할을 선택하는 방식으로, 가입 초반에 역할 이해가 부족한 신규 사용자의 혼란이 큽니다.',
    '단일 진입점에서 역할 선택 → 이후 플로우가 역할별로 분기되나, 분기 전 공통 입력 필드가 많아 혼란 발생. 잘못된 역할 선택 후 탈퇴 재가입 CS 월 40건+.',
    '보호자 전용 가입 화면 (랜딩 → 기본정보 → 약관 → 완료)\n도그워커 전용 가입 화면 (랜딩 → 기본정보 → 신분확인 안내 → 약관 → 완료)\n역할별 별도 딥링크 지원',
    '소셜 로그인 추가, 가입 완료 후 온보딩 퀴즈',
    '1. 보호자 가입 플로우 완료 시 보호자 홈으로 이동\n2. 도그워커 가입 플로우 완료 시 신분 확인 대기 화면으로 이동\n3. 각 플로우에서 뒤로가기 시 이전 단계로 돌아감\n4. 역할 선택 화면에서 "잘못 선택했어요" 안내 링크 표시',
    '[{"id":"qa1","item":"보호자 가입 플로우 전체 완료","checked":true},{"id":"qa2","item":"도그워커 가입 플로우 전체 완료","checked":true},{"id":"qa3","item":"역할별 홈 이동 확인","checked":true},{"id":"qa4","item":"뒤로가기 정상 동작","checked":true},{"id":"qa5","item":"잘못 선택 안내 링크 동작","checked":false}]',
    '이미 가입한 사용자가 역할 변경을 원하는 경우 → 이번 범위 외, CS 처리.',
    NOW() - INTERVAL '5 days', v_founder_id, NOW() - INTERVAL '8 days');

  -- P0-3 v1 (초안) — 강아지 프로필 분리
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, acceptance_criteria, qa_checklist,
    created_at)
  VALUES (sid_p0_3_v1, fid_p0_3, 1, 'draft',
    '[P0-3] 강아지 프로필 생성 분리 v1 (초안)',
    '현재 가입 4단계에 강아지 프로필 입력이 포함되어 있어, 가입 도중 이탈률이 높습니다.',
    '가입 중 강아지 이름, 품종, 나이, 예방접종 이력 등 입력 필수 → 준비 안 된 상태에서 이탈.\n강아지 없이 가입하려는 사용자(미래 보호자) 가입 불가.',
    '가입 시 강아지 프로필 입력 단계 제거\n가입 완료 후 홈에서 강아지 프로필 추가 유도 배너 노출\n강아지 없는 상태로 서비스 탐색 허용',
    '강아지 프로필 화면 UI 개편 (별도 티켓)',
    '1. 가입 완료 후 강아지 프로필 없이 홈 진입 가능\n2. 홈 상단 "강아지를 등록해보세요" 배너 노출\n3. 서비스 신청 시 강아지 없으면 프로필 등록 유도',
    '[{"id":"qa1","item":"강아지 없이 가입 완료 후 홈 진입","checked":false},{"id":"qa2","item":"홈 배너 노출 확인","checked":false},{"id":"qa3","item":"서비스 신청 시 강아지 등록 유도","checked":false}]',
    NOW() - INTERVAL '3 days');

  -- P0-4 v1 (초안) — 지역 판별
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, acceptance_criteria, qa_checklist,
    created_at)
  VALUES (sid_p0_4_v1, fid_p0_4, 1, 'draft',
    '[P0-4] 주소 기반 서비스 가능 지역 판별 v1 (초안 — 방향 협의 필요)',
    '서비스 가능 지역(현재 서울 강남, 서초, 송파구)이 명확히 안내되지 않아 불가 지역 신청 후 매칭 실패가 반복됩니다.',
    '서비스 불가 지역 신청 → 매칭 실패 → CS 처리 월 60건. 사용자 불만 누적.',
    '주소 입력 시 지도 API(카카오맵 or Tmap) 연동\n서비스 가능 구/동 목록 관리 어드민\n서비스 불가 시 안내 메시지 + 알림 신청 기능',
    '지도 시각화 표시, 서비스 확장 예측',
    '1. 서비스 불가 지역 주소 입력 시 안내 메시지 노출\n2. "알림 신청" 버튼 클릭 시 이메일/전화번호 수집\n3. 관리자가 서비스 가능 지역 목록 추가/삭제 가능',
    '[{"id":"qa1","item":"서울 강남구 주소 → 서비스 가능 표시","checked":false},{"id":"qa2","item":"경기 성남시 주소 → 서비스 불가 안내","checked":false},{"id":"qa3","item":"알림 신청 버튼 동작","checked":false}]',
    NOW() - INTERVAL '2 days');

  -- P0-5 v1 (draft) — 맹견 차단
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, created_at)
  VALUES (sid_p0_5_v1, fid_p0_5, 1, 'draft',
    '[P0-5] 맹견·입질견 신청 차단 v1 (정의서 작성 중)',
    '법정 맹견 또는 입질 이력 강아지의 서비스 신청을 자동으로 차단해야 합니다.',
    '현재 신청 단계에서 견종/이력 검증 없음 → 도그워커 안전 위협 사례 발생.',
    '견종 선택 단계에서 맹견 여부 자동 판별\n입질 이력 자기신고 질문 추가\n차단 시 안내 메시지 및 CS 연결',
    '맹견 DB 외부 연동, 수의사 인증',
    NOW() - INTERVAL '1 day');

  -- P1-1 v1 (draft) — 도그워커 온보딩 게이트
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, acceptance_criteria, qa_checklist,
    created_at)
  VALUES (sid_p1_1_v1, fid_p1_1, 1, 'draft',
    '[P1-1] 도그워커 필수 온보딩 게이트 v1 (작성 중)',
    '도그워커 가입 후 바로 서비스를 시작하는 구조로, 신원 미확인 및 교육 미이수 도그워커로 인한 품질 이슈가 발생합니다.',
    '신분증 미제출 도그워커 서비스 시작 가능. 온보딩 교육 이수율 측정 불가.',
    '가입 후 게이트 화면 구현\n신분증 업로드 단계 (이미 P0-1과 연동)\n온보딩 동영상 3편 이수 확인\n관리자 최종 승인 후 활성화',
    '외부 신원 인증 서비스 연동 (KCB 등)',
    '1. 신분증 미제출 시 서비스 화면 접근 불가\n2. 온보딩 영상 3편 모두 완료 후 체크 표시\n3. 관리자 승인 전 상태 안내 화면 표시',
    '[{"id":"qa1","item":"신분증 미제출 시 서비스 차단","checked":false},{"id":"qa2","item":"온보딩 영상 이수 체크 정상 동작","checked":false},{"id":"qa3","item":"관리자 승인 대기 화면","checked":false}]',
    NOW() - INTERVAL '4 days');

  -- P1-5 v1 (승인) — 정산 자동화
  INSERT INTO specs (id, feature_id, version, status,
    feature_name, background, current_problem,
    in_scope, out_of_scope, acceptance_criteria, qa_checklist,
    approved_at, approved_by, created_at)
  VALUES (sid_p1_5_v1, fid_p1_5, 1, 'approved',
    '[P1-5] 정산 및 세무 자료 자동화',
    '도그워커 정산을 매달 수동으로 처리하고 있으며, 세무 자료도 수작업으로 생성 중입니다.',
    '월 정산 8시간 이상 소요. 세무 신고 시 오류 발생 월 3~4건. 도그워커 정산 오류 CS 월 12건.',
    '월별 정산 자동 계산 (서비스료 - 플랫폼 수수료)\n간이영수증 자동 생성 (PDF)\n도그워커 마이페이지 정산 내역 조회\n관리자 정산 확인 및 수정 기능',
    '세금계산서 발행, 부가세 신고 자동화',
    '1. 매월 1일 전월 정산 자동 계산 완료\n2. 도그워커 마이페이지에서 정산 내역 조회 가능\n3. 간이영수증 PDF 다운로드 가능\n4. 관리자에서 정산 오류 수동 수정 가능',
    '[{"id":"qa1","item":"월별 정산 자동 계산 정확도","checked":true},{"id":"qa2","item":"도그워커 정산 내역 조회","checked":true},{"id":"qa3","item":"간이영수증 PDF 생성","checked":true},{"id":"qa4","item":"관리자 수동 수정","checked":true}]',
    NOW() - INTERVAL '25 days', v_founder_id, NOW() - INTERVAL '30 days');

  -- =====================================================
  -- STEP 6. WeeklyPlan 3주치
  -- =====================================================

  -- 지난주 (완료 처리)
  INSERT INTO weekly_plans (id, project_id, week_start, week_end, status,
    planned_features, planned_deliverables, vendor_comment,
    final_plan, founder_approved_at, founder_approved_by, created_at)
  VALUES (
    wp_prev, v_project_id,
    CURRENT_DATE - 14, CURRENT_DATE - 8,
    'completed',
    ARRAY[fid_p0_1, fid_p1_5],
    '업로드 핫픽스 v2 배포 완료 / 정산 자동화 최종 QA 완료',
    '업로드 핫픽스는 목요일에 배포 완료했습니다. 정산 자동화는 QA 항목 전체 통과하여 완료 보고드립니다.',
    '{"goals":[{"feature":"P0-1 업로드 핫픽스","target":"iOS/Android 전 기종 업로드 정상화","deliverable":"PR 머지 + 스테이징 배포","risk":"HEIC 변환 성능 이슈 가능성"},{"feature":"P1-5 정산 자동화","target":"QA 5개 항목 전량 통과","deliverable":"QA 결과 보고서","risk":"없음"}]}',
    NOW() - INTERVAL '8 days', v_founder_id,
    NOW() - INTERVAL '14 days'
  );

  -- 이번주 (승인됨, 진행중)
  INSERT INTO weekly_plans (id, project_id, week_start, week_end, status,
    planned_features, planned_deliverables, vendor_comment,
    final_plan, founder_approved_at, founder_approved_by, created_at)
  VALUES (
    wp_curr, v_project_id,
    CURRENT_DATE - 7, d_0,
    'approved',
    ARRAY[fid_p0_2, fid_p0_3, fid_p0_4, fid_p1_1, fid_p1_2],
    'P0-2 QA 완료 후 완료 후보 제출 / P0-3 구현 60% / P0-4 정의서 협의 / P1-1 레거시 분석 완료 / P1-2 API 설계 시작',
    '이번 주는 P0-2 완료 후보 제출과 P0-3 구현에 집중하겠습니다. P0-4는 지역 판별 API 선택에 대해 대표님 의견이 필요합니다.',
    '{"goals":[{"feature":"P0-2 가입 루트 병렬화","target":"QA 5개 항목 통과 후 완료 후보 제출","deliverable":"QA 결과 + 완료 후보 폼","risk":"QA 5번 항목(잘못 선택 안내 링크) 미완"},{"feature":"P0-3 강아지 프로필 분리","target":"구현 60% 달성 (가입 플로우 분리 완료)","deliverable":"PR #47","risk":"없음"},{"feature":"P0-4 지역 판별","target":"API 선택 확정 + 정의서 v2 업데이트","deliverable":"API 비교 분석 문서","risk":"카카오/Tmap 비용 비교 필요 (대표 확인 요청)"},{"feature":"P1-1 온보딩 게이트","target":"레거시 구조 파악 완료","deliverable":"분석 문서 텍스트","risk":"신분증 업로드 모듈이 P0-1과 공유되어 일정 연동 주의"},{"feature":"P1-2 구독형 수락","target":"API 설계 초안","deliverable":"API 설계 문서","risk":"없음"}]}',
    NOW() - INTERVAL '7 days', v_founder_id,
    NOW() - INTERVAL '7 days'
  );

  -- 다음주 (초안)
  INSERT INTO weekly_plans (id, project_id, week_start, week_end, status,
    planned_features, planned_deliverables, vendor_comment,
    ai_draft, created_at)
  VALUES (
    wp_next, v_project_id,
    d_p1, d_p7,
    'draft',
    ARRAY[fid_p0_3, fid_p0_4, fid_p0_5, fid_p1_1, fid_p1_2],
    'P0-3 구현 완료 + PR 제출 / P0-4 구현 시작 (API 확정 후) / P0-5 정의서 작성 완료 / P1-1 구현 시작 / P1-2 API 구현 30%',
    NULL,
    '{"goals":[{"feature":"P0-3","target":"구현 완료 PR 제출","risk":"강아지 없는 상태 홈 배너 기획 확인 필요"},{"feature":"P0-4","target":"카카오맵 API 연동 구현 시작","risk":"API 비용 승인 후 착수 가능"},{"feature":"P0-5","target":"정의서 v1 초안 완료 및 대표 검토 요청","risk":"맹견 견종 목록 확정 필요"},{"feature":"P1-1","target":"게이트 UI 구현 시작","risk":"신분증 업로드 의존"},{"feature":"P1-2","target":"구독 수락 API 30% 구현","risk":"없음"}]}',
    NOW() - INTERVAL '1 day'
  );

  -- =====================================================
  -- STEP 7. Report 14개 (7일 분산)
  -- =====================================================

  -- DAY -7: P0-1 업로드 핫픽스 — 레거시 분석 (시나리오 B)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_01, v_project_id, v_link_id, d_7,
    ARRAY['레거시_분석']::report_work_type[],
    ARRAY[fid_p0_1],
    '오늘은 업로드 관련 레거시 코드 전체를 파악하는 데 집중했습니다. 카메라 권한 처리 모듈(CameraPermissionHandler.swift, CameraPermissionHelper.kt)과 이미지 처리 유틸(ImageUploadUtil.js)을 순서대로 읽으며 각 분기 로직을 정리했습니다. iOS 쪽은 권한 상태가 .denied일 때 재요청을 하지 않고 단순 종료하는 버그를 확인했습니다. Android 쪽은 파일 크기 체크 로직이 아예 없어 silent 실패가 발생하는 구조임을 파악했습니다.',
    NULL,
    'CameraPermissionHandler.swift, CameraPermissionHelper.kt, ImageUploadUtil.js, UploadViewModel.swift',
    '업로드 장애의 근본 원인을 구조적으로 파악 완료했습니다. iOS는 권한 분기 누락, Android는 파일 크기 체크 부재가 원인입니다. 내일부터 실제 수정 작업에 들어갑니다.',
    '1. iOS 권한 재요청 → 설정 유도 딥링크 수정\n2. Android 파일 크기 체크 로직 추가\n3. HEIC 변환 라이브러리 선택',
    FALSE, NOW() - INTERVAL '7 days'
  );

  -- DAY -6: P0-1 구현 시작 (시나리오 A 진행)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_02, v_project_id, v_link_id, d_6,
    ARRAY['코드_구현']::report_work_type[],
    ARRAY[fid_p0_1],
    'iOS 카메라 권한 재요청 버그를 수정하고 PR을 올렸습니다. 권한이 .denied 상태일 때 UIApplication.shared.open으로 설정 앱 딥링크를 열도록 분기를 추가했습니다. Android는 ImagePicker 호출 전 파일 용량 체크 로직(4MB 한도)을 추가하고, 초과 시 Toast 메시지를 노출하도록 수정했습니다. HEIC 변환은 heic2any 라이브러리를 적용했으며 번들 크기 영향은 약 12KB 증가로 허용 범위입니다.',
    NULL,
    'CameraPermissionHandler.swift, ImagePickerViewModel.kt, imageUpload.util.js',
    'iOS, Android 수정 완료. HEIC 변환까지 구현 완료. PR #31 올려두었습니다.',
    'PR #31 리뷰 후 스테이징 배포, QA 진행',
    FALSE, NOW() - INTERVAL '6 days'
  );

  -- DAY -5: P0-1 QA / P1-5 최종 QA (시나리오 A)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_03, v_project_id, v_link_id, d_5,
    ARRAY['테스트_QA']::report_work_type[],
    ARRAY[fid_p0_1, fid_p1_5],
    '오전에는 P0-1 업로드 핫픽스 QA를 진행했습니다. iOS 15, 16, 17에서 카메라 권한 플로우 모두 정상 확인했습니다. Android S22, S23에서 4MB 초과 파일 에러 메시지 정상 동작 확인. HEIC 파일(iPhone 기본 촬영 결과물)도 업로드 성공 확인했습니다. 오후에는 P1-5 정산 자동화 최종 QA를 진행했습니다. 정산 계산 정확도, 도그워커 내역 조회, PDF 생성, 관리자 수정까지 전 항목 통과했습니다.',
    NULL,
    NULL,
    'P0-1 QA 항목 5개 전량 통과. P1-5 QA 항목 4개 전량 통과. 두 기능 모두 완료 보고 준비 중.',
    'P0-1 프로덕션 배포 준비 / P1-5 완료 후보 제출',
    FALSE, NOW() - INTERVAL '5 days'
  );

  -- DAY -4: P0-2 구현 중 + 보고 제출 (이번주 플랜)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_04, v_project_id, v_link_id, d_4,
    ARRAY['코드_구현', '기획_정책_정리']::report_work_type[],
    ARRAY[fid_p0_2],
    '보호자·도그워커 가입 루트 병렬화 구현에 집중했습니다. 보호자 전용 가입 플로우(3단계: 기본정보→약관→완료)와 도그워커 전용 플로우(4단계: 기본정보→신분확인안내→약관→완료)를 분리 구현했습니다. 역할 선택 랜딩 화면도 새로 만들었습니다. 오후에는 "잘못 선택했어요" 안내 링크 정책을 정리했습니다. 선택 화면에서 "내 역할이 뭔지 모르겠어요" 링크 클릭 시 비포펫 블로그 설명 페이지로 연결하는 방향으로 정리했습니다.',
    NULL,
    'SignUpRouter.swift, SignUpGuardianScreen.swift, SignUpWalkerScreen.swift, RoleSelectScreen.swift',
    '보호자/도그워커 분리 플로우 구현 완료. 내일 QA 예정.',
    'P0-2 QA 5개 항목 진행 (특히 qa5 잘못 선택 링크 확인)',
    FALSE, NOW() - INTERVAL '4 days'
  );

  -- DAY -3: P0-2 QA + P0-3 시작 (시나리오 C — 진척 불명확)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_05, v_project_id, v_link_id, d_3,
    ARRAY['테스트_QA', '코드_구현']::report_work_type[],
    ARRAY[fid_p0_2, fid_p0_3],
    'P0-2 QA를 진행하면서 P0-3 구현도 시작했습니다. P0-2는 qa1~qa4 항목 정상 확인했습니다. qa5(잘못 선택 안내 링크)는 연결 URL이 아직 확정되지 않아 구현을 보류했습니다. P0-3 강아지 프로필 분리는 가입 플로우에서 강아지 입력 단계를 제거하는 작업을 시작했습니다. 관련 코드를 파악하고 일부 수정을 진행했습니다.',
    'P0-2 qa5 항목: 잘못 선택 안내 링크 연결 URL이 미확정 상태입니다. 비포펫 블로그 URL 또는 별도 안내 페이지 중 어떤 방향으로 갈지 확인이 필요합니다.',
    'SignUpRouter.swift, DogProfileStep.swift',
    'P0-2는 qa5 제외 4개 항목 통과. P0-3는 초기 진입 구조 파악 완료, 일부 수정 시작.',
    'P0-4 API 비교 분석 / P1-1 레거시 분석',
    TRUE, NOW() - INTERVAL '3 days'
  );

  -- DAY -3: P1-1 레거시 분석 보고 (시나리오 B)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_06, v_project_id, v_link_id, d_3,
    ARRAY['레거시_분석']::report_work_type[],
    ARRAY[fid_p1_1],
    '도그워커 온보딩 게이트 구현을 위해 현재 도그워커 가입 후 화면 흐름과 관련 레거시 코드를 분석했습니다. 분석한 파일 및 화면 목록: WalkerHomeViewController.swift, WalkerOnboardingViewModel.swift, IdentityVerificationUtil.js (P0-1과 공유 모듈), WalkerStatusScreen.swift. 현재 도그워커 가입 완료 후 바로 홈으로 진입하는 구조입니다. 신분증 업로드는 P0-1에서 수정한 ImageUploadUtil.js를 그대로 재사용할 수 있어 공수를 절감할 수 있습니다. 온보딩 영상 이수 확인 로직은 새로 구현이 필요합니다.',
    NULL,
    'WalkerHomeViewController.swift, WalkerOnboardingViewModel.swift, IdentityVerificationUtil.js, WalkerStatusScreen.swift',
    'P1-1 구현에 필요한 레거시 구조 파악 완료. P0-1 신분증 업로드 모듈 재사용 가능. 온보딩 영상 이수 확인은 신규 구현 필요.',
    '온보딩 게이트 UI 설계 시작',
    FALSE, NOW() - INTERVAL '3 days'
  );

  -- DAY -2: P0-4 분석 — 대표 판단 요청 (시나리오 D)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_07, v_project_id, v_link_id, d_2,
    ARRAY['기획_정책_정리', '외부_API_검토']::report_work_type[],
    ARRAY[fid_p0_4],
    '주소 기반 서비스 가능 지역 판별을 위해 카카오맵 API와 Tmap API를 비교 분석했습니다.\n\n[카카오맵 로컬 API]\n- 월 3만 건 무료, 이후 건당 1.2원\n- 지번/도로명 주소 → 좌표 변환 지원\n- 문서화 잘 되어 있음\n\n[Tmap API (SKT)]\n- 월 5만 건 무료, 이후 건당 0.8원\n- 주소 변환 정확도가 카카오보다 약간 낮음\n- 대중교통 연동 기능 추가 제공 (현재 불필요)\n\n정의서 v1에는 "카카오맵 or Tmap"으로 표기했는데, 어떤 API를 사용할지 확정이 필요합니다. 트래픽 예측상 월 1만 건 이내로 두 API 모두 무료 범위 내입니다. 카카오맵이 기존 소셜 로그인(카카오)과 동일 벤더라 관리 편의상 추천합니다.',
    '지역 판별 API 선택 확정이 필요합니다. 카카오맵 vs Tmap 중 대표님 확인 요청드립니다.',
    NULL,
    '카카오맵 추천. 대표 확인 후 구현 착수 예정.',
    '대표 확인 후 API 구현 시작',
    TRUE, NOW() - INTERVAL '2 days'
  );

  -- DAY -2: P1-2 API 설계 (정상 진행)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_08, v_project_id, v_link_id, d_2,
    ARRAY['기획_정책_정리', '코드_구현']::report_work_type[],
    ARRAY[fid_p1_2],
    '구독형 요청 노출 및 요일 체인 수락 기능의 API 설계를 진행했습니다. 보호자가 정기 산책을 등록할 때 요일/시간/기간을 선택하면 해당 조건에 맞는 도그워커 목록에 노출되는 구조를 설계했습니다. 도그워커가 체인 수락 시 선택한 요일 전체에 대해 예약이 일괄 생성됩니다. API 엔드포인트: POST /subscriptions, GET /subscriptions/{id}/walkers, POST /subscriptions/{id}/accept. 요청/응답 스키마 초안을 Swagger로 정리했습니다.',
    NULL,
    'subscription.api.yaml (신규)',
    '구독형 수락 API 설계 완료. Swagger 문서 초안 공유합니다. 내일부터 구현 시작.',
    'subscriptions 테이블 마이그레이션 + API 구현 시작',
    FALSE, NOW() - INTERVAL '2 days'
  );

  -- DAY -1: P0-3 진행 — 진척 불명확 (시나리오 C)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_09, v_project_id, v_link_id, d_1,
    ARRAY['코드_구현']::report_work_type[],
    ARRAY[fid_p0_3],
    '강아지 프로필 분리 구현을 계속 진행했습니다. 가입 플로우에서 DogProfileStep 제거 작업을 이어가고 있습니다. 일부 의존성 이슈로 예상보다 시간이 걸리고 있습니다.',
    '가입 플로우 내 여러 곳에 DogProfile 의존성이 퍼져 있어 단순 제거가 어렵습니다. 정리하는 중입니다.',
    '작업은 계속 진행 중입니다.',
    'DogProfileStep 완전 분리 및 홈 배너 연동',
    FALSE, NOW() - INTERVAL '1 day'
  );

  -- DAY -1: P0-4 보고 누락 (오늘 보고 없음 — 시나리오 D 연장)
  -- (의도적으로 d_1에 P0-4 보고 없음 → 리스크 생성 근거)

  -- DAY 0 (오늘): P0-2 완료 후보 제출 (시나리오 E)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_10, v_project_id, v_link_id, d_0,
    ARRAY['테스트_QA', '배포_준비']::report_work_type[],
    ARRAY[fid_p0_2],
    'P0-2 보호자·도그워커 가입 루트 병렬화 완료 후보로 제출합니다. qa1(보호자 플로우 완료), qa2(도그워커 플로우 완료), qa3(역할별 홈 이동), qa4(뒤로가기) 4개 항목은 모두 통과했습니다. qa5(잘못 선택 안내 링크)는 URL이 아직 확정되지 않아 임시로 비포펫 공식 인스타그램 링크를 연결해두었습니다. 대표님 확인 요청드립니다. 프로덕션 배포는 qa5 확인 후 진행 예정입니다.',
    NULL,
    'SignUpRouter.swift, SignUpGuardianScreen.swift, SignUpWalkerScreen.swift',
    'qa1~qa4 통과 완료. qa5는 임시 URL 연결 상태. 대표님 최종 확인 후 배포 예정.',
    '대표 확인 후 프로덕션 배포',
    TRUE, NOW() - INTERVAL '2 hours'
  );

  -- DAY 0 (오늘): P1-2 구현 진행
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_11, v_project_id, v_link_id, d_0,
    ARRAY['코드_구현']::report_work_type[],
    ARRAY[fid_p1_2],
    '구독형 수락 API 구현을 시작했습니다. subscriptions 테이블 마이그레이션 완료, POST /subscriptions 엔드포인트 구현 완료했습니다. GET /subscriptions/{id}/walkers는 위치 기반 필터링 로직 구현 중이며 내일 완료 예정입니다.',
    NULL,
    'subscription.model.ts, subscription.service.ts, subscription.controller.ts',
    'subscriptions 마이그레이션 완료. POST API 구현 완료. GET API 구현 중.',
    'GET /walkers 위치 기반 필터링 완료 + POST /accept 구현',
    FALSE, NOW() - INTERVAL '1 hour'
  );

  -- DAY 0: P1-1 구현 시작 (시나리오 B 계속)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_12, v_project_id, v_link_id, d_0,
    ARRAY['코드_구현', '기획_정책_정리']::report_work_type[],
    ARRAY[fid_p1_1],
    '도그워커 온보딩 게이트 UI 구현을 시작했습니다. 게이트 화면(WalkerGateScreen) 기본 구조를 만들었습니다. 신분증 업로드는 P0-1에서 수정한 ImageUploadUtil.js를 재사용 연동했습니다. 온보딩 영상 이수 확인 컴포넌트(OnboardingVideoPlayer) 초안도 작성했습니다. 영상 URL은 임시 YouTube 링크로 연결하고, 이수 상태는 로컬 AsyncStorage에 저장 중입니다. (서버 연동은 다음 단계)',
    '온보딩 영상 URL이 아직 없습니다. 비포펫에서 제작할 영상인지, 외부 콘텐츠를 사용할지 정책 확인이 필요합니다.',
    'WalkerGateScreen.swift, OnboardingVideoPlayer.swift',
    'WalkerGate 기본 UI 구성 완료. 신분증 업로드 연동 완료. 영상 URL 정책 확인 필요.',
    '관리자 승인 연동 구현',
    TRUE, NOW() - INTERVAL '30 minutes'
  );

  -- 변경 요청 관련 보고 (별도 기능)
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_13, v_project_id, v_link_id, d_3,
    ARRAY['의사결정_대기']::report_work_type[],
    ARRAY[fid_p0_4],
    'P0-4 주소 기반 지역 판별 구현과 관련하여 변경 요청을 드립니다. 초기 정의서에는 "실시간 판별"로 명시되어 있었으나, 실제 구현 검토 결과 매 주소 입력 시 API를 호출하면 오타 입력 중에도 호출이 발생하여 비용이 급증할 수 있습니다. 디바운스(500ms) 처리 + 주소 선택 완료 시점에만 API 호출하는 방식으로 변경을 제안드립니다. 기능 결과는 동일하나 구현 방식 변경으로 비용 절감 효과가 있습니다.',
    '변경 승인 대기 중',
    '디바운스 방식으로 변경 시 API 비용 추산 70% 절감. 대표 승인 요청.',
    '승인 후 구현 착수',
    TRUE, NOW() - INTERVAL '3 days'
  );

  -- 버그 재현 보고
  INSERT INTO reports (id, project_id, access_link_id, report_date,
    work_types, related_feature_ids, summary, blocker,
    files_modified, conclusion, tomorrow_plan, needs_founder_check, submitted_at)
  VALUES (rid_14, v_project_id, v_link_id, d_4,
    ARRAY['버그_재현_원인_분석']::report_work_type[],
    ARRAY[fid_p0_3],
    'P0-3 강아지 프로필 분리 작업 중, DogProfileStep 제거 시도 후 회원가입 완료 후 홈에서 크래시가 발생하는 버그를 확인했습니다. 원인 분석: HomeViewController가 초기화 시 currentUser.dogs 배열을 non-nil로 가정하고 있어, dogs가 빈 배열일 경우 index out of range 크래시 발생. 수정 방향: HomeViewController 초기화 시 dogs 배열 nil/empty 체크 후 분기 처리.',
    NULL,
    'HomeViewController.swift',
    '크래시 원인 파악 완료. HomeViewController 수정 후 재테스트 예정.',
    'HomeViewController 수정 + 강아지 없는 상태 홈 배너 연동',
    FALSE, NOW() - INTERVAL '4 days'
  );

  -- =====================================================
  -- STEP 8. Evidence 21개
  -- =====================================================

  -- rid_01: 레거시 분석 증빙 (medium)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_01, v_project_id, '조사_증빙', 'iOS 카메라 권한 분기 분석 메모',
    '분석 파일: CameraPermissionHandler.swift (라인 45~89)\n- requestWhenInUseAuthorization() 호출 후 .denied 케이스에서 return만 처리하고 재요청 로직 없음\n- .authorized 케이스만 진행\n- 수정 필요 포인트: .denied 시 UIApplication.shared.open 호출로 설정 앱 유도 필요',
    NULL),
  (rid_01, v_project_id, '조사_증빙', 'Android 업로드 silent 실패 분석 메모',
    '분석 파일: ImagePickerViewModel.kt (라인 112~145)\n- selectImage() 함수에서 파일 크기 체크 로직 없음\n- ContentResolver.openInputStream() 후 바로 서버 업로드 시도\n- 서버에서 413 응답 시 에러 핸들링 없어 silent 실패\n- 수정: 업로드 전 fileSize > 4MB 체크 + Toast 메시지',
    NULL);

  -- rid_02: PR 링크 증빙 (strong)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_02, v_project_id, '코드_증빙', 'PR #31 — 업로드 핫픽스',
    'iOS 카메라 권한 재요청 + Android 파일 크기 체크 + HEIC 변환 구현',
    'https://github.com/beforepet/app/pull/31'),
  (rid_02, v_project_id, '코드_증빙', '커밋 — HEIC 변환 heic2any 적용',
    'heic2any 라이브러리 적용. 번들 크기 +12KB (허용 범위). 변환 성공률 100% 테스트 통과.',
    'https://github.com/beforepet/app/commit/a3f9c82');

  -- rid_03: QA 결과 증빙 (strong)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_03, v_project_id, '검증_증빙', 'P0-1 QA 전체 통과 결과',
    '[✅ qa1] iOS 15 카메라 권한 거부 후 재요청 → 설정 유도 팝업 정상\n[✅ qa2] iOS 16, 17 정상 동작 확인\n[✅ qa3] Android S22 4MB 초과 파일 → "파일 크기가 초과되었습니다 (최대 4MB)" 메시지 정상\n[✅ qa4] HEIC 파일 업로드 후 서버 이미지 확인 완료\n[✅ qa5] Sentry 에러 로그 기록 정상\n\nQA 완료일: ' || d_5::TEXT || '\nQA 담당: 김민준',
    NULL),
  (rid_03, v_project_id, '검증_증빙', 'P1-5 정산 자동화 QA 전체 통과',
    '[✅ qa1] 월별 정산 자동 계산 정확도 — 3개월 내역 수동 검증 일치\n[✅ qa2] 도그워커 마이페이지 정산 내역 조회 정상\n[✅ qa3] 간이영수증 PDF 생성 및 다운로드 정상\n[✅ qa4] 관리자 수동 수정 기능 정상\n\nQA 완료일: ' || d_5::TEXT,
    NULL);

  -- rid_04: 코드 구현 증빙 (strong)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_04, v_project_id, '코드_증빙', 'PR #35 — 보호자·도그워커 가입 루트 분리',
    'SignUpRouter, SignUpGuardianScreen, SignUpWalkerScreen, RoleSelectScreen 분리 구현',
    'https://github.com/beforepet/app/pull/35'),
  (rid_04, v_project_id, '기획_증빙', '"잘못 선택했어요" 안내 링크 정책 정리',
    '역할 선택 화면 → "내 역할이 뭔지 모르겠어요" 링크\n연결 대상: 비포펫 공식 인스타그램 또는 별도 안내 페이지\n→ 대표님 URL 확인 필요\n임시: https://instagram.com/beforepet',
    NULL);

  -- rid_05: QA 부분 통과 (medium)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_05, v_project_id, '검증_증빙', 'P0-2 QA 부분 통과 결과',
    '[✅ qa1] 보호자 플로우 완료 → 보호자 홈 이동 정상\n[✅ qa2] 도그워커 플로우 완료 → 신분 확인 대기 화면 정상\n[✅ qa3] 역할별 홈 이동 확인\n[✅ qa4] 뒤로가기 정상 동작\n[⏸ qa5] 잘못 선택 안내 링크 — URL 미확정으로 구현 보류\n\nQA 4/5 통과',
    NULL);

  -- rid_06: 레거시 분석 증빙 (medium — 시나리오 B)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_06, v_project_id, '조사_증빙', 'P1-1 도그워커 온보딩 레거시 분석 결과',
    '분석 완료 파일/화면 목록:\n1. WalkerHomeViewController.swift — 가입 후 홈 진입 로직\n2. WalkerOnboardingViewModel.swift — 현재 온보딩 상태 관리 (사실상 비어있음)\n3. IdentityVerificationUtil.js — P0-1과 공유 모듈 (신분증 업로드)\n4. WalkerStatusScreen.swift — 도그워커 상태 화면\n\n주요 발견:\n- 현재 가입 완료 후 신원 확인 없이 바로 홈 진입\n- IdentityVerificationUtil.js는 P0-1 수정 버전 재사용 가능 (공수 절감)\n- 온보딩 영상 이수 로직 없음 (신규 구현 필요)\n- 관리자 승인 플로우 없음 (신규 구현 필요)',
    NULL),
  (rid_06, v_project_id, '조사_증빙', 'WalkerOnboardingViewModel 코드 분석',
    '// 현재 WalkerOnboardingViewModel.swift\nclass WalkerOnboardingViewModel {\n  // 온보딩 상태 추적 로직 없음\n  // 게이트 조건 체크 없음\n  // 단순히 홈으로 push\n  func proceedToHome() {\n    router.navigateTo(.walkerHome)\n  }\n}\n\n→ 전면 재구현 필요',
    NULL);

  -- rid_07: API 비교 분석 증빙 (strong)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_07, v_project_id, '조사_증빙', '카카오맵 vs Tmap API 비교 분석',
    '| 항목 | 카카오맵 | Tmap |\n|------|---------|------|\n| 무료 한도 | 월 3만건 | 월 5만건 |\n| 초과 단가 | 1.2원/건 | 0.8원/건 |\n| 주소 정확도 | 높음 | 보통 |\n| 문서화 | 우수 | 보통 |\n| 기존 연동 | 카카오 로그인 동일 | 없음 |\n| 추천 | ✅ 카카오맵 | - |\n\n월 트래픽 예측: 1만 건 이내 → 두 API 모두 무료 범위\n카카오 동일 벤더 관리 편의 + 정확도 우선으로 카카오맵 추천',
    NULL);

  -- rid_09: 진척 불명확 — 증빙 weak (시나리오 C)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_09, v_project_id, '코드_증빙', 'P0-3 작업 중 — 미완성 브랜치',
    '브랜치: feature/p0-3-dog-profile-split\n현재 상태: DogProfileStep 제거 작업 진행 중\nPR: 미제출 (작업 완료 후 제출 예정)\n커밋: 없음',
    NULL);

  -- rid_10: 완료 후보 증빙 (medium — QA 5 미완, 시나리오 E)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_10, v_project_id, '검증_증빙', 'P0-2 완료 후보 QA 결과 (qa5 미완)',
    '[✅ qa1] 보호자 플로우 완료 후 보호자 홈 이동 확인\n[✅ qa2] 도그워커 플로우 완료 후 신분 확인 대기 화면 이동 확인\n[✅ qa3] 역할별 홈 이동 확인\n[✅ qa4] 뒤로가기 각 단계 정상 동작\n[❓ qa5] 잘못 선택 안내 링크 — 임시 인스타그램 URL 연결 상태\n         → 최종 URL 대표님 확인 필요\n\n배포 준비 완료. qa5 URL 확정 후 프로덕션 배포 예정.',
    NULL),
  (rid_10, v_project_id, '배포_증빙', 'P0-2 스테이징 배포 확인',
    '스테이징 환경 배포 완료\n배포 URL: https://staging.beforepet.com\n배포 시간: ' || NOW()::TEXT || '\n테스트 계정: tester@beforepet.com / Test1234!',
    'https://staging.beforepet.com');

  -- rid_12: P1-1 구현 시작 증빙 (medium)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_12, v_project_id, '코드_증빙', 'WalkerGateScreen 초기 구현',
    '브랜치: feature/p1-1-walker-gate\n구현 완료:\n- WalkerGateScreen 기본 레이아웃\n- 신분증 업로드 컴포넌트 (P0-1 ImageUploadUtil.js 재사용)\n- OnboardingVideoPlayer 초안\n\n미완료:\n- 관리자 승인 API 연동\n- 온보딩 영상 실제 URL',
    'https://github.com/beforepet/app/tree/feature/p1-1-walker-gate');

  -- rid_13: 변경 요청 증빙
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_13, v_project_id, '기획_증빙', 'P0-4 API 호출 방식 변경 제안 분석',
    '현재 정의서: "실시간 판별" → 매 입력마다 API 호출\n제안 변경: 디바운스(500ms) + 주소 선택 완료 시점에만 호출\n\n비용 비교:\n- 현재 방식: 주소 입력 시 평균 8회 API 호출 → 월 8만건 예상\n- 변경 방식: 주소 확정 1회 API 호출 → 월 1만건 예상\n- 절감 효과: 약 70%\n\n사용자 경험 차이: 없음 (최종 결과는 동일)',
    NULL);

  -- rid_14: 버그 분석 증빙 (strong)
  INSERT INTO evidence_items (report_id, project_id, evidence_type, title, content, url)
  VALUES
  (rid_14, v_project_id, '디버깅_증빙', 'HomeViewController 크래시 원인 분석',
    '크래시 로그:\nFatal error: Index out of range\nFile: HomeViewController.swift, Line: 67\n\n원인 코드:\nlet firstDog = currentUser.dogs[0] // dogs가 빈 배열이면 크래시\n\n수정 방향:\nif let firstDog = currentUser.dogs.first {\n  // dogs 있을 때 처리\n} else {\n  // dogs 없을 때 배너 표시\n}',
    NULL);

  -- =====================================================
  -- STEP 9. DailyAssessment 14개 (각 Report마다)
  -- =====================================================

  -- rid_01: 레거시 분석 (시나리오 B — 구현 없지만 진척 신호)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_01, v_project_id, d_7,
    '정상',
    '레거시 코드 분석 — 구현 착수 전 필수 선행 작업',
    'P0-1 정의서의 수정 범위(권한 재요청, 파일 크기, HEIC)와 분석 내용이 일치합니다.',
    '이번 주 P0-1 작업 계획의 첫 단계(구조 파악)로 적절합니다.',
    '실제 PR이나 배포는 없으나, 분석 파일 목록과 원인 파악 내용이 상세하여 진척 신호로 판단합니다. 구현은 없지만 의미 있는 작업입니다.',
    '분석 메모 2개 제출 (파일 명시, 원인 구체화). 링크 없지만 내용 기반 medium 수준.',
    '없음. 정상 진행.',
    '내일 구현 착수 예정이므로 PR 제출 여부 확인 권장.',
    'PR이나 배포는 없지만 레거시 구조 파악과 버그 원인 분석이 상세합니다. 구현은 아니지만 진척 신호는 있습니다.',
    85, 90, 60);

  -- rid_02: 구현 완료 (strong)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_02, v_project_id, d_6,
    '정상',
    '코드 구현 — iOS/Android 업로드 버그 수정 및 HEIC 변환',
    'P0-1 v2 정의서의 3가지 수정 항목(권한, 파일크기, HEIC) 모두 구현했습니다.',
    '이번 주 P0-1 목표와 정확히 일치합니다.',
    'PR #31 확인 가능. 3개 수정 모두 완료. 내일 QA 예정으로 일정 정상.',
    'PR 링크 + 커밋 링크 2개. Strong 수준.',
    '없음.',
    '내일 QA 결과 확인.',
    'PR과 커밋 링크가 확인되고, 3개 수정 항목 모두 구현 완료되었습니다. 정상 진행.',
    95, 95, 90);

  -- rid_03: QA 완료 (strong)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_03, v_project_id, d_5,
    '정상',
    '테스트/QA — P0-1 및 P1-5 전 항목 통과',
    'P0-1과 P1-5 모두 acceptance criteria 기준 통과.',
    '두 기능 모두 완료 처리 가능한 수준.',
    'QA 5개 항목 전량 통과. 완료 후보 제출 준비 완료.',
    'QA 체크리스트 상세 기록. Strong 수준.',
    '없음.',
    'P0-1, P1-5 완료 처리 승인 권장.',
    'QA 전 항목 통과 확인. 두 기능 모두 완료 승인 권고.',
    98, 98, 95);

  -- rid_04: 구현 정상 (strong)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_04, v_project_id, d_4,
    '정상',
    '코드 구현 + 기획 정리',
    'P0-2 정의서 기준 플로우 분리 구현 완료.',
    '이번 주 P0-2 완료 후보 제출 목표에 부합.',
    'PR #35 확인 가능. qa5 URL 미확정이나 내일 QA로 해결 예정.',
    'PR 링크 + 정책 정리 문서. Strong 수준.',
    'qa5 URL 확정 필요 (낮음).',
    'qa5 URL 대표 확인 권장.',
    '정상 진행. qa5만 해결되면 완료 가능.',
    90, 92, 85);

  -- rid_05: QA 부분 통과 (medium — 시나리오 C 조짐)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_05, v_project_id, d_3,
    '주의',
    'QA + 코드 구현 — 두 기능 동시 진행',
    'P0-2 qa5 미완 상태. P0-3 구현 시작했지만 구체적 진척 불명확.',
    'P0-2 완료 후보 제출 목표가 늦어질 수 있음.',
    'P0-2는 qa5 1개 미완. P0-3는 착수했으나 진척 수준 파악 어려움.',
    'QA 부분 결과 기록됨. Medium 수준.',
    'qa5 URL 미확정 blocker 지속. P0-3 진척 불명확.',
    'qa5 URL 대표 확인 권장. P0-3 진척 내일 추가 보고 요청.',
    '두 기능을 동시 진행하면서 P0-2 qa5가 막혀 있습니다. P0-3 진척이 불명확합니다. 점검 권장.',
    75, 70, 65);

  -- rid_06: 레거시 분석 (시나리오 B 본격)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_06, v_project_id, d_3,
    '정상',
    '레거시 분석 — P1-1 온보딩 게이트 구현 준비',
    'P1-1 정의서의 구현 범위(게이트, 신분증, 영상, 관리자 승인)에 대한 파악이 완료되었습니다.',
    '이번 주 P1-1 레거시 분석 완료 목표 달성.',
    'PR은 없지만 4개 파일 분석 + 공유 모듈 재사용 가능성 발견. 의미 있는 진척.',
    '분석 메모 2개 (파일 목록, 코드 발췌). Medium 수준.',
    '없음.',
    '다음 단계: UI 구현 착수.',
    'PR 없이도 레거시 구조를 상세히 파악하고 공수 절감 방법도 발견했습니다. 진척 신호 있음.',
    88, 90, 70);

  -- rid_07: API 비교 분석 (strong — 대표 확인 필요)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_07, v_project_id, d_2,
    '주의',
    '기획/정책 정리 + 외부 API 검토',
    'P0-4 정의서에 API 선택이 미확정 상태. 외주사가 의사결정을 요청한 상황.',
    'API 확정 전 구현 착수 불가. 이번 주 P0-4 목표 달성 위험.',
    '분석은 완료됐으나 대표 결정이 필요해 구현 착수 불가.',
    'API 비교 분석 문서 상세. Strong 수준.',
    '대표 미확인 시 P0-4 일정 지연 위험.',
    '카카오맵 API 선택 대표 확인 즉시 필요.',
    '분석은 상세하나 대표 결정 없이는 구현 불가. Must-Check 권고.',
    70, 60, 85);

  -- rid_08: 정상 진행
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_08, v_project_id, d_2,
    '정상',
    '기획 정리 + 코드 구현 — API 설계',
    'P1-2 정의서 기준 API 엔드포인트 설계 완료.',
    '이번 주 P1-2 API 설계 시작 목표 달성.',
    'Swagger API 문서 초안 완료. 구현 준비 완료.',
    'API 설계 문서 제출 (링크 미포함). Medium 수준.',
    '없음.',
    '내일 구현 착수 확인.',
    '정상 진행. API 설계 완료로 내일부터 구현 가능.',
    90, 90, 70);

  -- rid_09: 진척 불명확 (시나리오 C 본격)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_09, v_project_id, d_1,
    '점검_권장',
    '코드 구현',
    '정의서 기준 작업 방향은 맞으나 진척 수준 파악 어려움.',
    '이번 주 P0-3 60% 목표 달성 가능 여부 불명확.',
    '"작업 진행 중" + "의존성 이슈" 언급이나 구체적 진척 없음. 브랜치 있으나 커밋 없음.',
    'PR 미제출, 커밋 없음, 브랜치만 언급. Weak 수준.',
    'P0-3 일정 지연 가능성. 구체적 진척 파악 필요.',
    '내일 보고에서 구체적 진척 수치 및 PR 제출 요청.',
    '작업 진행 중이라 하지만 구체적 증빙이 없습니다. 점검 권장.',
    60, 55, 30);

  -- rid_10: 완료 후보 (시나리오 E)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_10, v_project_id, d_0,
    '주의',
    'QA + 배포 준비',
    'qa1~qa4 통과. qa5(잘못 선택 안내 링크) 임시 URL 상태.',
    '이번 주 완료 후보 제출 목표 도달. 단, qa5 미완.',
    '완료 후보 제출. 스테이징 배포 완료. qa5 URL 미확정.',
    'QA 결과 + 스테이징 URL. Medium 수준 (qa5 미완).',
    'acceptance criteria 기준 qa5 미달. 완료 승인 보류 권고.',
    'qa5 URL 대표 확인 후 완료 승인 결정 필요.',
    '완료 후보이나 qa5가 미완입니다. URL 확정 후 완료 승인 권고. 완료 승인 보류.',
    78, 85, 75);

  -- rid_11: P1-2 구현 (정상)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_11, v_project_id, d_0,
    '정상',
    '코드 구현 — 구독형 수락 API 구현',
    'P1-2 정의서 기준 마이그레이션 + POST API 완료.',
    '이번 주 API 30% 목표 순조로운 진행.',
    'DB 마이그레이션 + 첫 번째 엔드포인트 구현 완료.',
    '브랜치/파일명 명시. 코드 증빙 Medium 수준.',
    '없음.',
    '내일 GET API 완료 확인.',
    '정상 진행. 설계대로 구현 중.',
    90, 88, 70);

  -- rid_12: P1-1 구현 시작 (대표 확인 필요)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_12, v_project_id, d_0,
    '주의',
    '코드 구현 + 기획 정리',
    '온보딩 게이트 UI 구현 시작. 영상 URL 정책 미확정.',
    '이번 주 P1-1 시작 목표 달성. 단, 영상 URL blocker 발생.',
    '기본 UI + 신분증 연동 완료. 영상 URL 없어 이수 확인 완전 구현 불가.',
    '브랜치 링크 제출. Medium 수준.',
    '온보딩 영상 URL 정책 미확정 blocker.',
    '온보딩 영상 URL/콘텐츠 정책 대표 확인 필요.',
    '기본 구현은 정상이나 영상 URL 정책 blocker가 있습니다. 대표 확인 필요.',
    80, 82, 70);

  -- rid_13: 변경 요청 (대표 확인)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_13, v_project_id, d_3,
    '주의',
    '의사결정 대기 — 정의서 방향 변경 제안',
    '정의서 "실시간 판별"과 다른 방향(디바운스) 제안. 범위 협의 필요.',
    'P0-4 구현 착수 지연.',
    '구현 전 변경 요청. 비용 절감 근거 제시.',
    '분석 문서 제출. Medium 수준.',
    '대표 미결정 시 P0-4 일정 지연.',
    'P0-4 변경 요청 승인 여부 대표 결정 필요.',
    '정의서와 다른 구현 방향 제안. 대표 판단 필요.',
    60, 50, 65);

  -- rid_14: 버그 분석 (strong)
  INSERT INTO daily_assessments (report_id, project_id, assessment_date,
    alignment_signal, work_type_estimate, spec_alignment, weekly_plan_alignment,
    progress_signal, evidence_strength, risk_signals, recommended_actions, ai_comment,
    spec_alignment_score, weekly_plan_score, evidence_score)
  VALUES (rid_14, v_project_id, d_4,
    '정상',
    '버그 재현 및 원인 분석',
    'P0-3 구현 중 발견된 부수 버그 분석. 정의서 범위 내.',
    '버그 수정이 P0-3 진행에 필요한 선행 작업.',
    '크래시 원인 명확히 파악. 수정 방향도 제시.',
    '크래시 로그 + 원인 코드 + 수정 방향 제시. Strong 수준.',
    '수정 미완료 시 P0-3 일정 영향 가능.',
    '내일 버그 수정 완료 확인.',
    '버그 원인을 명확하게 파악하고 수정 방향을 제시했습니다. 정상적인 디버깅 과정.',
    88, 80, 85);

  -- =====================================================
  -- STEP 10. Risk 8개
  -- =====================================================

  -- R1: P0-2 qa5 미완 (낮음)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    related_feature_id, related_report_id, is_resolved)
  VALUES (risk_01, v_project_id, '증빙_없는_완료_후보', '주의',
    'P0-2 qa5(잘못 선택 안내 링크) URL 미확정',
    '보호자·도그워커 가입 루트 병렬화 완료 후보 제출됐으나, qa5 항목의 "잘못 선택 안내 링크" URL이 임시 연결 상태입니다. Acceptance Criteria 기준으로 완전한 완료 승인은 보류가 필요합니다.',
    fid_p0_2, rid_10, FALSE);

  -- R2: P0-3 진척 불명확 (주의)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    related_feature_id, related_report_id, is_resolved)
  VALUES (risk_02, v_project_id, 'Weekly_Plan_미정합', '주의',
    'P0-3 강아지 프로필 분리 진척 불명확 — 이번 주 60% 목표 달성 불확실',
    '이번 주 P0-3 구현 60% 달성 목표인데, 최근 2일간 보고에 "의존성 이슈", "작업 진행 중" 수준의 내용만 있고 PR이나 커밋이 없습니다. 일정 주의 필요.',
    fid_p0_3, rid_09, FALSE);

  -- R3: P0-4 대표 미결정 → 구현 착수 불가 (위험)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    related_feature_id, related_report_id, is_resolved)
  VALUES (risk_03, v_project_id, '범위_변경_위험', '위험',
    'P0-4 API 선택 미결정 + 구현 방식 변경 요청 대기 → 착수 불가',
    '카카오맵 vs Tmap API 선택이 대표 미확인 상태입니다. 추가로 "실시간 판별 → 디바운스 방식" 변경 요청도 승인 대기 중입니다. 두 건 모두 미결정 시 P0-4 구현 착수 불가. 이번 주 내 미결정 시 다음 주 일정으로 넘어갑니다.',
    fid_p0_4, rid_07, FALSE);

  -- R4: P1-1 영상 URL 정책 blocker (주의)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    related_feature_id, related_report_id, is_resolved)
  VALUES (risk_04, v_project_id, '반복_blocker', '주의',
    'P1-1 온보딩 영상 URL/콘텐츠 정책 미확정 blocker',
    '도그워커 온보딩 게이트의 교육 영상 URL이 미확정입니다. 비포펫 자체 제작 영상인지, 외부 콘텐츠인지 정책이 없습니다. 이 blocker가 해결되지 않으면 온보딩 영상 이수 확인 기능 완성 불가.',
    fid_p1_1, rid_12, FALSE);

  -- R5: 보고 누락 (P0-4 d_1 보고 없음)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    related_feature_id, is_resolved)
  VALUES (risk_05, v_project_id, '보고_누락', '주의',
    'P0-4 관련 어제(' || d_1::TEXT || ') 보고 없음',
    'P0-4 주소 기반 지역 판별에 대해 어제 보고가 없었습니다. API 선택 미결정으로 대기 상태인 것으로 추정되나, 명시적 보고가 없어 확인이 필요합니다.',
    fid_p0_4, FALSE);

  -- R6: 완료 후보 증빙 부족 (위험)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    related_feature_id, related_report_id, is_resolved)
  VALUES (risk_06, v_project_id, '증빙_없는_완료_후보', 'Must_Check_필요',
    'P0-2 완료 후보: QA 체크리스트 미완(qa5) 상태에서 완료 주장',
    '외주사가 qa5 항목(잘못 선택 안내 링크)이 임시 URL 상태임에도 완료 후보로 제출했습니다. Acceptance Criteria 기준 qa5는 미달 상태입니다. 대표 직접 확인 후 완료 승인 여부 결정이 필요합니다.',
    fid_p0_2, rid_10, FALSE);

  -- R7: P0-3 크래시 버그 수정 미완 (주의)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    related_feature_id, related_report_id, is_resolved)
  VALUES (risk_07, v_project_id, '기획_이탈_가능성', '주의',
    'P0-3 구현 중 HomeViewController 크래시 버그 수정 미완',
    'P0-3 작업 중 강아지 없는 상태에서 홈 접근 시 크래시가 발생하는 버그가 발견됐습니다. 원인은 파악됐으나 수정이 완료되지 않았습니다. 수정 완료 전 P0-3 QA 진행 불가.',
    fid_p0_3, rid_14, FALSE);

  -- R8: 일정 전반 (낮음)
  INSERT INTO risks (id, project_id, risk_type, level, title, description,
    is_resolved)
  VALUES (risk_08, v_project_id, '검수_지연', '낮음',
    'P0 기능 중 3개 이상 대표 확인 대기 → 전체 일정 영향 가능성',
    '현재 P0-4 API 선택, P0-2 qa5 URL, P1-1 영상 URL 등 대표 확인이 필요한 항목이 3개 이상 동시에 대기 중입니다. 빠른 확인이 필요합니다.',
    FALSE);

  -- =====================================================
  -- STEP 11. MustCheckItem 5개
  -- =====================================================

  INSERT INTO must_check_items (id, project_id, trigger_type, title, description,
    related_report_id, related_feature_id, is_resolved)
  VALUES
  -- MC1: P0-2 완료 후보 qa5 확인
  (mc_01, v_project_id, '완료_후보_검수',
    '[P0-2] 완료 후보 검수 — qa5 잘못 선택 안내 링크 URL 확인 필요',
    '보호자·도그워커 가입 루트 병렬화가 완료 후보로 제출됐습니다. qa1~qa4는 통과됐으나 qa5(잘못 선택 안내 링크 URL)가 임시 인스타그램 링크 상태입니다.\n\n대표님이 직접:\n1. 최종 URL이 무엇인지 결정 (인스타그램 / 별도 안내 페이지 / 블로그)\n2. URL 확정 후 외주사에 전달\n3. 완료 승인 여부 결정',
    rid_10, fid_p0_2, FALSE),

  -- MC2: P0-4 API 선택 결정
  (mc_02, v_project_id, '외주사_확인_요청',
    '[P0-4] 지역 판별 API 선택 — 카카오맵 vs Tmap 대표 결정 필요',
    '주소 기반 서비스 가능 지역 판별에 사용할 지도 API를 선택해야 합니다.\n\n외주사 추천: 카카오맵 (기존 카카오 로그인과 동일 벤더, 정확도 우수)\n\n대표님이 직접:\n1. 카카오맵 사용 승인 여부 결정\n2. 결정 후 외주사에 통보 (미결정 시 P0-4 구현 착수 불가)',
    rid_07, fid_p0_4, FALSE),

  -- MC3: P0-4 구현 방식 변경 요청
  (mc_03, v_project_id, '정책_범위_비용_변경',
    '[P0-4] 변경 요청 — 실시간 판별 → 디바운스 방식 변경 승인',
    '외주사가 정의서의 "실시간 판별" 방식을 "디바운스(500ms) + 주소 선택 완료 시점 호출" 방식으로 변경을 요청했습니다.\n\n변경 이유: API 비용 70% 절감 (월 8만건 → 1만건)\n사용자 경험 차이: 없음\n\n대표님이 직접:\n1. 변경 승인 또는 거절\n2. 승인 시 정의서 업데이트',
    rid_13, fid_p0_4, FALSE),

  -- MC4: P1-1 온보딩 영상 정책
  (mc_04, v_project_id, '외주사_확인_요청',
    '[P1-1] 온보딩 교육 영상 URL/콘텐츠 정책 결정 필요',
    '도그워커 필수 온보딩 게이트에 포함되는 교육 영상(3편) URL이 미확정 상태입니다.\n\n대표님이 직접:\n1. 영상 콘텐츠 방향 결정 (비포펫 자체 제작 / 외부 콘텐츠 활용)\n2. 영상 URL 또는 제작 일정 외주사에 전달\n3. 미결정 시 P1-1 이수 확인 기능 완성 불가',
    rid_12, fid_p1_1, FALSE),

  -- MC5: 전반적 대표 확인 사항 누적
  (mc_05, v_project_id, 'Weekly_Plan_미달성_누적',
    '이번 주 대표 확인 대기 항목 4건 누적 — 빠른 처리 필요',
    '현재 대표 확인이 필요한 항목이 4건 동시에 대기 중입니다:\n1. P0-2 qa5 URL 확정\n2. P0-4 카카오맵 API 승인\n3. P0-4 디바운스 방식 변경 승인\n4. P1-1 온보딩 영상 정책\n\n이 중 P0-4 관련 2건이 미결정이면 P0-4 구현 착수가 다음 주로 넘어갑니다.',
    NULL, NULL, FALSE);

  -- =====================================================
  -- STEP 12. Decision 4개
  -- =====================================================

  INSERT INTO decisions (id, project_id, title, description, decision_type,
    related_feature_id, status, ai_recommendation)
  VALUES
  -- D1: 카카오맵 API 선택
  (dec_01, v_project_id,
    '[P0-4] 지역 판별 API 선택: 카카오맵 vs Tmap',
    '주소 기반 서비스 가능 지역 판별에 사용할 지도 API를 결정해야 합니다. 외주사가 비교 분석 문서를 제출했습니다.\n\n[카카오맵] 무료 3만건/월, 1.2원/건 초과, 정확도 높음, 카카오 동일 벤더\n[Tmap] 무료 5만건/월, 0.8원/건 초과, 정확도 보통\n\n트래픽 예측: 월 1만건 → 두 API 모두 무료 범위 내',
    '정책_결정',
    fid_p0_4, 'pending',
    '카카오맵 사용을 권장합니다. 기존 카카오 로그인과 동일 벤더로 관리 편의성이 높고, 주소 정확도가 우수합니다. 비용 차이는 현재 트래픽 수준에서 무의미합니다.'),

  -- D2: P0-4 구현 방식 변경
  (dec_02, v_project_id,
    '[P0-4] 실시간 판별 → 디바운스 방식 변경 승인',
    '외주사가 정의서의 "매 입력 시 실시간 API 호출" 방식을 "디바운스(500ms) + 주소 선택 완료 시점 호출" 방식으로 변경을 제안했습니다.\n\n- 사용자 경험: 동일 (최종 결과 같음)\n- API 비용: 월 8만건 → 1만건 (70% 절감)\n- 구현 복잡도: 유사',
    '범위_변경',
    fid_p0_4, 'pending',
    '변경 승인을 권장합니다. 사용자 경험에 영향이 없고 비용 절감 효과가 명확합니다. 정의서 v2 업데이트 필요.'),

  -- D3: P0-2 qa5 URL 확정
  (dec_03, v_project_id,
    '[P0-2] 잘못 선택 안내 링크 최종 URL 결정',
    '보호자·도그워커 가입 화면의 "내 역할이 뭔지 모르겠어요" 링크에 연결할 URL을 결정해야 합니다.\n\n옵션:\n1. 비포펫 공식 인스타그램 (https://instagram.com/beforepet) — 임시 연결 상태\n2. 별도 안내 페이지 제작 (랜딩 페이지 추가 필요)\n3. 비포펫 블로그/FAQ 페이지',
    '정책_결정',
    fid_p0_2, 'pending',
    '별도 안내 페이지 제작보다는 기존 운영 채널(인스타그램 또는 블로그)로 연결하는 것이 빠르고 효율적입니다. 인스타그램 임시 연결을 공식화하거나, 블로그에 역할 설명 게시물을 만들어 연결하는 것을 권장합니다.'),

  -- D4: P1-1 온보딩 영상 정책
  (dec_04, v_project_id,
    '[P1-1] 도그워커 온보딩 교육 영상 제작/조달 방식 결정',
    '도그워커 온보딩 게이트에 필요한 교육 영상 3편의 제작/조달 방향을 결정해야 합니다.\n\n옵션:\n1. 비포펫 자체 제작 (촬영 + 편집 필요, 일정 추가 소요)\n2. 외부 콘텐츠 활용 (관련 유튜브 영상 선정 후 링크)\n3. 텍스트/슬라이드 형태로 대체 (영상 대신 이미지+텍스트)',
    '정책_결정',
    fid_p1_1, 'pending',
    '단기적으로는 외부 콘텐츠(유튜브 관련 영상) 활용을 권장합니다. 빠른 출시를 위해 링크 연결로 시작하고, 추후 자체 제작 영상으로 교체하는 방식이 효율적입니다.');

  -- =====================================================
  -- STEP 13. ChangeRequest 3개
  -- =====================================================

  -- CR1: P0-4 구현 방식 변경
  INSERT INTO change_requests (id, project_id, feature_id, access_link_id,
    title, content, reason, affected_features, schedule_impact, cost_impact,
    alternative, ai_recommendation, status)
  VALUES (cr_01, v_project_id, fid_p0_4, v_link_id,
    '[P0-4] 지역 판별 방식 변경 — 실시간 → 디바운스',
    '정의서에 명시된 "실시간 판별(매 입력 시 API 호출)" 방식을 "디바운스 500ms + 주소 선택 완료 시점 API 호출" 방식으로 변경을 요청드립니다.',
    '현재 정의서대로 구현 시 주소 입력 중 평균 8회 API 호출 발생. 월 예상 비용 9.6만원 추가. 디바운스 방식으로 변경 시 월 1.2만원 수준으로 절감 가능. 사용자 경험 차이 없음.',
    'P0-4 단독 영향. 타 기능 영향 없음.',
    '영향 없음 (구현 방식 변경, 일정 동일)',
    '비용 절감 70%. 변경 권장.',
    '현재 정의서대로 실시간 호출 유지 (비용 증가 감수)',
    '변경 승인을 권장합니다. 사용자 경험에 영향이 없고 비용 절감 효과가 명확합니다.',
    'pending');

  -- CR2: P0-2 범위 조정 (qa5 임시 처리)
  INSERT INTO change_requests (id, project_id, feature_id, access_link_id,
    title, content, reason, affected_features, schedule_impact, cost_impact,
    alternative, ai_recommendation, status)
  VALUES (cr_02, v_project_id, fid_p0_2, v_link_id,
    '[P0-2] qa5 잘못 선택 안내 링크 임시 URL 처리 후 배포 요청',
    'qa5 항목(잘못 선택 안내 링크)의 최종 URL 확정 전에, 임시 URL(인스타그램)로 배포하고 URL 확정 후 무중단으로 교체하는 방식을 요청드립니다.',
    'qa5 URL 확정을 기다리면 P0-2 프로덕션 배포가 지연됩니다. 임시 URL로 배포 후 교체하는 방식이 사용자 영향을 최소화합니다.',
    'P0-2 단독',
    '없음 (URL 교체는 서버 배포 없이 가능)',
    '없음',
    'URL 확정 후 배포 (현재 방식 유지)',
    'URL 교체 공수 최소화. 임시 배포 후 교체 방식 권장. 단, URL 확정을 최대한 빠르게 진행 권장.',
    'pending');

  -- CR3: P1-1 영상 → 슬라이드 대체 제안
  INSERT INTO change_requests (id, project_id, feature_id, access_link_id,
    title, content, reason, affected_features, schedule_impact, cost_impact,
    alternative, ai_recommendation, status)
  VALUES (cr_03, v_project_id, fid_p1_1, v_link_id,
    '[P1-1] 온보딩 영상 → 텍스트/슬라이드 형태로 1차 구현 제안',
    '온보딩 영상 URL이 미확정 상태로, 1차 배포 시 영상 대신 텍스트+이미지 슬라이드 형태로 온보딩 콘텐츠를 구현하고, 영상 준비 후 교체하는 방식을 제안드립니다.',
    '영상 URL 대기 중에는 온보딩 이수 기능 구현 불가. 슬라이드 형태로 1차 구현 후 영상 준비되면 교체하면 게이트 구조 변경 없이 콘텐츠만 교체 가능.',
    'P1-1 단독. 게이트 로직 변경 없음.',
    '영상 제작/조달 일정 불확실 → 슬라이드 대체 시 1주 앞당겨 배포 가능',
    '없음',
    '영상 URL 확정까지 P1-1 이수 기능 전체 보류',
    '단기 효율성 높음. 슬라이드 1차 구현 후 영상 교체 방식 권장.',
    'pending');

  -- =====================================================
  -- STEP 14. CompletionCandidate 2개
  -- =====================================================

  INSERT INTO completion_candidates (id, project_id, feature_id, access_link_id,
    summary, vendor_note, status, qa_results)
  VALUES
  -- CC1: P0-2 완료 후보 (qa5 미완 — 시나리오 E)
  (cc_01, v_project_id, fid_p0_2, v_link_id,
    '보호자·도그워커 가입 루트 병렬화 완료 후보 제출. qa1~qa4 통과, qa5 임시 URL 상태.',
    'qa1~qa4는 모두 통과했습니다. qa5(잘못 선택 안내 링크)는 최종 URL이 확정되지 않아 임시로 비포펫 인스타그램을 연결해두었습니다. URL 확정 후 즉시 교체 가능합니다. 프로덕션 배포는 대표님 확인 후 진행하겠습니다.',
    'pending',
    '{"qa1":{"item":"보호자 플로우 완료 후 보호자 홈 이동","passed":true},"qa2":{"item":"도그워커 플로우 완료 후 신분 확인 대기 화면","passed":true},"qa3":{"item":"역할별 홈 이동 확인","passed":true},"qa4":{"item":"뒤로가기 각 단계 정상","passed":true},"qa5":{"item":"잘못 선택 안내 링크 동작","passed":false,"note":"URL 미확정, 임시 연결 상태"}}'),

  -- CC2: P1-5 완료 승인 (정상 — 시나리오 A)
  (cc_02, v_project_id, fid_p1_5, v_link_id,
    '정산 및 세무 자료 자동화 전 QA 항목 통과. 완료 승인 완료.',
    'QA 4개 항목 전량 통과했습니다. 월별 정산 자동 계산, 내역 조회, PDF 생성, 관리자 수정 모두 정상 동작 확인했습니다.',
    'approved',
    '{"qa1":{"item":"월별 정산 자동 계산 정확도","passed":true},"qa2":{"item":"도그워커 정산 내역 조회","passed":true},"qa3":{"item":"간이영수증 PDF 생성","passed":true},"qa4":{"item":"관리자 수동 수정","passed":true}}');

  -- =====================================================
  -- STEP 15. Question 4개
  -- =====================================================

  INSERT INTO questions (id, project_id, feature_id, access_link_id,
    question, context, answer, answered_at, answered_by, is_resolved)
  VALUES
  -- Q1: 해결됨
  (q_01, v_project_id, fid_p0_1, v_link_id,
    'HEIC 변환 라이브러리 선택 기준이 있으신가요?',
    'P0-1 업로드 핫픽스에서 HEIC → JPEG 변환이 필요합니다. heic2any, libheif 등 여러 옵션이 있습니다.',
    '번들 크기 최소화 원칙으로 heic2any 경량 버전을 사용해주세요. 서버 사이드 변환은 이번 범위 외입니다.',
    NOW() - INTERVAL '20 days', v_founder_id, TRUE),

  -- Q2: 미해결 (qa5 URL)
  (q_02, v_project_id, fid_p0_2, v_link_id,
    '"잘못 선택했어요" 안내 링크에 연결할 URL은 어디인가요?',
    '보호자·도그워커 역할 선택 화면에서 "내 역할이 뭔지 모르겠어요" 링크를 어디로 연결할지 결정이 필요합니다. 임시로 인스타그램을 연결해뒀습니다.',
    NULL, NULL, NULL, FALSE),

  -- Q3: 미해결 (P0-4 API)
  (q_03, v_project_id, fid_p0_4, v_link_id,
    '지역 판별 API를 카카오맵으로 사용해도 되나요?',
    '카카오맵과 Tmap을 비교 분석한 결과 카카오맵을 추천드립니다. 기존 카카오 로그인과 동일 벤더라 관리 편의성이 높습니다. 승인해주시면 바로 구현에 착수하겠습니다.',
    NULL, NULL, NULL, FALSE),

  -- Q4: 미해결 (P1-1 영상)
  (q_04, v_project_id, fid_p1_1, v_link_id,
    '도그워커 온보딩 교육 영상은 비포펫에서 제작하시나요, 아니면 외부 영상을 활용하나요?',
    '온보딩 게이트에 교육 영상 3편이 필요합니다. 영상 URL이 확정되어야 이수 확인 기능을 완성할 수 있습니다. 영상이 준비될 때까지 텍스트 슬라이드 방식으로 1차 구현을 제안드립니다.',
    NULL, NULL, NULL, FALSE);

  -- =====================================================
  -- STEP 16. FounderDailyBrief 4일치
  -- =====================================================

  INSERT INTO founder_daily_briefs (project_id, brief_date,
    key_signals, report_summary, must_check_items, decision_items,
    full_content, sent_at)
  VALUES

  -- D-2 브리프
  (v_project_id, d_2,
    '[{"rank":1,"signal":"P0-4 API 미결정으로 구현 착수 불가","level":"위험","feature":"P0-4"},{"rank":2,"signal":"P1-1 온보딩 영상 URL blocker 발생","level":"주의","feature":"P1-1"},{"rank":3,"signal":"P0-2 qa5 URL 임시 연결 상태","level":"주의","feature":"P0-2"}]',
    '오늘 2건의 보고가 제출됐습니다. P0-4는 카카오맵 vs Tmap 비교 분석을 완료했으나 대표 확인이 필요해 구현 착수를 못 하고 있습니다. P1-2는 API 설계 초안을 완료했으며 내일 구현 시작 예정입니다. P0-4 외 변경 요청(디바운스 방식)도 대기 중입니다.',
    '[{"title":"P0-4 카카오맵 API 선택 승인 필요","trigger":"외주사_확인_요청","urgency":"high"},{"title":"P0-4 디바운스 방식 변경 승인","trigger":"정책_범위_비용_변경","urgency":"high"}]',
    '[{"title":"카카오맵 vs Tmap 선택","status":"pending","ai_rec":"카카오맵 권장"},{"title":"디바운스 방식 변경 승인","status":"pending","ai_rec":"승인 권장 (비용 절감 70%)"}]',
    '# ' || d_2::TEXT || ' Founder Daily Brief — BeforePet 외주 개발\n\n## 🔴 오늘 핵심 이슈\n1. P0-4 API 미결정 → 구현 착수 불가 (위험)\n2. P0-4 변경 요청(디바운스) 승인 대기 (주의)\n3. P1-1 온보딩 영상 URL 정책 미확정 (주의)\n\n## ✅ 오늘 진행된 것\n- P0-4: 카카오맵/Tmap 비교 분석 완료\n- P1-2: 구독형 수락 API 설계 초안 완료\n\n## 💬 대표님 오늘 확인 사항\n1. 카카오맵 API 사용 승인? (추천: 예)\n2. 디바운스 방식 변경 승인? (추천: 예, 비용 70% 절감)\n\n## 📊 기능별 현황\n- P0-1: 완료 ✅\n- P0-2: 완료 후보 (qa5 보류)\n- P0-3: 진행중 🔄\n- P0-4: 대기 ⏸ (대표 확인 필요)\n- P1-5: 완료 ✅',
    NOW() - INTERVAL '2 days'),

  -- D-1 브리프
  (v_project_id, d_1,
    '[{"rank":1,"signal":"P0-3 진척 불명확 — PR/커밋 없음","level":"주의","feature":"P0-3"},{"rank":2,"signal":"P0-4 대표 확인 미완료 — 구현 착수 2일째 지연","level":"위험","feature":"P0-4"},{"rank":3,"signal":"P0-2 완료 후보 qa5 URL 아직 미결정","level":"주의","feature":"P0-2"}]',
    '오늘은 P0-3 보고 1건이 제출됐습니다. "의존성 이슈로 작업 진행 중"이라는 내용이나 PR이나 커밋이 없어 진척 수준 파악이 어렵습니다. P0-4 보고는 없었습니다. 대표 확인이 필요한 항목이 어제와 동일하게 대기 중입니다.',
    '[{"title":"P0-3 진척 확인 — 오늘 추가 보고 없음","trigger":"점검_권장_신호","urgency":"medium"},{"title":"P0-4 대표 확인 2일째 미완 — 긴급","trigger":"외주사_확인_요청","urgency":"high"}]',
    '[{"title":"카카오맵 API 선택","status":"pending","ai_rec":"카카오맵 권장, 빠른 결정 필요"},{"title":"P0-3 내일 PR 제출 요청 여부","status":"pending"}]',
    '# ' || d_1::TEXT || ' Founder Daily Brief — BeforePet 외주 개발\n\n## 🔴 오늘 핵심 이슈\n1. P0-4 대표 확인 2일째 미완 → 구현 착수 불가 (위험 격상)\n2. P0-3 진척 불명확 — PR 없음 (주의)\n3. P0-2 qa5 URL 여전히 미결정 (주의)\n\n## ⚠️ 어제 대비 변화\n- P0-4: 어제 분석 완료 → 오늘 보고 없음 (대기 상태 확인 필요)\n- P0-3: "작업 중" 보고이나 구체적 진척 없음\n\n## 💬 대표님 오늘 확인 사항\n1. 카카오맵 API 승인 (2일째 대기 중)\n2. P0-3 외주사에 "내일 PR 제출" 요청할지 여부\n3. P0-2 qa5 URL 결정',
    NOW() - INTERVAL '1 day'),

  -- D-0 (오늘) 브리프
  (v_project_id, d_0,
    '[{"rank":1,"signal":"P0-2 완료 후보 제출 — qa5 확인 필요","level":"주의","feature":"P0-2"},{"rank":2,"signal":"P0-4 대표 확인 3일째 — 즉시 처리 필요","level":"위험","feature":"P0-4"},{"rank":3,"signal":"P1-1 온보딩 영상 URL blocker","level":"주의","feature":"P1-1"}]',
    '오늘 3건의 보고가 제출됐습니다. P0-2가 완료 후보로 제출됐으나 qa5 URL이 임시 상태입니다. P1-2는 구현이 정상 진행 중입니다. P1-1은 기본 UI 구현 시작됐으나 영상 URL blocker가 있습니다.',
    '[{"title":"P0-2 완료 후보 최종 검수 — qa5 URL 확정","trigger":"완료_후보_검수","urgency":"high"},{"title":"P0-4 API 선택 확정 (3일째 대기)","trigger":"외주사_확인_요청","urgency":"critical"}]',
    '[{"title":"P0-2 qa5 URL 결정 및 완료 승인","status":"pending","ai_rec":"URL 확정 후 완료 승인 권장"},{"title":"카카오맵 API 선택 최종 결정","status":"pending","ai_rec":"즉시 결정 필요"},{"title":"P1-1 온보딩 영상 정책","status":"pending","ai_rec":"슬라이드 대체 1차 구현 권장"}]',
    '# ' || d_0::TEXT || ' Founder Daily Brief — BeforePet 외주 개발\n\n## 📌 오늘의 가장 중요한 3가지\n1. **[완료 후보] P0-2** — qa5 URL 확정 후 완료 승인\n2. **[즉시 필요] P0-4** — 카카오맵 API 승인 (3일째 대기, 오늘 안 결정 필요)\n3. **[정책 결정] P1-1** — 온보딩 영상 URL 또는 슬라이드 대체 승인\n\n## ✅ 오늘 좋은 신호\n- P0-2 완료 후보 제출 (qa5 제외 4개 항목 통과)\n- P1-2 구독형 수락 API 구현 정상 진행\n- P1-1 기본 UI 구현 시작\n\n## ⚠️ 주의 기능\n- P0-3: 진척 아직 불명확 (PR 없음)\n- P0-4: 대표 확인 3일째 지연\n\n## 🎯 오늘 추천 액션 (30분 내)\n1. 카카오맵 API 승인 → 외주사에 전달\n2. P0-2 qa5 URL 결정 (인스타그램 임시 또는 블로그 링크)\n3. P0-3 외주사에 "내일 PR 제출 요청" 메시지\n\n## 📊 전체 현황\n| 기능 | 상태 |\n|------|------|\n| P0-1 | ✅ 완료 승인 |\n| P0-2 | 🔵 완료 후보 (qa5 대기) |\n| P0-3 | 🔄 진행중 (주의) |\n| P0-4 | ⏸ 대기 (대표 확인 필요) |\n| P0-5 | 📝 정의서 초안 |\n| P0-6 | 📝 정의서 초안 |\n| P0-7 | ⬜ 미시작 |\n| P1-1 | 🔄 진행중 |\n| P1-2 | 🔄 진행중 (정상) |\n| P1-3 | ⬜ 미시작 |\n| P1-4 | ⬜ 미시작 |\n| P1-5 | ✅ 완료 승인 |\n| P1-6 | 📝 정의서 초안 |\n| P1-7 | ⬜ 미시작 |',
    NOW()),

  -- D+1 (내일) 브리프 (예약)
  (v_project_id, d_p1,
    '[{"rank":1,"signal":"P0-4 착수 가능 여부 (오늘 대표 확인 결과에 달림)","level":"주의","feature":"P0-4"},{"rank":2,"signal":"P0-3 PR 제출 여부 확인","level":"주의","feature":"P0-3"},{"rank":3,"signal":"P0-2 완료 승인 여부","level":"정보","feature":"P0-2"}]',
    '(예약 브리프 — 내일 생성 예정)',
    '[{"title":"P0-4 착수 여부 확인","trigger":"점검_권장_신호","urgency":"high"}]',
    '[{"title":"오늘 결정 사항 적용 확인","status":"pending"}]',
    '# ' || d_p1::TEXT || ' Founder Daily Brief — BeforePet 외주 개발\n\n(내일 보고 취합 후 업데이트 예정)\n\n## 📌 내일 주요 확인 포인트\n1. P0-4: 오늘 대표 확인 완료 시 내일 구현 착수 여부\n2. P0-3: PR 제출 여부 (요청 후 결과 확인)\n3. P0-2: 완료 승인 완료 시 프로덕션 배포\n\n## 🎯 다음 주 목표 (미리 보기)\n- P0-3 구현 완료 + PR 제출\n- P0-4 카카오맵 구현 시작 (오늘 승인 전제)\n- P0-5 정의서 작성 완료 및 대표 검토 요청\n- P1-1 게이트 UI 완성\n- P1-2 API 70% 구현',
    NOW() + INTERVAL '1 day');

  RAISE NOTICE '===================================================';
  RAISE NOTICE '✅ BeforePet 데모 시드 데이터 생성 완료!';
  RAISE NOTICE '===================================================';
  RAISE NOTICE '생성된 데이터:';
  RAISE NOTICE '  - 프로젝트: 1개 (BeforePet 앱 개발 외주 1차)';
  RAISE NOTICE '  - 기능(Feature): 14개 (P0-1~P0-7, P1-1~P1-7)';
  RAISE NOTICE '  - 기능 정의서(Spec): 8개';
  RAISE NOTICE '  - 주간 계획(WeeklyPlan): 3주치';
  RAISE NOTICE '  - 일일 보고(Report): 14개 (7일 분산)';
  RAISE NOTICE '  - 증빙자료(Evidence): 21개';
  RAISE NOTICE '  - AI 판단 카드(DailyAssessment): 14개';
  RAISE NOTICE '  - Must-Check: 5개';
  RAISE NOTICE '  - 리스크(Risk): 8개';
  RAISE NOTICE '  - 의사결정(Decision): 4개';
  RAISE NOTICE '  - 변경 요청(ChangeRequest): 3개';
  RAISE NOTICE '  - 완료 후보(CompletionCandidate): 2개';
  RAISE NOTICE '  - Founder Daily Brief: 4일치 (어제~내일)';
  RAISE NOTICE '  - 질문(Question): 4개 (1개 해결, 3개 대기)';
  RAISE NOTICE '---------------------------------------------------';
  RAISE NOTICE '외주사 접근 토큰: beforepet-vendor-demo-token-2024';
  RAISE NOTICE '접속 URL: /vendor/beforepet-vendor-demo-token-2024';
  RAISE NOTICE '===================================================';

END $$;
