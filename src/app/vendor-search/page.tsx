'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Search, Sparkles, ArrowLeft, CheckCircle2, Star, Building2,
  Mail, DollarSign, Clock, Code2, ChevronDown, ChevronUp,
  Send, Copy, RefreshCw, AlertTriangle, Info, ExternalLink,
  Users, Zap, FileText, RotateCcw,
} from 'lucide-react'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
interface VendorCandidate {
  id: string
  name: string
  description: string
  techStack: string[]
  estimatedBudget: string   // 예: "2,000~4,000만원"
  estimatedDuration: string // 예: "8~12주"
  fitScore: number          // 0~100
  fitReasons: string[]
  concerns: string[]
  portfolioKeywords: string[]
  contactHint: string       // 예: "careers@xxx.com 형식 추정"
  coldMailDraft?: string
  status: 'candidate' | 'contacted' | 'replied' | 'meeting' | 'rejected'
}

type SearchPhase = 'input' | 'searching' | 'candidates' | 'mail_draft' | 'done'

const statusConfig: Record<VendorCandidate['status'], { label: string; color: string }> = {
  candidate:  { label: '후보',       color: 'bg-slate-100 text-slate-600 border-slate-200' },
  contacted:  { label: '콜드메일 발송', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  replied:    { label: '답장 받음',   color: 'bg-green-100 text-green-700 border-green-200' },
  meeting:    { label: '미팅 확정',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  rejected:   { label: '진행 안함',  color: 'bg-red-100 text-red-600 border-red-200' },
}

// ─── MOCK AI 응답 (실제 API 연동 전 데모용) ───────────────────────────────────
function buildMockCandidates(requirements: string): VendorCandidate[] {
  return [
    {
      id: '1',
      name: '모던스택 개발팀',
      description: 'React/Next.js + Node.js 전문. 스타트업 MVP 20건 이상 납품. 소규모 팀으로 PM 직접 소통 가능',
      techStack: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'AWS'],
      estimatedBudget: '2,500~4,000만원',
      estimatedDuration: '10~14주',
      fitScore: 91,
      fitReasons: ['React/Next.js 핵심 스택 일치', 'MVP 경험 다수', '소규모 직접 소통 선호'],
      concerns: ['팀 규모 3~4인 소규모로 일정 리스크'],
      portfolioKeywords: ['배달', '커머스', '소셜', '핀테크 MVP'],
      contactHint: 'contact@modernstack.io 형식 추정',
      status: 'candidate',
    },
    {
      id: '2',
      name: '디지털팩토리',
      description: '5년차 앱 개발 전문. iOS/Android + 백엔드 풀스택. 제조업/물류 분야 레퍼런스 보유',
      techStack: ['Flutter', 'React Native', 'Django', 'MySQL', 'GCP'],
      estimatedBudget: '3,000~5,500만원',
      estimatedDuration: '12~16주',
      fitScore: 74,
      fitReasons: ['모바일 앱 경험 풍부', '백엔드 설계 역량'],
      concerns: ['예산 초과 가능성', '스택 일치도 중간 수준'],
      portfolioKeywords: ['물류 관제', '제조 ERP', '현장 작업 앱'],
      contactHint: 'biz@digitalfactory.kr 형식 추정',
      status: 'candidate',
    },
    {
      id: '3',
      name: '클라우드브릿지',
      description: 'AWS/GCP 인프라 + SaaS 개발 특화. 확장성 높은 아키텍처 설계 강점',
      techStack: ['Vue.js', 'Python', 'FastAPI', 'AWS Lambda', 'DynamoDB'],
      estimatedBudget: '4,000~7,000만원',
      estimatedDuration: '14~20주',
      fitScore: 62,
      fitReasons: ['클라우드 인프라 강점', '확장성 설계 전문'],
      concerns: ['예산 높음', '스타트업 MVP보다 기업 시스템 선호'],
      portfolioKeywords: ['SaaS 플랫폼', 'B2B 포털', '데이터 파이프라인'],
      contactHint: 'hello@cloudbridge.io 형식 추정',
      status: 'candidate',
    },
  ]
}

function buildMockColdMail(vendor: VendorCandidate, projectOneLiner: string): string {
  return `안녕하세요, ${vendor.name} 팀 담당자님,

저는 [회사명/프로젝트명]을 운영하고 있는 대표입니다.
현재 "${projectOneLiner}" 관련 앱/서비스 개발 외주를 검토 중이며,
${vendor.name}의 ${vendor.techStack.slice(0, 2).join(', ')} 기반 개발 역량과 MVP 납품 경험에 관심을 갖게 되어 연락드립니다.

📌 프로젝트 개요
- 개발 범위: ${projectOneLiner}
- 예상 일정: ${vendor.estimatedDuration}
- 예산 범위: ${vendor.estimatedBudget}

아래와 같은 사항들을 함께 논의하고 싶습니다.
1. 유사 프로젝트 포트폴리오 공유
2. 기술 스택 및 팀 구성 소개
3. 일정 및 견적 협의

바쁘신 중에 부담 없이 간단한 미팅(30분)을 요청드려도 될까요?
편하신 시간대를 알려주시면 일정을 맞추겠습니다.

감사합니다.
[대표자명] 드림`
}

// ─── 후보사 카드 ───────────────────────────────────────────────────────────────
function CandidateCard({
  vendor,
  onGenerateMail,
  onStatusChange,
  onCopyMail,
  isGeneratingMail,
}: {
  vendor: VendorCandidate
  onGenerateMail: (id: string) => void
  onStatusChange: (id: string, status: VendorCandidate['status']) => void
  onCopyMail: (text: string) => void
  isGeneratingMail: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [mailExpanded, setMailExpanded] = useState(false)
  const sc = statusConfig[vendor.status]

  const fitColor = vendor.fitScore >= 85
    ? 'text-green-700 bg-green-50 border-green-200'
    : vendor.fitScore >= 70
    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-slate-600 bg-slate-50 border-slate-200'

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${vendor.status === 'rejected' ? 'opacity-50' : ''}`}>
      <div className="p-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{vendor.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${fitColor}`}>
                  적합도 {vendor.fitScore}%
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.color}`}>
                  {sc.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{vendor.description}</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 기본 정보 행 */}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-green-500" />
            {vendor.estimatedBudget}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-500" />
            {vendor.estimatedDuration}
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <Code2 className="w-3 h-3 text-purple-400" />
            {vendor.techStack.slice(0, 4).map(t => (
              <span key={t} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">{t}</span>
            ))}
          </div>
        </div>

        {/* 상세 정보 (확장 시) */}
        {expanded && (
          <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
            {/* 적합 이유 */}
            <div>
              <p className="text-xs font-semibold text-green-700 mb-1.5">✅ 선정 이유</p>
              <ul className="space-y-1">
                {vendor.fitReasons.map((r, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            {/* 우려사항 */}
            {vendor.concerns.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1.5">⚠️ 우려사항</p>
                <ul className="space-y-1">
                  {vendor.concerns.map((c, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* 포트폴리오 키워드 */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">🗂 포트폴리오 키워드</p>
              <div className="flex flex-wrap gap-1">
                {vendor.portfolioKeywords.map(k => (
                  <span key={k} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                    {k}
                  </span>
                ))}
              </div>
            </div>
            {/* 연락처 힌트 */}
            <div className="bg-slate-50 rounded-xl p-2.5">
              <p className="text-xs text-slate-500">
                <Mail className="w-3 h-3 inline mr-1 text-slate-400" />
                연락처 힌트: <span className="font-mono text-slate-700">{vendor.contactHint}</span>
              </p>
            </div>

            {/* 콜드메일 */}
            {vendor.coldMailDraft && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 mb-2"
                  onClick={() => setMailExpanded(!mailExpanded)}
                >
                  <Mail className="w-3.5 h-3.5" />
                  콜드메일 초안
                  {mailExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {mailExpanded && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {vendor.coldMailDraft}
                    </pre>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 px-2.5 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={() => onCopyMail(vendor.coldMailDraft!)}
                      >
                        <Copy className="w-3 h-3" />복사
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="h-7 px-2.5 text-xs gap-1 border-slate-200 text-slate-600"
                        onClick={() => onGenerateMail(vendor.id)}
                        disabled={isGeneratingMail === vendor.id}
                      >
                        <RotateCcw className="w-3 h-3" />재생성
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼 행 */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          {!vendor.coldMailDraft && vendor.status !== 'rejected' && (
            <Button
              size="sm"
              className="h-7 px-3 text-xs gap-1.5 bg-purple-600 hover:bg-purple-500"
              onClick={() => onGenerateMail(vendor.id)}
              disabled={isGeneratingMail === vendor.id}
            >
              {isGeneratingMail === vendor.id
                ? <><RefreshCw className="w-3 h-3 animate-spin" />생성 중...</>
                : <><Sparkles className="w-3 h-3" />콜드메일 초안 생성</>
              }
            </Button>
          )}
          {vendor.coldMailDraft && (
            <Button
              size="sm" variant="outline"
              className="h-7 px-3 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                setExpanded(true)
                setMailExpanded(true)
              }}
            >
              <Mail className="w-3 h-3" />메일 보기
            </Button>
          )}
          {vendor.status === 'candidate' && vendor.coldMailDraft && (
            <Button
              size="sm" variant="outline"
              className="h-7 px-3 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => onStatusChange(vendor.id, 'contacted')}
            >
              <Send className="w-3 h-3" />발송 완료로 표시
            </Button>
          )}
          {vendor.status === 'contacted' && (
            <Button
              size="sm" variant="outline"
              className="h-7 px-3 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => onStatusChange(vendor.id, 'replied')}
            >
              <CheckCircle2 className="w-3 h-3" />답장 받음
            </Button>
          )}
          {vendor.status === 'replied' && (
            <Button
              size="sm" variant="outline"
              className="h-7 px-3 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => onStatusChange(vendor.id, 'meeting')}
            >
              <Users className="w-3 h-3" />미팅 확정
            </Button>
          )}
          {vendor.status !== 'rejected' && (
            <Button
              size="sm" variant="ghost"
              className="h-7 px-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 ml-auto"
              onClick={() => onStatusChange(vendor.id, 'rejected')}
            >
              제외
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
function VendorSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromNew = searchParams.get('from') === 'new'

  const [phase, setPhase] = useState<SearchPhase>('input')
  const [isSearching, setIsSearching] = useState(false)
  const [isGeneratingMail, setIsGeneratingMail] = useState<string | null>(null)

  // 검색 조건
  const [projectOneLiner, setProjectOneLiner] = useState(searchParams.get('summary') || '')
  const [techPreference, setTechPreference] = useState('')
  const [budgetRange, setBudgetRange] = useState('')
  const [duration, setDuration] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // 결과
  const [candidates, setCandidates] = useState<VendorCandidate[]>([])

  // 검색 실행
  const runSearch = useCallback(async () => {
    if (!projectOneLiner.trim()) {
      toast.error('프로젝트 한 줄 설명을 입력해주세요')
      return
    }
    setIsSearching(true)
    setPhase('searching')

    // 실제 AI API 연동 시 여기서 fetch 호출
    // 현재는 2초 딜레이 후 mock 데이터
    await new Promise(r => setTimeout(r, 2000))

    const mockCandidates = buildMockCandidates(projectOneLiner)
    setCandidates(mockCandidates)
    setPhase('candidates')
    setIsSearching(false)
    toast.success(`${mockCandidates.length}개 외주사 후보를 찾았습니다`)
  }, [projectOneLiner])

  // 콜드메일 초안 생성
  const generateColdMail = useCallback(async (vendorId: string) => {
    setIsGeneratingMail(vendorId)
    await new Promise(r => setTimeout(r, 1500))
    const vendor = candidates.find(c => c.id === vendorId)
    if (!vendor) { setIsGeneratingMail(null); return }

    const draft = buildMockColdMail(vendor, projectOneLiner)
    setCandidates(prev => prev.map(c =>
      c.id === vendorId ? { ...c, coldMailDraft: draft } : c
    ))
    setIsGeneratingMail(null)
    toast.success('콜드메일 초안이 생성되었습니다')
  }, [candidates, projectOneLiner])

  const updateStatus = useCallback((vendorId: string, status: VendorCandidate['status']) => {
    setCandidates(prev => prev.map(c =>
      c.id === vendorId ? { ...c, status } : c
    ))
    const label = statusConfig[status].label
    toast.success(`${label}으로 상태 변경`)
  }, [])

  const copyMail = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('메일 초안이 클립보드에 복사되었습니다')
  }, [])

  const activeCount = candidates.filter(c => c.status !== 'rejected').length
  const contactedCount = candidates.filter(c => ['contacted', 'replied', 'meeting'].includes(c.status)).length

  // ── 입력 단계 ────────────────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* 헤더 */}
          <div className="mb-8">
            {fromNew && (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> 온보딩으로 돌아가기
              </button>
            )}
            <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-2xl p-6 text-white mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">외주사 서치 AI 에이전트</h1>
                  <p className="text-purple-200 text-sm">요구사항 기반 외주 개발사 매칭</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-purple-100">
                {[
                  '요구사항 기반 후보 검색',
                  '기술 스택 & 예산 적합도 평가',
                  '콜드메일 초안 자동 생성',
                  '대표 승인 후 발송',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-purple-300 flex-shrink-0" />
                    <span className="text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 입력 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                프로젝트 정보 입력
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  프로젝트 한 줄 설명 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="예: 음식 배달 앱 — 주문부터 배달 추적까지 원스톱 서비스"
                  value={projectOneLiner}
                  onChange={e => setProjectOneLiner(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    선호 기술 스택
                  </label>
                  <Input
                    placeholder="예: React, Flutter, 무관"
                    value={techPreference}
                    onChange={e => setTechPreference(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    예산 범위
                  </label>
                  <Input
                    placeholder="예: 3,000~5,000만원"
                    value={budgetRange}
                    onChange={e => setBudgetRange(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  개발 기간
                </label>
                <Input
                  placeholder="예: 3개월 이내, 6개월"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  추가 요구사항
                </label>
                <Textarea
                  placeholder="예: 스타트업 경험 있는 팀 선호, 디자인 포함, 한국어 소통 가능한 팀"
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  현재 AI 에이전트는 데모 모드로 동작합니다. 실제 외주사 DB 연동 및 이메일 발송은
                  준비 중입니다. 콜드메일 초안은 직접 복사하여 사용하세요.
                </p>
              </div>

              <Button
                onClick={runSearch}
                className="w-full gap-2 bg-purple-700 hover:bg-purple-600 h-11 text-base"
              >
                <Sparkles className="w-5 h-5" />
                AI 외주사 검색 시작
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── 검색 중 ──────────────────────────────────────────────────────────────
  if (phase === 'searching') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-purple-600 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">외주사 후보 검색 중...</h2>
          <p className="text-sm text-slate-500 mb-4">
            요구사항을 분석하고 적합한 외주 개발사를 찾고 있습니다
          </p>
          <div className="space-y-2 text-xs text-slate-400 text-left bg-white rounded-xl p-4 border border-slate-200">
            {[
              '✅ 요구사항 분석 완료',
              '✅ 기술 스택 매칭 중...',
              '⏳ 예산 적합도 평가 중...',
              '⏳ 포트폴리오 키워드 분석 중...',
            ].map((step, i) => (
              <div key={i} className={i <= 1 ? 'text-green-600' : 'text-slate-400'}>{step}</div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── 후보 목록 ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setPhase('input')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> 조건 수정
            </button>
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={runSearch}
              disabled={isSearching}
            >
              <RefreshCw className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`} />
              재검색
            </Button>
          </div>

          <h1 className="text-xl font-bold text-slate-900">외주사 후보 {candidates.length}건</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            &ldquo;{projectOneLiner}&rdquo; 기반 검색 결과
          </p>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{activeCount}</p>
            <p className="text-xs text-slate-500">활성 후보</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{contactedCount}</p>
            <p className="text-xs text-blue-600">연락 완료</p>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-3 text-center">
            <p className="text-xl font-bold text-purple-700">
              {candidates.filter(c => c.coldMailDraft).length}
            </p>
            <p className="text-xs text-purple-600">메일 초안</p>
          </div>
        </div>

        {/* 일괄 메일 생성 */}
        {candidates.filter(c => !c.coldMailDraft && c.status !== 'rejected').length > 0 && (
          <div className="mb-4">
            <Button
              size="sm"
              className="w-full gap-2 bg-purple-700 hover:bg-purple-600 h-9 text-sm"
              onClick={async () => {
                const targets = candidates.filter(c => !c.coldMailDraft && c.status !== 'rejected')
                for (const v of targets) {
                  await generateColdMail(v.id)
                }
              }}
              disabled={isGeneratingMail !== null}
            >
              <Sparkles className="w-4 h-4" />
              전체 후보 콜드메일 초안 일괄 생성 ({candidates.filter(c => !c.coldMailDraft && c.status !== 'rejected').length}건)
            </Button>
          </div>
        )}

        {/* 후보 카드 */}
        <div className="space-y-3">
          {candidates
            .sort((a, b) => b.fitScore - a.fitScore)
            .map(vendor => (
              <CandidateCard
                key={vendor.id}
                vendor={vendor}
                onGenerateMail={generateColdMail}
                onStatusChange={updateStatus}
                onCopyMail={copyMail}
                isGeneratingMail={isGeneratingMail}
              />
            ))}
        </div>

        {/* 안내 */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500 space-y-1">
              <p>• 현재 데모 모드: 실제 외주사 DB 검색 및 이메일 자동 발송 기능은 준비 중입니다</p>
              <p>• 콜드메일 초안을 복사하여 직접 발송하세요. 대량 자동 발송은 지원하지 않습니다</p>
              <p>• 상태를 업데이트하면 이후 미팅 일정 관리 기능과 연동될 예정입니다</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VendorSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Search className="w-10 h-10 text-purple-400 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-slate-400">로딩 중...</p>
        </div>
      </div>
    }>
      <VendorSearchContent />
    </Suspense>
  )
}
