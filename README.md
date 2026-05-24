# 김PM (KimPM)

AI 기반 외주 프로젝트 관리 서비스 — Founder 하루 5분, 외주사 30초 보고

---

## 🚀 배포 현황

| 항목 | 값 |
|------|-----|
| **프로덕션 URL** | https://kimpm.vercel.app |
| **GitHub** | https://github.com/dreamcatcher-leo/KimPM |
| **Vercel 프로젝트** | kimpm (kdh6881-8700s-projects) |
| **브랜치** | main |
| **마지막 배포** | 2026-05-24 ✅ 성공 |
| **Next.js** | 15.5.18 |

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **목적** | AI 외주사 관리 자동화 (Founder 하루 30초~5분, 외주사 30초 보고) |
| **기술 스택** | Next.js 15.5.18 + TypeScript + Tailwind CSS + shadcn/ui |
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
/projects/new                       새 프로젝트 생성 (온보딩 + AI 분석 + 외주사 서치)
/projects/[id]/dashboard            프로젝트 대시보드 (계약 진행률, AI 신호)
/projects/[id]/features             기능 목록 (P0/P1/P2/P3 그룹) + 기능정의서 전달 패널
/projects/[id]/features/new         기능 추가
/projects/[id]/features/[fid]/spec  AI 기능 정의서 생성·승인
/projects/[id]/reports              일일 보고 타임라인 + AI 판단 카드
/projects/[id]/must-check           Must-Check 항목 관리
/projects/[id]/risks                리스크 대시보드
/projects/[id]/decisions            의사결정함 (승인/반려/보류)
/projects/[id]/change-requests      변경 요청 검토
/projects/[id]/weekly-plan          주간 계획 AI 생성·일괄생성·승인
/projects/[id]/weekly-report        주간 PM 리포트 (4주 통계)
/projects/[id]/jobs                 백그라운드 작업센터 (5개 잡 상태 추적)
/projects/[id]/settings             프로젝트 설정 (Discord, 시간, 링크)
/vendor-search                      외주사 서치 AI 에이전트 (3단계: 입력→검색중→후보목록)
```

### Vendor (외주사) 화면
```
/vendor/[token]                     외주사 홈 (오늘 보고 현황, 빠른 메뉴)
/vendor/[token]/specs               승인된 기능 정의서 조회 (열람기록 자동 저장)
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
| POST | `/api/projects` | 프로젝트 생성 |
| POST | `/api/projects/[id]/vendor-link` | 외주사 링크 발급 |
| GET/POST/PUT | `/api/projects/[id]/weekly-plan` | 주간 계획 (생성/일괄생성/승인) |
| GET/PUT | `/api/projects/[id]/specs` | 기능정의서 전달 현황/단건·일괄 전달 |
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
profiles              사용자 프로필 (역할: founder/vendor/admin)
projects              프로젝트 (계약 정보, Discord 설정, Brief 시간)
access_links          외주사 접근 링크 (nanoid 32자 토큰)
features              기능 목록 (P0~P3 우선순위)
specs                 기능 정의서 (AI 생성, sent_at/viewed_at 추가)
weekly_plans          주간 계획 (AI 초안 → 외주사 협의 → Founder 승인)
reports               일일 보고 (전체 현황, 블로커, 내일 계획)
evidence_items        증빙 자료 (7가지 유형)
vendor_private_notes  외주사 비공개 메모
daily_assessments     AI 일일 판단 카드 (정상/주의/점검_권장 3단계)
must_check_items      Must-Check (6가지 트리거 조건 자동 등록)
founder_daily_briefs  Founder Daily Brief (AI 생성, Discord 발송)
risks                 리스크 대시보드
decisions             의사결정함 (승인/반려/보류)
change_requests       변경 요청 (AI 권고 포함)
questions             외주사 질문
completion_candidates 완료 후보 (검토 → 승인 워크플로)
motivation_events     외주사 모티베이션 이벤트
```

---

## 환경변수 (Vercel에 등록 완료)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API key (gpt-4o) |
| `OPENAI_MODEL` | `gpt-4o` |
| `NEXT_PUBLIC_APP_URL` | `https://kimpm.vercel.app` |
| `CRON_SECRET` | Cron 인증 시크릿 |

> `.env.local`은 `.gitignore` 처리되어 GitHub에 올라가지 않습니다.

---

## 로컬 개발

```bash
# 1. 의존성 설치
npm install --legacy-peer-deps

# 2. 환경변수 설정
cp .env.local.example .env.local  # Supabase, OpenAI 입력

# 3. 개발 서버 실행
npm run dev
```

---

## 빌드 & 배포

```bash
# 로컬 빌드 확인
npm run build

# Vercel 배포 (토큰 필요)
vercel deploy --prod --token=$VERCEL_TOKEN --yes
```

---

## 빌드 상태

- **TypeScript**: ✅ 에러 0개
- **Next.js**: ✅ 15.5.18 (보안 취약점 패치 완료)
- **Vercel 배포**: ✅ https://kimpm.vercel.app (2026-05-24)
- **GitHub**: ✅ main 브랜치 최신
- **환경변수**: ✅ Vercel에 7개 등록 완료
- **npm**: ✅ `.npmrc` legacy-peer-deps 설정 완료

---

*Last Updated: 2026-05-24*
