'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Zap, Sparkles, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Package, Plus,
  LayoutTemplate, FileText,
} from 'lucide-react'

// =====================================================
// 타입
// =====================================================
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

// =====================================================
// Step 인디케이터
// =====================================================
function StepIndicator({ step }: { step: number }) {
  const steps = ['기본 정보', '요구사항 입력', 'AI 분석 결과', '시작 방식 선택']
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            i + 1 === step ? 'bg-blue-600 text-white' :
            i + 1 < step ? 'bg-green-100 text-green-700' :
            'bg-slate-100 text-slate-400'
          }`}>
            {i + 1 < step ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
            {label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-green-300' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// =====================================================
// 우선순위 배지
// =====================================================
function PriorityBadge({ group }: { group: string }) {
  const colors: Record<string, string> = {
    P0: 'bg-red-100 text-red-700 border-red-200',
    P1: 'bg-orange-100 text-orange-700 border-orange-200',
    P2: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${colors[group] || 'bg-gray-100 text-gray-600'}`}>
      {group}
    </span>
  )
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [startMode, setStartMode] = useState<'ai' | 'template' | 'empty' | null>(null)
  const [showDiscord, setShowDiscord] = useState(false)

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
    discord_daily_report_channel: '',
    discord_weekly_plan_channel: '',
    discord_risks_channel: '',
    discord_decisions_channel: '',
    discord_completion_channel: '',
    discord_founder_dm_channel: '',
  })

  // Step 2: 요구사항
  const [reqForm, setReqForm] = useState({
    one_line: '',
    must_have: '',
    nice_to_have: '',
    out_of_scope: '',
    priority_basis: '',
    references: '',
    core_problem: '',
    constraints: '',
  })

  const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBasicForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleReqChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setReqForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // =====================================================
  // AI 분석 실행
  // =====================================================
  const runAnalysis = async () => {
    if (!reqForm.one_line && !reqForm.must_have && !reqForm.core_problem) {
      toast.error('최소 하나 이상 입력해주세요 (서비스 설명, 핵심 기능, 또는 핵심 문제)')
      return
    }
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/projects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reqForm,
          project_name: basicForm.name,
          project_goal: basicForm.goal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '분석 실패')
      // 모든 기능 선택 상태로 초기화
      setAnalysisResult({
        ...data,
        features: data.features.map((f: AnalyzedFeature) => ({ ...f, selected: true })),
      })
      setStep(3)
      if (data.isFallback) {
        toast.info('OpenAI API 키가 없어 기본 템플릿으로 분석했습니다. 직접 수정 후 사용하세요.')
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

  // =====================================================
  // 프로젝트 생성 실행
  // =====================================================
  const createProject = async () => {
    if (!startMode) { toast.error('시작 방식을 선택해주세요'); return }
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
  const step1Valid = basicForm.name.trim() && basicForm.vendor_name.trim() && basicForm.contract_start && basicForm.contract_end

  // Step 1 필드별 에러 (다음 버튼 클릭 후 표시)
  const [step1Touched, setStep1Touched] = useState(false)
  const step1Errors = {
    name: step1Touched && !basicForm.name.trim(),
    vendor_name: step1Touched && !basicForm.vendor_name.trim(),
    contract_start: step1Touched && !basicForm.contract_start,
    contract_end: step1Touched && !basicForm.contract_end,
  }

  const handleNextStep = () => {
    if (!step1Valid) {
      setStep1Touched(true)
      return
    }
    setStep(2)
  }

  // =====================================================
  // RENDER: Step 1 — 기본 정보
  // =====================================================
  if (step === 1) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 대시보드로
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">새 프로젝트 생성</h1>
          <p className="text-slate-500 text-sm mt-1">외주 개발 프로젝트를 AI와 함께 설계합니다</p>
        </div>
        <StepIndicator step={1} />

        {/* 미입력 필드 안내 배너 */}
        {step1Touched && !step1Valid && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <span className="font-semibold">필수 항목을 모두 입력해주세요:</span>
              <ul className="mt-1 text-xs space-y-0.5">
                {step1Errors.name && <li>• 프로젝트명이 비어있습니다</li>}
                {step1Errors.vendor_name && <li>• 외주사명이 비어있습니다</li>}
                {step1Errors.contract_start && <li>• 계약 시작일이 선택되지 않았습니다</li>}
                {step1Errors.contract_end && <li>• 계약 종료일이 선택되지 않았습니다</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* 기본 정보 */}
          <Card className={step1Touched && (step1Errors.name || step1Errors.vendor_name) ? 'border-red-200' : ''}>
            <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="space-y-2">
                <Label>프로젝트 목표 <span className="text-slate-400 text-xs">(선택 — 다음 단계에서 상세 입력 가능)</span></Label>
                <Textarea name="goal" value={basicForm.goal} onChange={handleBasicChange} placeholder="한 줄 목표를 입력하세요" rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* 계약 정보 */}
          <Card className={step1Touched && (step1Errors.contract_start || step1Errors.contract_end) ? 'border-red-200' : ''}>
            <CardHeader><CardTitle className="text-base">계약 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>계약 시작일 <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    name="contract_start"
                    value={basicForm.contract_start}
                    onChange={handleBasicChange}
                    className={step1Errors.contract_start ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''}
                  />
                  {step1Errors.contract_start && <p className="text-xs text-red-500">계약 시작일을 선택해주세요</p>}
                </div>
                <div className="space-y-2">
                  <Label>계약 종료일 <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    name="contract_end"
                    value={basicForm.contract_end}
                    onChange={handleBasicChange}
                    className={step1Errors.contract_end ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''}
                  />
                  {step1Errors.contract_end && <p className="text-xs text-red-500">계약 종료일을 선택해주세요</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>계약 금액 (원, 선택)</Label>
                <Input type="number" name="contract_amount" value={basicForm.contract_amount} onChange={handleBasicChange} placeholder="50000000" />
              </div>
            </CardContent>
          </Card>

          {/* 외주사 담당자 */}
          <Card>
            <CardHeader><CardTitle className="text-base">외주사 담당자</CardTitle></CardHeader>
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

          {/* Discord 선택적 */}
          <Card>
            <CardContent className="pt-4">
              <button
                type="button"
                onClick={() => setShowDiscord(v => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              >
                {showDiscord ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Discord 연동 설정 (선택 — 나중에 설정 가능)
              </button>
              {showDiscord && (
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input name="discord_webhook_url" value={basicForm.discord_webhook_url} onChange={handleBasicChange} placeholder="https://discord.com/api/webhooks/..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>#daily-report 채널</Label><Input name="discord_daily_report_channel" value={basicForm.discord_daily_report_channel} onChange={handleBasicChange} /></div>
                    <div className="space-y-2"><Label>#weekly-plan 채널</Label><Input name="discord_weekly_plan_channel" value={basicForm.discord_weekly_plan_channel} onChange={handleBasicChange} /></div>
                    <div className="space-y-2"><Label>#risks 채널</Label><Input name="discord_risks_channel" value={basicForm.discord_risks_channel} onChange={handleBasicChange} /></div>
                    <div className="space-y-2"><Label>Founder DM 채널</Label><Input name="discord_founder_dm_channel" value={basicForm.discord_founder_dm_channel} onChange={handleBasicChange} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Brief 발송 시간</Label>
                    <Input type="time" name="brief_send_time" value={basicForm.brief_send_time} onChange={handleBasicChange} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Link href="/dashboard"><Button variant="outline">취소</Button></Link>
            <Button
              onClick={handleNextStep}
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              다음: 요구사항 입력 <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  // =====================================================
  // RENDER: Step 2 — 요구사항 입력
  // =====================================================
  if (step === 2) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>
          <h1 className="text-2xl font-bold text-slate-900">요구사항 입력</h1>
          <p className="text-slate-500 text-sm mt-1">
            AI가 이 내용을 분석해 기능 목록과 우선순위를 자동으로 제안합니다
          </p>
        </div>
        <StepIndicator step={2} />

        {/* 핵심 안내 배너 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">자유롭게 적어주세요</p>
            <p className="text-xs text-blue-700 mt-0.5">
              완벽한 문장이 아니어도 됩니다. 생각나는 대로, 메모 수준으로도 충분합니다.
              AI가 구조화해서 기능 목록으로 만들어줍니다.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 필수 */}
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">핵심</span>
                서비스 & 핵심 기능
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>만들고 싶은 서비스/제품 한 줄 설명</Label>
                <Input
                  name="one_line"
                  value={reqForm.one_line}
                  onChange={handleReqChange}
                  placeholder="예: 강아지 도그워킹 매칭 플랫폼 / 소상공인 재고관리 SaaS / 독립서점 큐레이션 앱"
                />
              </div>
              <div className="space-y-2">
                <Label>꼭 필요한 기능 <span className="text-slate-400 text-xs">(줄바꿈으로 구분)</span></Label>
                <Textarea
                  name="must_have"
                  value={reqForm.must_have}
                  onChange={handleReqChange}
                  placeholder={"예:\n- 회원가입/로그인\n- 서비스 신청 및 매칭\n- 결제 연동\n- 알림 기능"}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>현재 가장 해결하고 싶은 문제</Label>
                <Textarea
                  name="core_problem"
                  value={reqForm.core_problem}
                  onChange={handleReqChange}
                  placeholder="예: 지금은 카카오톡으로 수동 매칭하고 있어서 하루에 2시간씩 낭비됨. 이걸 자동화하고 싶음."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 보조 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-700">추가 정보 (선택 — 입력할수록 AI 제안이 정확해집니다)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>있으면 좋은 기능 (2순위)</Label>
                <Textarea name="nice_to_have" value={reqForm.nice_to_have} onChange={handleReqChange} placeholder={"예:\n- 리뷰/평점\n- 정기 구독\n- 통계 대시보드"} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>제외하고 싶은 범위</Label>
                  <Textarea name="out_of_scope" value={reqForm.out_of_scope} onChange={handleReqChange} placeholder="예: 이번엔 웹만, 앱은 2차" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>우선순위 기준</Label>
                  <Textarea name="priority_basis" value={reqForm.priority_basis} onChange={handleReqChange} placeholder="예: 출시 일정 우선, 운영 자동화 먼저" rows={3} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>참고 서비스 / 경쟁사</Label>
                  <Input name="references" value={reqForm.references} onChange={handleReqChange} placeholder="예: 강아지 산책 앱 A처럼" />
                </div>
                <div className="space-y-2">
                  <Label>외주사에게 꼭 전달할 조건</Label>
                  <Input name="constraints" value={reqForm.constraints} onChange={handleReqChange} placeholder="예: React Native 필수, 3개월 내 배포" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 이전
            </Button>
            <Button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="gap-2 bg-blue-600 hover:bg-blue-500 px-6"
            >
              <Zap className="w-4 h-4" />
              {isAnalyzing ? 'AI 분석 중...' : 'AI가 요구사항 분석하기'}
            </Button>
          </div>

          {/* 건너뛰기 옵션 */}
          <div className="text-center pt-2">
            <button
              onClick={() => setStep(4)}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              요구사항 분석 건너뛰고 바로 시작 방식 선택 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // =====================================================
  // RENDER: Step 3 — AI 분석 결과
  // =====================================================
  if (step === 3 && analysisResult) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 요구사항 수정
          </button>
          <h1 className="text-2xl font-bold text-slate-900">AI 분석 결과</h1>
          <p className="text-slate-500 text-sm mt-1">포함할 기능을 선택하고 다음으로 진행하세요</p>
        </div>
        <StepIndicator step={3} />

        {/* AI 요약 */}
        {analysisResult.isFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              OpenAI API 키가 설정되지 않아 기본 템플릿으로 분석했습니다.
              내용을 직접 수정하거나, API 키 설정 후 재분석하세요.
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
                <p className="text-xs text-blue-600 mt-2 italic">{analysisResult.priority_guide}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기능 목록 */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              제안된 기능 목록 — 클릭해서 포함/제외 선택
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setAnalysisResult(prev => prev ? { ...prev, features: prev.features.map(f => ({ ...f, selected: true })) } : null)} className="text-xs text-blue-600 hover:underline">전체 선택</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => setAnalysisResult(prev => prev ? { ...prev, features: prev.features.map(f => ({ ...f, selected: false })) } : null)} className="text-xs text-slate-500 hover:underline">전체 해제</button>
            </div>
          </div>

          {['P0', 'P1', 'P2'].map(pg => {
            const groupFeatures = analysisResult.features.filter(f => f.priority_group === pg)
            if (groupFeatures.length === 0) return null
            return (
              <div key={pg}>
                <div className="flex items-center gap-2 mb-2">
                  <PriorityBadge group={pg} />
                  <span className="text-xs text-slate-500">{groupFeatures.length}개</span>
                </div>
                <div className="space-y-2">
                  {groupFeatures.map((f, _) => {
                    const idx = analysisResult.features.indexOf(f)
                    return (
                      <div
                        key={f.order_key}
                        onClick={() => toggleFeature(idx)}
                        className={`rounded-lg border p-3 cursor-pointer transition-all ${
                          f.selected
                            ? 'bg-white border-blue-200 shadow-sm'
                            : 'bg-slate-50 border-slate-100 opacity-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${f.selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                            {f.selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-slate-400">{f.order_key}</span>
                              <span className="text-sm font-medium text-slate-900">{f.name}</span>
                              <Badge variant="outline" className="text-xs py-0 h-4">{f.category.replace(/_/g, ' ')}</Badge>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-green-700">✓ {f.expected_effect}</span>
                              <span className="text-xs text-slate-400">· {f.priority_reason}</span>
                            </div>
                            {f.risk_note && (
                              <p className="text-xs text-amber-700 mt-1">⚠️ {f.risk_note}</p>
                            )}
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

        {/* 리스크 & 대표 확인 사항 */}
        {(analysisResult.risks.length > 0 || analysisResult.founder_checks.length > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            {analysisResult.risks.length > 0 && (
              <Card className="border-amber-100">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 초기 리스크</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">{analysisResult.risks.map((r, i) => <li key={i} className="text-xs text-slate-700">• {r}</li>)}</ul>
                </CardContent>
              </Card>
            )}
            {analysisResult.founder_checks.length > 0 && (
              <Card className="border-blue-100">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-blue-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 대표 확인 필요</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">{analysisResult.founder_checks.map((r, i) => <li key={i} className="text-xs text-slate-700">• {r}</li>)}</ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(2)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 다시 분석
          </Button>
          <Button
            onClick={() => setStep(4)}
            className="gap-2 bg-blue-600 hover:bg-blue-500"
          >
            {analysisResult.features.filter(f => f.selected).length}개 기능으로 계속
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  // =====================================================
  // RENDER: Step 4 — 시작 방식 선택
  // =====================================================
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep(analysisResult ? 3 : 2)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> 이전
          </button>
          <h1 className="text-2xl font-bold text-slate-900">시작 방식 선택</h1>
          <p className="text-slate-500 text-sm mt-1">프로젝트의 초기 기능 목록을 어떻게 구성할지 선택하세요</p>
        </div>
        <StepIndicator step={4} />

        <div className="grid gap-4 mb-6">
          {/* Option A: AI 제안 */}
          {analysisResult && (
            <div
              onClick={() => setStartMode('ai')}
              className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${
                startMode === 'ai' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${startMode === 'ai' ? 'bg-blue-600' : 'bg-blue-100'}`}>
                  <Zap className={`w-5 h-5 ${startMode === 'ai' ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">A. AI 제안 기능 목록으로 시작</span>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">추천</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    방금 AI가 분석한 <strong>{analysisResult.features.filter(f => f.selected).length}개 기능</strong>으로 프로젝트를 시작합니다.
                    각 기능에 대해 AI 정의서를 바로 생성할 수 있습니다.
                  </p>
                </div>
                {startMode === 'ai' && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
              </div>
            </div>
          )}

          {/* Option B: 템플릿 (비포펫 예시) */}
          <div
            onClick={() => setStartMode('template')}
            className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${
              startMode === 'template' ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${startMode === 'template' ? 'bg-purple-600' : 'bg-purple-100'}`}>
                <LayoutTemplate className={`w-5 h-5 ${startMode === 'template' ? 'text-white' : 'text-purple-600'}`} />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-slate-900">B. 예시 기능 템플릿 불러오기</span>
                <p className="text-sm text-slate-600 mt-1">
                  비포펫 POC 예시 기능 14개(P0 7개, P1 7개)를 참고용으로 불러옵니다.
                  실제 프로젝트에 맞게 수정해서 사용하세요.
                </p>
                <p className="text-xs text-slate-400 mt-1">업로드 핫픽스, 가입 루트 병렬화, 구독형 수락 등 모바일 앱 개발 예시</p>
              </div>
              {startMode === 'template' && <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />}
            </div>
          </div>

          {/* Option C: 빈 프로젝트 */}
          <div
            onClick={() => setStartMode('empty')}
            className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${
              startMode === 'empty' ? 'border-slate-600 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-400'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${startMode === 'empty' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <Plus className={`w-5 h-5 ${startMode === 'empty' ? 'text-white' : 'text-slate-600'}`} />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-slate-900">C. 빈 프로젝트로 시작</span>
                <p className="text-sm text-slate-600 mt-1">
                  기능 없이 프로젝트만 만들고, 기능을 직접 하나씩 추가합니다.
                </p>
              </div>
              {startMode === 'empty' && <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0" />}
            </div>
          </div>
        </div>

        {/* 요약 */}
        <Card className="bg-slate-50 border-slate-200 mb-6">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">생성될 프로젝트 요약</p>
            <div className="space-y-1 text-xs text-slate-700">
              <p>📋 <strong>{basicForm.name}</strong> / 외주사: {basicForm.vendor_name}</p>
              <p>📅 {basicForm.contract_start} ~ {basicForm.contract_end}</p>
              {analysisResult && <p>🤖 AI 분석: {analysisResult.features.filter(f => f.selected).length}개 기능 제안됨</p>}
              {startMode && (
                <p>🚀 시작 방식: {startMode === 'ai' ? 'AI 제안 기능' : startMode === 'template' ? '비포펫 예시 템플릿' : '빈 프로젝트'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(analysisResult ? 3 : 2)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 이전
          </Button>
          <Button
            onClick={createProject}
            disabled={!startMode || isCreating}
            className="gap-2 bg-blue-600 hover:bg-blue-500 px-8"
          >
            <FileText className="w-4 h-4" />
            {isCreating ? '프로젝트 생성 중...' : '프로젝트 생성'}
          </Button>
        </div>
      </div>
    </div>
  )
}
