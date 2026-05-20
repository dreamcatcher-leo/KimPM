# DeliveryGuard PM v2 — for BeforePet

비포펫 내부용 AI 외주 PM 웹 애플리케이션

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **목적** | AI 외주사 관리 자동화 (Founder 하루 30초~5분, 외주사 30초 보고) |
| **기술 스택** | Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui |
| **백엔드** | Supabase (Auth + PostgreSQL + Storage) |
| **AI** | OpenAI API (기능 정의서, 주간 계획, AI 판단 카드, Daily Brief) |
| **알림** | Discord Webhook (일일 보고, 리스크, 완료, 브리프) |
| **배포** | Vercel (Pages + Cron Jobs) |

---

## 사용자 역할

| 역할 | 접근 경로 | 주요 기능 |
|------|-----------|-----------|
| **Founder (대표)** | `/dashboard` → 로그인 필요 | 전체 프로젝트 관리, AI 판단 확인, 의사결정 |
| **Vendor (외주사)** | `/vendor/[token]` → 회원가입 불필요 | 일일 보고, 증빙 제출, 질문·변경 요청 |
| **AI PM (System)** | API Routes 자동 처리 | 기능 정의서 생성, 일일 판단 카드, Daily Brief |

---

## 페이지 구조

### Founder 화면
```
/dashboard                          전체 프로젝트 목록
/projects/new                       새 프로젝트 생성 (비포펫 시드 포함)
/projects/[id]/dashboard            프로젝트 대시보드 (계약 진행률, AI 신호)
/projects/[id]/features             기능 목록 (P0/P1/P2/P3 그룹)
/projects/[id]/features/new         기능 추가
/projects/[id]/features/[fid]/spec  AI 기능 정의서 생성·승인
/projects/[id]/reports              일일 보고 타임라인 + AI 판단 카드
/projects/[id]/must-check           Must-Check 항목 관리
/projects/[id]/risks                리스크 대시보드
/projects/[id]/decisions            의사결정함 (승인/반려/보류)
/projects/[id]/change-requests      변경 요청 검토
/projects/[id]/weekly-plan          주간 계획 AI 생성·승인
/projects/[id]/weekly-report        주간 PM 리포트 (4주 통계)
/projects/[id]/settings             프로젝트 설정 (Discord, 시간, 링크)
```

### Vendor (외주사) 화면
```
/vendor/[token]                     외주사 홈 (오늘 보고 현황, 빠른 메뉴)
/vendor/[token]/specs               승인된 기능 정의서 조회
/vendor/[token]/report              저마찰 일일 보고 (필수 4개 필드)
/vendor/[token]/evidence            증빙자료 별도 제출 (7가지 유형)
/vendor/[token]/questions           질문 등록
/vendor/[token]/change-request      변경 요청 제출
/vendor/[token]/completion          완료 후보 제출
/vendor/[token]/private-notes       비공개 메모 (외주사 전용)
```

---

