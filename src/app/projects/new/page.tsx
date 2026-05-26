'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Zap, Sparkles, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Package, Plus,
  LayoutTemplate, FileText, Users, Search, Building2, Info,
  GripVertical, BarChart3, Lightbulb
} from 'lucide-react'

// ─── 타입 ──────────────────────────────────────────────────────────────────────
interface AnalyzedFeature {
  order_key: string
  name: string
  priority_group: string
  category: string
  description: string
  expected_effect: string
  priority_reason: string
  risk_note: string | null
  selected?: boolean
}

interface AnalysisResult {
  summary: string
  core_value: string
  features: AnalyzedFeature[]
  risks: string[]
  founder_checks: string[]
  priority_guide: string
  isFallback: boolean
}

// ─── 스텝 인디케이터 ─────────────────────────────────────────────────────────────
function StepIndicator({ step, vendorDecided }: { step: number; vendorDecided: boolean | null }) {
  const steps = vendorDecided === false
    ? ['외주사 선택', '요구사항 입력', 'AI 분석', '외주사 서치']
    : ['외주사 선택', '기본 정보', '요구사항 입력', 'AI 분석', '시작 방식']
  return (
    <div className="flex items-center gap-0 mb-8 flex-wrap gap-y-2">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            i + 1 === step ? 'bg-blue-600 text-white' :
            i + 1 < step ? 'bg-green-100 text-green-700' :
            'bg-slate-100 text-slate-400'
          }`}>
            {i + 1 < step ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
            {label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-6 h-0.5 ${i + 1 < step ? 'bg-green-300' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── 우선순위 배지 ──────────────────────────────────────────────────────────────
function PriorityBadge({ group }: { group: string }) {
  const colors: Record<string, string> = {
    P0: 'bg-red-100 text-red-700 border-red-200',
    P1: 'bg-orange-100 text-orange-700 border-orange-200',
    P2: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    P3: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${colors[group] || 'bg-gray-100 text-gray-600'}`}>
      {group}
    </span>
  )
}

