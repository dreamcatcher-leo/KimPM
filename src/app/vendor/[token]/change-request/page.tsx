'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  GitBranch, Send, CheckCircle2, AlertTriangle,
  Clock, Info, ChevronDown, ChevronUp
} from 'lucide-react'

// ── 글자수 상수 ──────────────────────────────────────────────────────────
const TITLE_MAX = 60
const CONTENT_MIN = 20
const CONTENT_MAX = 1000
const REASON_MIN = 10
const REASON_MAX = 500

// ── 제출 완료 상태 화면 ───────────────────────────────────────────────────
function SubmittedView({
  title,
  token,
}: {
  title: string
  token: string
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
        <GitBranch className="w-5 h-5" />
        범위 변경 요청
      </h1>
      <p className="text-sm text-slate-500 mb-6">요청이 접수되었습니다</p>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-blue-800 mb-2">요청이 제출되었습니다</h2>
        <p className="text-sm text-blue-700 mb-4">
          대표가 검토 후 승인 또는 반려를 회신드립니다.
          <br />
          <strong>승인 전에는 해당 범위 작업을 시작하지 마세요.</strong>
        </p>

        {/* 제출된 제목 */}
        <div className="bg-white border border-blue-200 rounded-xl px-4 py-3 mb-5 text-left">
          <p className="text-xs font-semibold text-slate-500 mb-1">제출된 요청 제목</p>
          <p className="text-sm text-slate-800 font-medium">{title}</p>
        </div>

        {/* 상태 안내 */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-xs">
          <div className="bg-blue-100 rounded-xl p-2.5 text-blue-700 font-semibold">
            ✅ 요청 접수
          </div>
          <div className="bg-slate-100 rounded-xl p-2.5 text-slate-500">
            ⏳ 대표 검토 중
          </div>
          <div className="bg-slate-100 rounded-xl p-2.5 text-slate-500">
            📬 승인/반려 회신
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => { window.location.href = `/vendor/${token}` }}
            className="w-full bg-blue-600 hover:bg-blue-500"
          >
            홈으로 돌아가기
          </Button>
          <Button
            variant="outline"
            onClick={() => { window.location.reload() }}
            className="w-full"
          >
            추가 변경 요청하기
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function VendorChangeRequestPage() {
  const params = useParams<{ token: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedTitle, setSubmittedTitle] = useState('')
  const [showOptional, setShowOptional] = useState(false)

  const [touched, setTouched] = useState({
    title: false,
    content: false,
    reason: false,
  })
  const [form, setForm] = useState({
    title: '',
    content: '',
    reason: '',
    affected_features: '',
    schedule_impact: '',
    cost_impact: '',
    alternative: '',
  })

  // ── 유효성 계산 ──
  const titleTooLong  = form.title.length > TITLE_MAX
  const contentTooShort = touched.content && form.content.trim().length > 0 && form.content.trim().length < CONTENT_MIN
  const contentTooLong  = form.content.length > CONTENT_MAX
  const reasonTooShort  = touched.reason && form.reason.trim().length > 0 && form.reason.trim().length < REASON_MIN
  const reasonTooLong   = form.reason.length > REASON_MAX

  const isValid =
    form.title.trim().length > 0 && !titleTooLong &&
    form.content.trim().length >= CONTENT_MIN && !contentTooLong &&
    form.reason.trim().length >= REASON_MIN && !reasonTooLong

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // 전체 touched 처리
    setTouched({ title: true, content: true, reason: true })

    if (!form.title.trim()) {
      toast.error('변경 요청 제목을 입력해주세요')
      return
    }
    if (titleTooLong) {
      toast.error(`제목은 ${TITLE_MAX}자 이내로 입력해주세요`)
      return
    }
    if (form.content.trim().length < CONTENT_MIN) {
      toast.error(`변경 내용을 ${CONTENT_MIN}자 이상 구체적으로 작성해주세요`)
      return
    }
    if (contentTooLong) {
      toast.error(`변경 내용은 ${CONTENT_MAX}자 이내로 줄여주세요`)
      return
    }
    if (form.reason.trim().length < REASON_MIN) {
      toast.error(`변경 사유를 ${REASON_MIN}자 이상 작성해주세요`)
      return
    }
    if (reasonTooLong) {
      toast.error(`변경 사유는 ${REASON_MAX}자 이내로 줄여주세요`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vendor/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token: params.token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSubmittedTitle(form.title)
      setSubmitted(true)
    } catch (err) {
      toast.error('제출 실패: ' + (err instanceof Error ? err.message : '오류'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 제출 완료 화면 ──
  if (submitted) {
    return <SubmittedView title={submittedTitle} token={params.token} />
  }

  return (
    <div>
      {/* 헤더 */}
      <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
        <GitBranch className="w-5 h-5" />
        범위 변경 요청
      </h1>
      <p className="text-sm text-slate-500 mb-2">
        개발 범위·일정 변경이 필요할 때 대표에게 먼저 승인을 받으세요
      </p>

      {/* 경고 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800">승인 전 착수 금지</p>
          <p className="text-xs text-amber-700 mt-0.5">
            승인 전에 범위 밖 작업을 시작하면 비용·일정 분쟁이 발생할 수 있습니다.
            반드시 대표 승인 후 착수하세요.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-5 space-y-5">

            {/* 제목 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>변경 요청 제목 <span className="text-red-500">*</span></Label>
                <span className={`text-xs font-mono ${
                  titleTooLong ? 'text-red-500 font-semibold' :
                  form.title.length > TITLE_MAX * 0.85 ? 'text-amber-500' :
                  'text-slate-400'
                }`}>
                  {form.title.length}/{TITLE_MAX}
                </span>
              </div>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                onBlur={() => handleBlur('title')}
                placeholder="예: P0-3 강아지 프로필 분리 범위 조정"
                maxLength={TITLE_MAX + 5}
                className={titleTooLong ? 'border-red-400 bg-red-50' : ''}
              />
              {titleTooLong && (
                <p className="text-xs text-red-500">{TITLE_MAX}자 이내로 줄여주세요</p>
              )}
            </div>

            {/* 변경 내용 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>변경 내용 <span className="text-red-500">*</span></Label>
                <span className={`text-xs font-mono ${
                  contentTooLong ? 'text-red-500 font-semibold' :
                  form.content.length > CONTENT_MAX * 0.85 ? 'text-amber-500' :
                  'text-slate-400'
                }`}>
                  {form.content.length}/{CONTENT_MAX}
                </span>
              </div>
              <Textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                onBlur={() => handleBlur('content')}
                rows={4}
                placeholder="어떤 부분을 어떻게 변경하고 싶은지 구체적으로 설명해 주세요. 예) 현재 정의서에는 단일 프로필만 지원하지만, 반려동물 2마리 이상 등록이 필요한 케이스가 발생하여 다중 프로필로 변경이 필요합니다."
                maxLength={CONTENT_MAX + 10}
                className={
                  contentTooLong ? 'border-red-400 bg-red-50' :
                  contentTooShort ? 'border-amber-400' : ''
                }
              />
              {contentTooShort && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  너무 짧습니다. {CONTENT_MIN}자 이상 구체적으로 작성해주세요
                </p>
              )}
              {contentTooLong && (
                <p className="text-xs text-red-500">{CONTENT_MAX}자 이내로 줄여주세요</p>
              )}
              {!contentTooShort && !contentTooLong && !touched.content && (
                <p className="text-xs text-slate-400 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  현재 정의서와 무엇이 달라지는지, 왜 필요한지를 함께 적으면 빠르게 승인됩니다
                </p>
              )}
            </div>

            {/* 변경 사유 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>변경 사유 <span className="text-red-500">*</span></Label>
                <span className={`text-xs font-mono ${
                  reasonTooLong ? 'text-red-500 font-semibold' :
                  form.reason.length > REASON_MAX * 0.85 ? 'text-amber-500' :
                  'text-slate-400'
                }`}>
                  {form.reason.length}/{REASON_MAX}
                </span>
              </div>
              <Textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                onBlur={() => handleBlur('reason')}
                rows={2}
                placeholder="예: 실제 사용자 테스트에서 단일 프로필로는 니즈를 충족하지 못함을 확인했습니다."
                maxLength={REASON_MAX + 10}
                className={
                  reasonTooLong ? 'border-red-400 bg-red-50' :
                  reasonTooShort ? 'border-amber-400' : ''
                }
              />
              {reasonTooShort && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {REASON_MIN}자 이상 이유를 설명해주세요
                </p>
              )}
              {reasonTooLong && (
                <p className="text-xs text-red-500">{REASON_MAX}자 이내로 줄여주세요</p>
              )}
            </div>

            {/* 선택 필드 접기 */}
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors text-sm"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                일정·비용 영향 & 대안 추가
                <span className="text-xs text-slate-400">(선택 — 입력하면 승인이 빨라집니다)</span>
              </span>
              {showOptional
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />}
            </button>

            {showOptional && (
              <div className="space-y-4 pl-3 border-l-2 border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">영향 받는 기능</Label>
                    <Input
                      name="affected_features"
                      value={form.affected_features}
                      onChange={handleChange}
                      placeholder="P0-3, P1-2 등"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">일정 영향</Label>
                    <Input
                      name="schedule_impact"
                      value={form.schedule_impact}
                      onChange={handleChange}
                      placeholder="예: 1주 추가 필요"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">비용 영향</Label>
                    <Input
                      name="cost_impact"
                      value={form.cost_impact}
                      onChange={handleChange}
                      placeholder="없음 / 추가 협의 필요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">대안 (있을 경우)</Label>
                    <Input
                      name="alternative"
                      value={form.alternative}
                      onChange={handleChange}
                      placeholder="대안적 접근 방식..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={isSubmitting || (!isValid && (touched.content || touched.reason))}
              className={`w-full gap-2 h-11 transition-all ${
                isValid
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? '제출 중...' :
               !form.title.trim() ? '제목을 입력해주세요' :
               form.content.trim().length < CONTENT_MIN ? `내용을 ${CONTENT_MIN}자 이상 작성해주세요` :
               form.reason.trim().length < REASON_MIN ? `사유를 ${REASON_MIN}자 이상 작성해주세요` :
               '범위 변경 요청 제출'}
            </Button>

          </CardContent>
        </Card>
      </form>
    </div>
  )
}