## API Routes

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/projects` | 프로젝트 생성 (비포펫 시드 내장) |
| POST | `/api/projects/[id]/vendor-link` | 외주사 링크 발급 (nanoid 32자) |
| POST | `/api/projects/[id]/weekly-plan` | AI 주간 계획 생성 |
| POST | `/api/features/[id]/spec` | AI 기능 정의서 생성 |
| PUT | `/api/features/[id]/spec` | 기능 정의서 수정 |
| POST | `/api/features/[id]/spec/approve` | 기능 정의서 승인 |
| POST | `/api/reports` | 일일 보고 제출 + AI 판단 + Must-Check 자동 등록 |
| POST | `/api/evidence` | 증빙 저장 |
| POST | `/api/must-check/[id]/resolve` | Must-Check 해결 처리 |
| GET | `/api/vendor/verify` | 외주사 토큰 검증 |
| POST | `/api/vendor/questions` | 질문 등록 |
| POST | `/api/vendor/change-request` | 변경 요청 + AI 권고 + 의사결정/Must-Check 자동 등록 |
| POST | `/api/vendor/completion` | 완료 후보 제출 + Must-Check + 의사결정 자동 등록 |
| POST | `/api/vendor/private-notes` | 비공개 메모 저장 |
| GET | `/api/cron/daily-brief` | Daily Brief 생성 + Discord 발송 (Vercel Cron) |
| GET | `/api/cron/weekly-report` | 주간 리포트 생성 + Discord 발송 (Vercel Cron) |

---

## Vercel Cron 스케줄

| 엔드포인트 | 스케줄 | 설명 |
|-----------|--------|------|
| `/api/cron/daily-brief` | `0 0 * * *` (UTC 00:00 = KST 09:00) | Founder Daily Brief |
| `/api/cron/weekly-report` | `0 9 * * 5` (UTC 09:00 금 = KST 18:00 금) | 주간 PM 리포트 |

---

## 데이터 모델 (주요 18개 테이블)

```
profiles            사용자 프로필 (역할: founder/vendor/admin)
projects            프로젝트 (계약 정보, Discord 설정, Brief 시간)
access_links        외주사 접근 링크 (nanoid 32자 토큰)
features            기능 목록 (P0~P3 우선순위, 14개 비포펫 시드)
specs               기능 정의서 (AI 생성, 버전 관리, 승인 워크플로)
weekly_plans        주간 계획 (AI 초안 → 외주사 협의 → Founder 승인)
reports             일일 보고 (전체 현황, 블로커, 내일 계획)
evidence_items      증빙 자료 (7가지 유형: 코드/스크린샷/URL 등)
vendor_private_notes 외주사 비공개 메모
daily_assessments   AI 일일 판단 카드 (정상/주의/점검_권장 3단계)
must_check_items    Must-Check (6가지 트리거 조건 자동 등록)
founder_daily_briefs Founder Daily Brief (AI 생성, Discord 발송)
risks               리스크 대시보드
decisions           의사결정함 (승인/반려/보류)
change_requests     변경 요청 (AI 권고 포함)
questions           외주사 질문
completion_candidates 완료 후보 (검토 → 승인 워크플로)
motivation_events   외주사 모티베이션 이벤트
```

---

## 핵심 설계 원칙

- **Founder 하루 5분 이내**: AI가 상황을 요약, Founder는 결정만
- **외주사 30초 보고**: 필수 4개 필드(현황/진행률/블로커/내일 계획)만
- **Discord 1차 채널**: 모든 중요 이벤트는 Discord로 먼저 알림
- **AI 정합성 신호**: "지연 확정" 판단 금지, 정상/주의/점검_권장 3단계만
- **Must-Check 자동 등록**: 6가지 트리거 조건 (변경 요청, 반복 블로커 등)
- **토큰 기반 외주사 접근**: 회원가입 없이 nanoid(32) 토큰으로 접근

---

## 비포펫 시드 데이터 (14개 기능)

**P0 (즉시 시작, 7개)**
- P0-01: 업로드·촬영 장애 핫픽스
- P0-02: 결제 플로우 안정화
- P0-03: 보호자 온보딩 리텐션 개선
- P0-04: 회원 탈퇴·데이터 삭제 GDPR 대응
- P0-05: 관리자 콘텐츠 승인 워크플로
- P0-06: 사용자 신고·차단 시스템
- P0-07: 앱 크래시 모니터링 및 원격 로그

**P1 (2주 내 착수, 7개)**
- P1-01: 반려동물 건강 기록 캘린더
- P1-02: 커뮤니티 피드 알고리즘 개선
- P1-03: 푸시 알림 고도화
- P1-04: 보호자 매칭 필터 확장
- P1-05: AI 반려동물 케어 팁 개인화
- P1-06: 다국어 지원 (영어·일본어)
- P1-07: 리뷰·평점 시스템

---

## 로컬 개발 설정

```bash
# 1. 환경변수 설정
cp .env.example .env.local
# → Supabase, OpenAI, Discord, Resend, CRON_SECRET 입력

# 2. Supabase 마이그레이션 적용
npx supabase db push
# 또는 Supabase 대시보드에서 supabase/migrations/001_initial_schema.sql 실행

# 3. 시드 데이터 탑재
# Supabase 대시보드 SQL Editor에서 supabase/seeds/001_beforepet_features.sql 실행

# 4. 개발 서버 실행
npm run dev
```

---

## Vercel 배포

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 배포
vercel --prod

# 3. 환경변수 설정 (Vercel 대시보드 또는 CLI)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add DISCORD_WEBHOOK_URL
vercel env add CRON_SECRET
vercel env add NEXT_PUBLIC_APP_URL
```

---

## 빌드 상태

- **TypeScript**: ✅ 에러 0개 (`npx tsc --noEmit` 통과)
- **Git**: ✅ main 브랜치 커밋 완료
- **shadcn/ui**: ✅ 10개 컴포넌트 설치 완료
- **Vercel 배포**: ⏳ 미배포 (환경변수 설정 후 배포 필요)
- **Supabase DB**: ⏳ 마이그레이션 미적용 (배포 후 실행 필요)

---

*Last Updated: 2026-05-20*