// ─── 배달앱 예시 ──────────────────────────────────────────────────────────────
const DELIVERY_APP_EXAMPLE = {
  one_line: '음식 배달 앱 — 주문부터 배달 추적까지 원스톱으로',
  must_have: `회원가입 / 소셜 로그인 (카카오, 네이버)
주소 설정 (현재 위치 / 검색)
음식점 목록 & 필터 (카테고리, 거리, 별점)
메뉴 상세 및 장바구니
주문 및 결제 (카드, 카카오페이, 토스)
주문 상태 실시간 추적
리뷰 & 평점 등록
사장님 관리 페이지 (메뉴/영업시간 관리)
배달 상태 알림 (푸시)`,
  core_problem: '지금은 전화 주문과 직접 배달로 운영 중. 주문 처리/배달 관리 자동화로 하루 운영 시간을 3시간 단축하고 싶음.',
  nice_to_have: `쿠폰 & 포인트 시스템
단골 가게 찜하기
재주문 빠른 주문
사장님 정산 리포트
배달 기사 앱 (별도)`,
  priority_basis: '결제 & 주문 흐름이 먼저, 리뷰/쿠폰은 론칭 후 추가',
  references: '배달의민족 초기 버전 수준, 쿠팡이츠 UI 참고',
  constraints: 'React Native (iOS/Android 동시), 3개월 내 MVP 배포 목표',
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0 = 외주사 선택 (Step0)
  const [vendorDecided, setVendorDecided] = useState<boolean | null>(null) // null=미선택, true=확정, false=미정
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [startMode, setStartMode] = useState<'ai' | 'template' | 'empty' | null>(null)
  const [showDiscord, setShowDiscord] = useState(false)
  const [showExample, setShowExample] = useState(false)

  // DnD 우선순위 조정 (step 3)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Step 1: 기본 정보
  const [basicForm, setBasicForm] = useState({
    name: '',
    vendor_name: '',
    vendor_contact_name: '',
    vendor_contact_email: '',
    vendor_contact_discord: '',
    contract_start: '',
    contract_end: '',
    contract_amount: '',
    goal: '',
    description: '',
    brief_send_time: '09:00',
    discord_webhook_url: '',
    discord_webhook_daily: '',
    discord_webhook_mustcheck: '',
  })

  // Step 2: 요구사항
  const [reqForm, setReqForm] = useState({
    one_line: '',
    must_have: '',
    nice_to_have: '',
    priority_basis: '',
    references: '',
    core_problem: '',
    constraints: '',
  })

  const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBasicForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleReqChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setReqForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // 예시 불러오기
  const loadExample = () => {
    setReqForm(prev => ({ ...prev, ...DELIVERY_APP_EXAMPLE }))
    setShowExample(false)
    toast.success('배달앱 예시를 불러왔습니다. 내용을 수정해서 사용하세요.')
  }

  // ─── AI 분석 실행 ─────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setReqTouched(true)
    if (!reqForm.one_line && !reqForm.must_have && !reqForm.core_problem) {
      toast.error('최소 하나 이상 입력해주세요 (서비스 설명, 핵심 기능, 또는 핵심 문제)')
      return
    }
    if (reqForm.one_line.length > ONE_LINE_MAX || reqForm.must_have.length > MUST_HAVE_MAX || reqForm.core_problem.length > CORE_PROBLEM_MAX) {
      toast.error('입력이 너무 깁니다. 글자수 제한을 확인해주세요.')
      return
    }
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/projects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reqForm,
          project_name: basicForm.name || '새 프로젝트',
          project_goal: basicForm.goal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '분석 실패')
      setAnalysisResult({
        ...data,
        features: data.features.map((f: AnalyzedFeature) => ({ ...f, selected: true })),
      })
      if (vendorDecided) {
        setStep(4) // 외주사 확정 → step4 (시작방식)
      } else {
        setStep(3) // 외주사 미정 → step3 (AI 분석 후 서치 안내)
      }
      if (data.isFallback) {
        toast.info('OpenAI API 키가 없어 기본 템플릿으로 분석했습니다.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '분석 실패')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleFeature = (idx: number) => {
    if (!analysisResult) return
    setAnalysisResult(prev => prev ? {
      ...prev,
      features: prev.features.map((f, i) => i === idx ? { ...f, selected: !f.selected } : f)
    } : null)
  }

  // DnD 우선순위 변경 (P0↔P1↔P2)
  const moveFeaturePriority = (idx: number, direction: 'up' | 'down') => {
    if (!analysisResult) return
    const priorityOrder = ['P0', 'P1', 'P2', 'P3']
    const feature = analysisResult.features[idx]
    const currentIdx = priorityOrder.indexOf(feature.priority_group)
    const newIdx = direction === 'up' ? Math.max(0, currentIdx - 1) : Math.min(3, currentIdx + 1)
    const newPriority = priorityOrder[newIdx]
    setAnalysisResult(prev => prev ? {
      ...prev,
      features: prev.features.map((f, i) => i === idx ? { ...f, priority_group: newPriority } : f)
    } : null)
  }

  // ─── 프로젝트 생성 ────────────────────────────────────────────────────────────
  const createProject = async () => {
    if (!startMode) {
      toast.error('시작 방식을 선택해주세요', { description: '위에서 AI 제안 / 템플릿 / 빈 프로젝트 중 하나를 선택해주세요' })
      return
    }
    setIsCreating(true)
    try {
      const selectedFeatures = analysisResult?.features.filter(f => f.selected) || []
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...basicForm,
          contract_amount: basicForm.contract_amount || null,
          seed_data: startMode === 'template',
          ai_features: startMode === 'ai' ? selectedFeatures : [],
          start_mode: startMode,
          ai_analysis: analysisResult ? {
            summary: analysisResult.summary,
            core_value: analysisResult.core_value,
          } : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '프로젝트 생성 실패')
      toast.success('프로젝트가 생성되었습니다!')
      router.push(`/projects/${data.project.id}/onboarding`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setIsCreating(false)
    }
  }

  // Step 1 완료 조건
  const step1Valid = basicForm.name.trim() && basicForm.contract_start && basicForm.contract_end
  // 외주사 미정일 경우 vendor_name 불필요
  const step1VendorRequired = vendorDecided
    ? (step1Valid && basicForm.vendor_name.trim())
    : step1Valid

  const [step1Touched, setStep1Touched] = useState(false)
  // 날짜 순서 검증: 시작일이 종료일보다 이후인 경우
  const dateOrderError = step1Touched && basicForm.contract_start && basicForm.contract_end
    && basicForm.contract_start > basicForm.contract_end

  const step1Errors = {
    name: step1Touched && !basicForm.name.trim(),
    vendor_name: step1Touched && vendorDecided && !basicForm.vendor_name.trim(),
    contract_start: step1Touched && (!basicForm.contract_start || !!dateOrderError),
    contract_end: step1Touched && (!basicForm.contract_end || !!dateOrderError),
  }

  // Step 2 요구사항 글자수 제한
  const ONE_LINE_MAX = 100
  const MUST_HAVE_MAX = 2000
  const CORE_PROBLEM_MAX = 500
  const [reqTouched, setReqTouched] = useState(false)
  const reqErrors = {
    one_line_too_short: reqTouched && reqForm.one_line.trim().length > 0 && reqForm.one_line.trim().length < 5,
    one_line_too_long: reqForm.one_line.length > ONE_LINE_MAX,
    must_have_too_short: reqTouched && reqForm.must_have.trim().length > 0 && reqForm.must_have.trim().length < 20,
    must_have_too_long: reqForm.must_have.length > MUST_HAVE_MAX,
    core_problem_too_long: reqForm.core_problem.length > CORE_PROBLEM_MAX,
  }

  const handleNextFromStep1 = () => {
    if (!step1VendorRequired) { setStep1Touched(true); return }
    setStep(2)
  }

  // ═══════════════════════════════════════════════
  // STEP 0: 외주사 확정 여부 선택
  // ═══════════════════════════════════════════════
  if (step === 0) return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 p-6">
      <div className="max-w-2xl w-full">
        <div className="mb-8 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> 대시보드로
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">새 외주 개발 프로젝트</h1>
          <p className="text-slate-500 text-sm mt-2">AI가 기능 정의서와 우선순위를 자동으로 만들어드립니다</p>
        </div>

        {/* 외주사 선택 분기 */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-700 text-center mb-4">외주사(개발사)가 이미 정해져 있나요?</p>
          <div className="grid grid-cols-2 gap-4">
            {/* 외주사 확정 */}
            <div
              onClick={() => { setVendorDecided(true); setStep(1) }}
              className="rounded-2xl border-2 border-slate-200 bg-white p-6 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">외주사가 있어요</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                이미 계약한 개발사가 있습니다.<br />
                프로젝트를 바로 설정하고 관리를 시작합니다.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                  바로 시작 <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* 외주사 미정 */}
            <div
              onClick={() => { setVendorDecided(false); setStep(1) }}
              className="rounded-2xl border-2 border-slate-200 bg-white p-6 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">아직 찾는 중이에요</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                외주사를 아직 구하지 못했습니다.<br />
                요구사항 분석 후 AI가 외주사 찾기를 도와드립니다.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">
                  AI 에이전트 <Sparkles className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">나중에 언제든 변경 가능합니다</p>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // STEP 1: 기본 정보 (외주사 확정 여부에 따라 UI 분기)
  // ═══════════════════════════════════════════════
  if (step === 1) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep(0)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>
          <h1 className="text-2xl font-bold text-slate-900">기본 정보 입력</h1>
          <p className="text-slate-500 text-sm mt-1">
            {vendorDecided ? '프로젝트와 외주사 정보를 입력해주세요' : '프로젝트 기본 정보를 입력해주세요 (외주사 정보는 나중에 입력 가능)'}
          </p>
        </div>
        <StepIndicator step={1} vendorDecided={vendorDecided} />

        {/* 외주사 미정 안내 */}
        {!vendorDecided && (
          <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-900">외주사 미정 모드</p>
              <p className="text-xs text-purple-700 mt-0.5">
                요구사항을 먼저 분석하고, 이후 AI 에이전트가 적합한 외주사를 찾아드립니다.
                외주사 정보는 매칭 후 입력하거나 설정에서 언제든 추가할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* 미입력 필드 안내 배너 */}
        {step1Touched && !step1VendorRequired && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <span className="font-semibold">필수 항목을 모두 입력해주세요:</span>
              <ul className="mt-1 text-xs space-y-0.5">
                {step1Errors.name && <li>• 프로젝트명이 비어있습니다</li>}
                {step1Errors.vendor_name && <li>• 외주사명이 비어있습니다</li>}
                {step1Errors.contract_start && !dateOrderError && <li>• {vendorDecided ? '계약 시작일' : '개발 시작 예정일'}이 선택되지 않았습니다</li>}
                {step1Errors.contract_end && !dateOrderError && <li>• {vendorDecided ? '계약 종료일' : '목표 완료일'}이 선택되지 않았습니다</li>}
                {dateOrderError && <li>• 시작일이 종료일보다 늦습니다. 날짜를 확인해주세요</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* 프로젝트 기본 정보 */}
          <Card className={step1Touched && step1Errors.name ? 'border-red-200' : ''}>
            <CardHeader><CardTitle className="text-base">프로젝트 기본 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className={`grid gap-4 ${vendorDecided ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="space-y-2">
                  <Label>프로젝트명 <span className="text-red-500">*</span></Label>
                  <Input
                    name="name"
                    value={basicForm.name}
                    onChange={handleBasicChange}
                    placeholder="예: 배달앱 MVP, 쇼핑몰 리뉴얼"
                    className={step1Errors.name ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''}
                  />
                  {step1Errors.name && <p className="text-xs text-red-500">프로젝트명을 입력해주세요</p>}
                </div>
                {vendorDecided && (
                  <div className="space-y-2">
                    <Label>외주사명 <span className="text-red-500">*</span></Label>
                    <Input
                      name="vendor_name"
                      value={basicForm.vendor_name}
                      onChange={handleBasicChange}
                      placeholder="(주)개발컴퍼니"
                      className={step1Errors.vendor_name ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''}
                    />
                    {step1Errors.vendor_name && <p className="text-xs text-red-500">외주사명을 입력해주세요</p>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>프로젝트 목표 <span className="text-slate-400 text-xs">(선택)</span></Label>
                <Textarea name="goal" value={basicForm.goal} onChange={handleBasicChange} placeholder="예: 3개월 안에 MVP 배포, 월 1000명 유입" rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* 계약/일정 정보 — vendorDecided 여부에 따라 워딩 분기 */}
          <Card className={step1Touched && (step1Errors.contract_start || step1Errors.contract_end) ? 'border-red-200' : ''}>
            <CardHeader>
              <CardTitle className="text-base">
                {vendorDecided ? '계약 기간 및 예산' : '개발 일정 및 예산'}
              </CardTitle>
              {!vendorDecided && (
                <p className="text-xs text-slate-500 mt-0.5">
                  외주사 계약 후 실제 일정이 확정되면 수정할 수 있습니다
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {vendorDecided ? '계약 시작일' : '개발 시작 예정일'}
                    <span className="text-red-500"> *</span>
                  </Label>
                  <Input type="date" name="contract_start" value={basicForm.contract_start} onChange={handleBasicChange}
                    className={step1Errors.contract_start ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''} />
                  {step1Errors.contract_start && !dateOrderError && (
                    <p className="text-xs text-red-500">날짜를 선택해주세요</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    {vendorDecided ? '계약 종료일' : '목표 완료일'}
                    <span className="text-red-500"> *</span>
                  </Label>
                  <Input type="date" name="contract_end" value={basicForm.contract_end} onChange={handleBasicChange}
                    className={step1Errors.contract_end ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''} />
                  {step1Errors.contract_end && !dateOrderError && (
                    <p className="text-xs text-red-500">날짜를 선택해주세요</p>
                  )}
                </div>
              </div>
              {dateOrderError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  시작일이 종료일보다 늦습니다. 날짜를 다시 확인해주세요.
                </div>
              )}
              <div className="space-y-2">
                <Label>
                  {vendorDecided ? '예상 계약 금액' : '예상 개발 예산'}
                  <span className="text-slate-400 text-xs ml-1">(원, 선택)</span>
                </Label>
                <Input type="number" name="contract_amount" value={basicForm.contract_amount} onChange={handleBasicChange}
                  placeholder={vendorDecided ? '예: 50000000 (5,000만 원)' : '예: 30000000 (3,000만 원) — 대략적인 금액도 괜찮아요'} />
                {!vendorDecided && (
                  <p className="text-xs text-slate-400">정확하지 않아도 됩니다. 외주사 견적 후 수정 가능합니다.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 외주사 담당자 (외주사 확정 시만 표시) */}
          {vendorDecided && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">외주사 담당자 정보</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">나중에 설정에서도 입력할 수 있습니다</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>담당자명</Label>
                    <Input name="vendor_contact_name" value={basicForm.vendor_contact_name} onChange={handleBasicChange} placeholder="홍길동" />
                  </div>
                  <div className="space-y-2">
                    <Label>이메일</Label>
                    <Input type="email" name="vendor_contact_email" value={basicForm.vendor_contact_email} placeholder="dev@company.com" onChange={handleBasicChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Discord 핸들</Label>
                    <Input name="vendor_contact_discord" value={basicForm.vendor_contact_discord} onChange={handleBasicChange} placeholder="username#1234" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discord (접기) */}
          <Card>
            <CardContent className="pt-4">
              <button type="button" onClick={() => setShowDiscord(v => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                {showDiscord ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Discord 알림 연동 (선택 — 나중에 설정 가능)
              </button>
              {showDiscord && (
                <div className="mt-4 space-y-4">
                  {/* 채널 구조 안내 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    <p className="font-semibold mb-1">💡 2개 채널로 분리하는 것을 권장합니다</p>
                    <p>• <strong>📊 일일보고</strong> — AI 요약이 오전 9시에 자동 전송. 흘려봐도 됩니다.</p>
                    <p>• <strong>🔴 Must-Check</strong> — 질문·변경요청 등 협의 필요 항목이 즉시 @here 알림.</p>
                  </div>

                  {/* 📊 일일보고 채널 */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">📊 일일보고 채널 Webhook URL</Label>
                    <Input
                      name="discord_webhook_daily"
                      value={basicForm.discord_webhook_daily}
                      onChange={handleBasicChange}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-slate-400">Founder Daily Brief + AI 리스크 요약 (오전 9시)</p>
                  </div>

                  {/* 🔴 Must-Check 채널 */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">🔴 Must-Check 채널 Webhook URL</Label>
                    <Input
                      name="discord_webhook_mustcheck"
                      value={basicForm.discord_webhook_mustcheck}
                      onChange={handleBasicChange}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-slate-400">외주사 질문·변경요청·완료신청 즉시 @here 알림</p>
                  </div>

                  {/* Daily Brief 시간 */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Daily Brief 발송 시간</Label>
                    <Input
                      type="time"
                      name="brief_send_time"
                      value={basicForm.brief_send_time}
                      onChange={handleBasicChange}
                    />
                  </div>

                  {/* 구버전 단일 웹훅 폴백 */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-400 hover:text-slate-500">
                      단일 채널만 사용 (위 2채널 미설정 시 폴백)
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      <Input
                        name="discord_webhook_url"
                        value={basicForm.discord_webhook_url}
                        onChange={handleBasicChange}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="font-mono text-xs"
                      />
                      <p className="text-slate-400">위 채널 URL이 비어있을 때만 동작합니다.</p>
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
              <ArrowLeft className="w-4 h-4" /> 이전
            </button>
            <Button onClick={handleNextFromStep1} className="gap-2 bg-blue-600 hover:bg-blue-500">
              다음: 요구사항 입력 <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // STEP 2: 요구사항 입력 (개선)
  // ═══════════════════════════════════════════════
  if (step === 2) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">요구사항 입력</h1>
              <p className="text-slate-500 text-sm mt-1">AI가 기능 목록과 P0/P1/P2 우선순위를 자동으로 제안합니다</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowExample(true)} className="gap-1.5 text-xs">
              <Lightbulb className="w-3.5 h-3.5" />
              배달앱 예시 보기
            </Button>
          </div>
        </div>
        <StepIndicator step={2} vendorDecided={vendorDecided} />

        {/* 예시 모달 */}
        {showExample && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              <h3 className="font-bold text-slate-900 mb-1">배달앱 MVP 예시</h3>
              <p className="text-xs text-slate-500 mb-4">아래 예시를 불러와서 수정해서 사용하세요</p>
              <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-700 space-y-2 max-h-64 overflow-y-auto">
                <p><strong>서비스:</strong> {DELIVERY_APP_EXAMPLE.one_line}</p>
                <p><strong>핵심 기능:</strong></p>
                <pre className="whitespace-pre-wrap text-xs">{DELIVERY_APP_EXAMPLE.must_have}</pre>
                <p><strong>해결 문제:</strong> {DELIVERY_APP_EXAMPLE.core_problem}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={loadExample} className="flex-1 bg-blue-600 hover:bg-blue-500 text-sm">예시 불러오기</Button>
                <Button variant="outline" onClick={() => setShowExample(false)} className="flex-1 text-sm">취소</Button>
              </div>
            </div>
          </div>
        )}

        {/* 안내 배너 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">메모 수준으로도 충분해요</p>
            <p className="text-xs text-blue-700 mt-0.5">
              완벽한 문장이 아니어도 됩니다. 생각나는 기능을 줄바꿈으로 하나씩 적어주세요.
              AI가 P0/P1/P2로 분류하고 기능정의서 초안을 만들어드립니다.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 필수 */}
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">필수</span>
                서비스 & 기능 목록
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>만들고 싶은 서비스/제품 한 줄 설명</Label>
                  <span className={`text-xs ${reqForm.one_line.length > ONE_LINE_MAX ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                    {reqForm.one_line.length}/{ONE_LINE_MAX}
                  </span>
                </div>
                <Input
                  name="one_line"
                  value={reqForm.one_line}
                  onChange={handleReqChange}
                  placeholder="예: 음식 배달 앱 / 소상공인 재고관리 SaaS / 독립서점 큐레이션 앱"
                  maxLength={ONE_LINE_MAX + 20}
                  className={reqErrors.one_line_too_long ? 'border-red-400 bg-red-50' : ''}
                />
                {reqErrors.one_line_too_short && (
                  <p className="text-xs text-amber-600">조금 더 구체적으로 적어주세요 (5자 이상)</p>
                )}
                {reqErrors.one_line_too_long && (
                  <p className="text-xs text-red-500">한 줄로 간결하게 줄여주세요 ({ONE_LINE_MAX}자 이내)</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    이번 개발에 필요한 전체 기능 목록
                    <span className="text-slate-400 text-xs ml-2">줄바꿈으로 구분 · 러프하게 적어도 OK</span>
                  </Label>
                  <span className={`text-xs flex-shrink-0 ml-2 ${reqForm.must_have.length > MUST_HAVE_MAX ? 'text-red-500 font-semibold' : reqForm.must_have.length > MUST_HAVE_MAX * 0.8 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {reqForm.must_have.length}/{MUST_HAVE_MAX}
                  </span>
                </div>
                <Textarea
                  name="must_have"
                  value={reqForm.must_have}
                  onChange={handleReqChange}
                  placeholder={"예:\n회원가입/소셜 로그인\n주소 설정 (현재 위치/검색)\n음식점 목록 & 필터\n장바구니 & 주문\n결제 (카드, 카카오페이)\n주문 상태 실시간 추적\n리뷰 & 평점\n사장님 관리 페이지\n배달 알림 (푸시)"}
                  rows={8}
                  maxLength={MUST_HAVE_MAX + 100}
                  className={reqErrors.must_have_too_long ? 'border-red-400 bg-red-50' : ''}
                />
                {reqErrors.must_have_too_short && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    너무 짧습니다. 원하는 기능을 하나씩 줄바꿈으로 적어주세요 (20자 이상)
                  </p>
                )}
                {reqErrors.must_have_too_long ? (
                  <p className="text-xs text-red-500">너무 깁니다. 핵심 기능 위주로 줄여주세요 ({MUST_HAVE_MAX}자 이내)</p>
                ) : (
                  <p className="text-xs text-slate-400">→ AI가 P0(MVP 필수) / P1(중요) / P2(여유시 추가)로 자동 분류합니다</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>지금 가장 해결하고 싶은 문제</Label>
                  <span className={`text-xs ${reqForm.core_problem.length > CORE_PROBLEM_MAX ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                    {reqForm.core_problem.length}/{CORE_PROBLEM_MAX}
                  </span>
                </div>
                <Textarea
                  name="core_problem"
                  value={reqForm.core_problem}
                  onChange={handleReqChange}
                  placeholder="예: 전화 주문과 수동 배달로 운영 중. 주문 처리 자동화로 하루 3시간 단축하고 싶음."
                  rows={3}
                  maxLength={CORE_PROBLEM_MAX + 50}
                  className={reqErrors.core_problem_too_long ? 'border-red-400 bg-red-50' : ''}
                />
                {reqErrors.core_problem_too_long && (
                  <p className="text-xs text-red-500">핵심 문제를 간결하게 요약해주세요 ({CORE_PROBLEM_MAX}자 이내)</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 보조 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-700">
                추가 정보 <span className="text-slate-400 text-xs font-normal ml-1">(선택 — 입력할수록 AI 제안이 정확해집니다)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  있으면 좋은 기능
                  <span className="text-slate-400 text-xs ml-2">이번 범위에 포함되지 않을 수 있지만 향후 추가 가능</span>
                </Label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-2">
                  <p className="text-xs text-amber-700">
                    ⚠️ 이 항목은 <strong>이번 개발 범위에서 제외될 수 있습니다.</strong><br />
                    그러나 많이 적어둘수록 이후 외주 확장 협의에 유리합니다.
                  </p>
                </div>
                <Textarea name="nice_to_have" value={reqForm.nice_to_have} onChange={handleReqChange}
                  placeholder={"예:\n쿠폰 & 포인트 시스템\n단골 가게 찜하기\n사장님 정산 리포트\n배달 기사 앱 (별도)"} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>우선순위 기준</Label>
                  <Textarea name="priority_basis" value={reqForm.priority_basis} onChange={handleReqChange}
                    placeholder={"예:\n매출 영향 최우선\nMVP 출시 일정 우선\n운영 자동화 먼저"} rows={3} />
                  <p className="text-xs text-slate-400">AI가 이 기준으로 P0/P1/P2를 분류합니다</p>
                </div>
                <div className="space-y-2">
                  <Label>참고 서비스 / 제약 조건</Label>
                  <Textarea name="constraints" value={reqForm.constraints} onChange={handleReqChange}
                    placeholder={"예:\nReact Native 필수\n3개월 MVP 배포 목표\n배달의민족 초기 수준"} rows={3} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 이전
            </Button>
            <Button onClick={runAnalysis} disabled={isAnalyzing}
              className="gap-2 bg-blue-600 hover:bg-blue-500 px-6">
              <Zap className="w-4 h-4" />
              {isAnalyzing ? 'AI 분석 중...' : 'AI가 기능 목록 분석하기'}
            </Button>
          </div>

          <div className="text-center pt-1">
            <button onClick={() => setStep(vendorDecided ? 4 : 3)} className="text-xs text-slate-400 hover:text-slate-600 underline">
              분석 건너뛰고 직접 시작하기 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // STEP 3 (외주사 미정): 외주사 서치 AI 에이전트
  // ═══════════════════════════════════════════════
  if (step === 3 && !vendorDecided) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>
          <h1 className="text-2xl font-bold text-slate-900">AI 분석 완료 🎉</h1>
          <p className="text-slate-500 text-sm mt-1">이제 적합한 외주사를 찾아드릴게요</p>
        </div>
        <StepIndicator step={3} vendorDecided={vendorDecided} />

        {/* 분석 결과 미리보기 */}
        {analysisResult && (
          <Card className="mb-5 bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">{analysisResult.core_value}</p>
                  <p className="text-sm text-blue-800">{analysisResult.summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {['P0', 'P1', 'P2'].map(p => {
                      const cnt = analysisResult.features.filter(f => f.priority_group === p).length
                      return cnt > 0 ? <PriorityBadge key={p} group={p} /> : null
                    })}
                    <span className="text-xs text-blue-600">총 {analysisResult.features.length}개 기능 제안</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 외주사 서치 에이전트 CTA */}
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-2xl p-6 text-white mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">외주사 서치 AI 에이전트</h3>
              <p className="text-purple-200 text-sm mb-4">
                요구사항을 분석해 적합한 외주 개발사를 찾고,<br />
                콜드메일 초안까지 자동으로 만들어드립니다.
              </p>
              <div className="space-y-2 text-sm text-purple-100 mb-5">
                {[
                  '요구사항 기반 외주사 후보 검색',
                  '기술 스택 & 예산 적합도 평가',
                  '콜드메일 초안 자동 생성',
                  '대표 승인 후 발송 (자동 대량 발송 없음)',
                  '응답 업체 관리 & 미팅 조율',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Button
                className="bg-white text-purple-900 hover:bg-purple-50 font-semibold gap-2"
                onClick={() => {
                  const summary = analysisResult?.core_value || reqForm.one_line || ''
                  router.push(`/vendor-search?from=new&summary=${encodeURIComponent(summary)}`)
                }}
              >
                <Sparkles className="w-4 h-4" />
                외주사 서치 시작하기
              </Button>
            </div>
          </div>
        </div>

        {/* 분석 결과로 먼저 진행하기 */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-sm font-semibold text-slate-700 mb-1">또는, 외주사 없이 먼저 프로젝트 만들기</p>
          <p className="text-xs text-slate-500 mb-3">AI 분석 결과로 프로젝트를 생성하고, 외주사는 나중에 연결할 수 있습니다.</p>
          <Button variant="outline" size="sm" onClick={() => { setVendorDecided(null); setStep(4) }} className="gap-2 text-xs">
            <FileText className="w-3.5 h-3.5" />
            AI 분석 결과로 프로젝트 생성 →
          </Button>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // STEP 3 (외주사 확정): AI 분석 결과 + DnD 우선순위
  // ═══════════════════════════════════════════════
  if (step === 3 && vendorDecided && analysisResult) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 요구사항 수정
          </button>
          <h1 className="text-2xl font-bold text-slate-900">AI 분석 결과</h1>
          <p className="text-slate-500 text-sm mt-1">기능을 선택하고, 우선순위를 조정하세요</p>
        </div>
        <StepIndicator step={3} vendorDecided={vendorDecided} />
        {/* (외주사 확정의 step3는 아래 step4 공용 로직으로 fallthrough) */}
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════
  // STEP 4: AI 분석 결과 + 우선순위 조정 + 시작방식
  // ═══════════════════════════════════════════════
  if (step === 4 || (step === 3 && vendorDecided)) {
    const currentStep = vendorDecided ? 4 : 4
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
              <ArrowLeft className="w-4 h-4" /> 이전
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              {analysisResult ? 'AI 분석 결과 & 시작 방식' : '시작 방식 선택'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">기능 우선순위를 조정하고 프로젝트를 생성합니다</p>
          </div>
          <StepIndicator step={currentStep} vendorDecided={vendorDecided} />

          {/* AI 요약 */}
          {analysisResult && (
            <>
              {analysisResult.isFallback && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    OpenAI API 키가 설정되지 않아 기본 템플릿으로 분석했습니다. 내용을 직접 수정하거나 재분석하세요.
                  </p>
                </div>
              )}

              <Card className="mb-5 bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">{analysisResult.core_value}</p>
                      <p className="text-sm text-blue-800">{analysisResult.summary}</p>
                      <p className="text-xs text-blue-600 mt-1 italic">{analysisResult.priority_guide}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 기능 목록 + 우선순위 조정 */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                    제안된 기능 목록 — 클릭으로 포함/제외, ↑↓으로 우선순위 조정
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => setAnalysisResult(prev => prev ? { ...prev, features: prev.features.map(f => ({ ...f, selected: true })) } : null)} className="text-xs text-blue-600 hover:underline">전체 선택</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => setAnalysisResult(prev => prev ? { ...prev, features: prev.features.map(f => ({ ...f, selected: false })) } : null)} className="text-xs text-slate-500 hover:underline">전체 해제</button>
                  </div>
                </div>

                {(['P0', 'P1', 'P2', 'P3'] as const).map(pg => {
                  const groupFeatures = analysisResult.features.filter(f => f.priority_group === pg)
                  if (groupFeatures.length === 0) return null
                  const pgLabels: Record<string, string> = { P0: 'MVP 필수', P1: '중요', P2: '여유시 추가', P3: '미포함 고려' }
                  return (
                    <div key={pg}>
                      <div className="flex items-center gap-2 mb-2">
                        <PriorityBadge group={pg} />
                        <span className="text-xs text-slate-500">{pgLabels[pg]} · {groupFeatures.length}개</span>
                      </div>
                      <div className="space-y-2">
                        {groupFeatures.map((f) => {
                          const idx = analysisResult.features.indexOf(f)
                          const priorityOrder = ['P0', 'P1', 'P2', 'P3']
                          const pIdx = priorityOrder.indexOf(f.priority_group)
                          return (
                            <div key={f.order_key}
                              className={`rounded-lg border p-3 transition-all ${f.selected ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'}`}
                            >
                              <div className="flex items-start gap-3">
                                {/* 선택 체크박스 */}
                                <div
                                  onClick={() => toggleFeature(idx)}
                                  className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer ${f.selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}
                                >
                                  {f.selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                {/* 내용 */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono text-slate-400">{f.order_key}</span>
                                    <span className="text-sm font-medium text-slate-900">{f.name}</span>
                                    <Badge variant="outline" className="text-xs py-0 h-4">{f.category.replace(/_/g, ' ')}</Badge>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-green-700">✓ {f.expected_effect}</span>
                                    <span className="text-xs text-slate-400">· {f.priority_reason}</span>
                                  </div>
                                  {f.risk_note && <p className="text-xs text-amber-700 mt-1">⚠️ {f.risk_note}</p>}
                                </div>
                                {/* 우선순위 이동 버튼 */}
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    onClick={() => moveFeaturePriority(idx, 'up')}
                                    disabled={pIdx === 0}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-400 hover:text-blue-600"
                                    title="우선순위 높이기"
                                  >
                                    <ArrowLeft className="w-3 h-3 rotate-90" />
                                  </button>
                                  <button
                                    onClick={() => moveFeaturePriority(idx, 'down')}
                                    disabled={pIdx === 3}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-400 hover:text-orange-500"
                                    title="우선순위 낮추기"
                                  >
                                    <ArrowLeft className="w-3 h-3 -rotate-90" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 리스크 & 대표 확인 */}
              {(analysisResult.risks.length > 0 || analysisResult.founder_checks.length > 0) && (
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {analysisResult.risks.length > 0 && (
                    <Card className="border-amber-100">
                      <CardHeader className="pb-2"><CardTitle className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 초기 리스크</CardTitle></CardHeader>
                      <CardContent className="pt-0"><ul className="space-y-1">{analysisResult.risks.map((r, i) => <li key={i} className="text-xs text-slate-700">• {r}</li>)}</ul></CardContent>
                    </Card>
                  )}
                  {analysisResult.founder_checks.length > 0 && (
                    <Card className="border-blue-100">
                      <CardHeader className="pb-2"><CardTitle className="text-xs text-blue-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 대표 확인 필요</CardTitle></CardHeader>
                      <CardContent className="pt-0"><ul className="space-y-1">{analysisResult.founder_checks.map((r, i) => <li key={i} className="text-xs text-slate-700">• {r}</li>)}</ul></CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}

          {/* 시작 방식 선택 */}
          <div className="grid gap-3 mb-6">
            <h3 className="text-sm font-semibold text-slate-700">프로젝트 시작 방식</h3>

            {analysisResult && (
              <div onClick={() => setStartMode('ai')}
                className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${startMode === 'ai' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${startMode === 'ai' ? 'bg-blue-600' : 'bg-blue-100'}`}>
                    <Zap className={`w-4 h-4 ${startMode === 'ai' ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">AI 제안 기능으로 시작</span>
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">추천</Badge>
                    </div>
                    <p className="text-xs text-slate-500">선택한 {analysisResult.features.filter(f => f.selected).length}개 기능으로 프로젝트를 생성합니다</p>
                  </div>
                  {startMode === 'ai' && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                </div>
              </div>
            )}

            <div onClick={() => setStartMode('template')}
              className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${startMode === 'template' ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${startMode === 'template' ? 'bg-purple-600' : 'bg-purple-100'}`}>
                  <LayoutTemplate className={`w-4 h-4 ${startMode === 'template' ? 'text-white' : 'text-purple-600'}`} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-slate-900 text-sm">배달앱 예시 템플릿으로 시작</span>
                  <p className="text-xs text-slate-500">배달앱 기능 14개(P0 7개, P1 7개)를 참고용으로 불러옵니다</p>
                </div>
                {startMode === 'template' && <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />}
              </div>
            </div>

            <div onClick={() => setStartMode('empty')}
              className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${startMode === 'empty' ? 'border-slate-600 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${startMode === 'empty' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Plus className={`w-4 h-4 ${startMode === 'empty' ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-slate-900 text-sm">빈 프로젝트로 시작</span>
                  <p className="text-xs text-slate-500">기능 없이 만들고 직접 하나씩 추가합니다</p>
                </div>
                {startMode === 'empty' && <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0" />}
              </div>
            </div>
          </div>

          {/* 생성 요약 */}
          <Card className="bg-slate-50 border-slate-200 mb-6">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">생성될 프로젝트 요약</p>
              <div className="space-y-1 text-xs text-slate-700">
                <p>📋 <strong>{basicForm.name || '(프로젝트명 미입력)'}</strong>
                  {basicForm.vendor_name && ` / 외주사: ${basicForm.vendor_name}`}
                  {!basicForm.vendor_name && <span className="text-purple-600"> / 외주사 미정 (추후 연결)</span>}
                </p>
                <p>📅 {vendorDecided ? '계약 기간' : '개발 일정'}: {basicForm.contract_start || '미설정'} ~ {basicForm.contract_end || '미설정'}</p>
                {analysisResult && <p>🤖 AI 분석: {analysisResult.features.filter(f => f.selected).length}개 기능 선택됨</p>}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 이전
            </Button>
            <Button onClick={createProject} disabled={!startMode || isCreating}
              className="gap-2 bg-blue-600 hover:bg-blue-500 px-8">
              <FileText className="w-4 h-4" />
              {isCreating ? '프로젝트 생성 중...' : '프로젝트 생성하기'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
