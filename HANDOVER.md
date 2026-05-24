# 김PM 프로젝트 인수인계 문서
> 새 채팅 시작 시 이 문서 전체를 붙여넣으세요.

---

## 1. 프로젝트 기본 정보

- **서비스명**: 김PM (KimPM)
- **목적**: AI 기반 외주 프로젝트 관리 — Founder 하루 5분, 외주사 30초 보고
- **샌드박스 경로**: `/home/user/webapp`
- **GitHub**: `https://github.com/dreamcatcher-leo/KimPM` (브랜치: `main`)
- **프로덕션 URL**: `https://kimpm.vercel.app` ✅ 운영 중
- **Vercel 프로젝트명**: `kimpm` (계정: `kdh6881-8700`)

---

## 2. 기술 스택

| 항목 | 값 |
|------|-----|
| Framework | Next.js 15.5.18 App Router |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth (`profiles.role`: founder/vendor/admin) |
| DB | Supabase PostgreSQL (18개 테이블) |
| AI | OpenAI gpt-4o |
| 배포 | Vercel (Cron 포함) |
| PM2 앱명 | `deliveryguard-pm` (샌드박스 로컬 서버) |

---

## 3. 핵심 파일 구조

```
src/
├── app/
│   ├── api/
│   │   ├── projects/[id]/weekly-plan/route.ts   ← 주간계획 (bulk_generate/approve)
│   │   ├── projects/[id]/specs/route.ts          ← 기능정의서 전달 (send/send_all)
│   │   ├── features/[id]/spec/route.ts
│   │   ├── reports/route.ts
│   │   └── cron/                                 ← daily-brief, weekly-report
│   ├── projects/
│   │   ├── new/page.tsx                          ← 온보딩 + 외주사 서치 버튼
│   │   └── [id]/
│   │       ├── dashboard/page.tsx
│   │       ├── features/page.tsx                 ← SpecDeliveryPanel 통합
│   │       ├── weekly-plan/
│   │       │   ├── page.tsx
│   │       │   └── WeeklyPlanClient.tsx          ← 전면 재작성 (일괄생성 UI)
│   │       └── jobs/page.tsx                     ← 백그라운드 작업센터
│   ├── vendor/
│   │   ├── [token]/specs/page.tsx                ← 열람기록 자동 저장
│   │   └── home/page.tsx
│   └── vendor-search/page.tsx                    ← 외주사 서치 AI 에이전트
├── components/
│   ├── features/SpecDeliveryPanel.tsx            ← 기능정의서 전달 현황 패널
│   ├── layout/AppSidebar.tsx                     ← 작업센터 링크 + Cpu 아이콘
│   └── dashboard/DashboardWeeklyAnalysis.tsx
├── lib/
│   └── openai/client.ts                          ← generateWeeklyPlan 강화
└── types/index.ts                                ← Spec에 sent_at/viewed_at 추가
```

---

## 4. 최근 완료된 작업 (세션 5)

| 섹션 | 작업 | 상태 |
|------|------|------|
| 섹션 8 | 주간 계획 로직 개선 (fallback 버그, 전체 기간 일괄 생성) | ✅ |
| 섹션 7 | 기능정의서 전달/외주사 열람 구조 (sent_at, viewed_at) | ✅ |
| 섹션 10 | 백그라운드 작업센터 UI (`/projects/[id]/jobs`) | ✅ |
| 섹션 9 | 외주사 서치 AI 에이전트 버튼 동작 수정 + `/vendor-search` 페이지 구현 | ✅ |
| 배포 | GitHub push + Vercel 배포 | ✅ |

---

## 5. Git 커밋 히스토리 (최근)

```
e414acd fix: upgrade Next.js to 15.5.18 to fix Vercel security vulnerability block
c33e754 fix: add .npmrc for Vercel deploy (legacy-peer-deps)
e5ee61f feat: 외주사 서치 AI 에이전트 — /vendor-search 페이지 구현, 버튼 연결
2108a8d feat: 섹션7+8+10 — 주간계획 로직 개선, 기능정의서 전달/열람 추적, 백그라운드 작업센터
ddf1805 feat: 사이드바 프로젝트 스위처, 대표 대시보드 비개발자 번역, AI 일별 캐시, 온보딩 전면 개편
830a810 brand: DeliveryGuard PM → 김PM 전면 교체
```

---

## 6. 환경변수 (.env.local — git 제외)

```
NEXT_PUBLIC_SUPABASE_URL=https://czfnmvmcavenlxvyfkim.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[설정됨]
SUPABASE_SERVICE_ROLE_KEY=[설정됨]
OPENAI_API_KEY=[설정됨]
OPENAI_MODEL=gpt-4o
NEXT_PUBLIC_APP_URL=https://kimpm.vercel.app
CRON_SECRET=deliveryguard-cron-2024
VERCEL_TOKEN=[재발급된 토큰 저장됨]
GITHUB_TOKEN=[ghp_ 토큰 저장됨]
```

> ✅ Vercel 환경변수도 동일하게 등록 완료 (7개)

---

## 7. 알려진 이슈 / 주의사항

| 항목 | 내용 |
|------|------|
| `@base-ui/react` ↔ `date-fns` 충돌 | `.npmrc`에 `legacy-peer-deps=true` 로 해결. 건드리지 말 것 |
| `alignment_signal` 타입 | `'정상'` 단독 비교로 수정됨 (dashboard/page.tsx) |
| `onClick={fetchAnalysis}` 타입 오류 | `onClick={() => fetchAnalysis()}` 래퍼로 수정됨 |
| Vercel GitHub 연동 | Vercel ↔ GitHub App 연동 미완료. `vercel deploy` CLI로 직접 배포 중 |
| NEXT_PUBLIC_APP_URL | Vercel에서 encrypted 저장됨 (정상) |

---

## 8. 로컬 서버 재시작 방법 (샌드박스)

```bash
cd /home/user/webapp
npm run build
pm2 restart deliveryguard-pm
# 또는
pm2 delete all && pm2 start ecosystem.config.cjs
```

---

## 9. Vercel 재배포 방법

```bash
cd /home/user/webapp
VERCEL_TOKEN=$(grep VERCEL_TOKEN .env.local | cut -d= -f2)
vercel deploy --prod --token=$VERCEL_TOKEN --yes
```

---

## 10. GitHub push 방법

```bash
cd /home/user/webapp
# origin remote가 없을 경우:
GITHUB_TOKEN=$(grep GITHUB_TOKEN .env.local | cut -d= -f2)
git remote add origin https://${GITHUB_TOKEN}@github.com/dreamcatcher-leo/KimPM.git

# push
git push origin main
```

---

## 11. 다음 작업 후보 (우선순위 미정)

- [ ] Vercel ↔ GitHub App 연동 (Vercel 대시보드에서 GitHub 계정 연결 → 자동 배포)
- [ ] `/vendor-search` 페이지 실제 AI 검색 로직 연결 (현재 UI만 구현)
- [ ] Supabase DB 마이그레이션 최신화 확인 (sent_at, viewed_at 컬럼)
- [ ] Discord Webhook 실제 URL 설정
- [ ] 커스텀 도메인 연결 (kimpm.vercel.app → 커스텀 도메인)

---

*작성일: 2026-05-24 | 샌드박스 경로: /home/user/webapp*
