'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  CheckSquare, Clock, CheckCircle2, AlertTriangle,
  Info, PartyPopper
} from 'lucide-react'
import type { Feature } from '@/types'

// ── 글자수 상수 ──────────────────────────────────────────────────────────
const SUMMARY_MIN = 30
const SUMMARY_MAX = 600
const NOTE_MAX = 300

interface CompletionFormProps {
  projectId: string
  accessLinkId: string
  features: Feature[]                    // 전체 후보 (spec_approved + in_progress)
  inProgressFeatures: Feature[]          // 개발 중 — 신청 권장
  existingCompletions: {
    id: string
    summary: string
    vendor_note: string | null
    status: string
    created_at: string
    features: { order_key: string; name: string } | null
  }[]
  token: string
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending:  { label: '검수 대기',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '⏳' },
  approved: { label: '완료 승인',    color: 'bg-green-100  text-green-700  border-green-200',  icon: '✅' },
  rejected: { label: '반려',        color: 'bg-red-100    text-red-700    border-red-200',    icon: '❌' },
  deferred: { label: '보류',        color: 'bg-gray-100   text-gray-600   border-gray-200',   icon: '⏸️' },
}

export default function CompletionForm({
  projectId, accessLinkId, features, inProgressFeatures, existingCompletions, token,
}: CompletionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completions, setCompletions] = useState(existingCompletions)
  const [submitted, setSubmitted] = useState(false)
  const [submittedFeatureName, setSubmittedFeatureName] = useState('')
  const [summaryTouched, setSummaryTouched] = useState(false)

  const [form, setForm] = useState({
    feature_id: '',
    summary: '',
    vendor_note: '',
  })

  // ── 유효성 계산 ──
  const summaryLen = form.summary.trim().length
  const summaryTooShort = summaryTouched && summaryLen > 0 && summaryLen < SUMMARY_MIN
  const summaryTooLong  = form.summary.length > SUMMARY_MAX
  const noteTooLong     = form.vendor_note.length > NOTE_MAX
  const isValid = form.feature_id && summaryLen >= SUMMARY_MIN && !summaryTooLong && !noteTooLong

  // 선택된 기능이 in_progress인지 여부
  const selectedFeature = features.find(f => f.id === form.feature_id)
  const isInProgress = selectedFeature?.status === 'in_progress'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSummaryTouched(true)

    if (!form.feature_id) { toast.error('기능을 선택해주세요'); return }
    if (summaryLen < SUMMARY_MIN) {
      toast.error(`완료 요약을 ${SUMMARY_MIN}자 이상 구체적으로 작성해주세요`)
      return
    }
    if (summaryTooLong) {
      toast.error(`완료 요약은 ${SUMMARY_MAX}자 이내로 줄여주세요`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vendor/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          access_link_id: accessLinkId,
          feature_id: form.feature_id,
          summary: form.summary,
          vendor_note: form.vendor_note || null,
          token,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // 목록 즉시 반영
      const featureMeta = features.find(f => f.id === form.feature_id)
      setCompletions(prev => [{
        id: data.id || crypto.randomUUID(),
        summary: form.summary,
        vendor_note: form.vendor_note || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        features: featureMeta
          ? { order_key: featureMeta.order_key, name: featureMeta.name }
          : null,
      }, ...prev])

      setSubmittedFeatureName(
        featureMeta ? `[${featureMeta.order_key}] ${featureMeta.name}` : '기능'
      )
      setSubmitted(true)
    } catch (err) {
      toast.error('제출 실패: ' + (err instanceof Error ? err.message : '오류'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 제출 완료 축하 카드 ──
  if (submitted) {
    return (
      <div className="space-y-6">
        {/* 축하 카드 */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-7 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-green-800 mb-2">완료 신청 제출! 🎉</h2>
          <p className="text-sm text-green-700 mb-3">
            대표가 QA 체크리스트 기반으로 검수합니다.
          </p>
          <div className="bg-white border border-green-200 rounded-xl px-4 py-3 mb-5 text-left">
            <p className="text-xs font-semibold text-slate-500 mb-1">신청 기능</p>
            <p className="text-sm text-slate-800 font-mono font-medium">{submittedFeatureName}</p>
          </div>
          {/* 상태 트래커 */}
          <div className="grid grid-cols-3 gap-2 mb-5 text-xs">
            <div className="bg-green-100 rounded-xl p-2.5 text-green-700 font-semibold">✅ 신청 접수</div>
            <div className="bg-slate-100 rounded-xl p-2.5 text-slate-500">⏳ 대표 검수 중</div>
            <div className="bg-slate-100 rounded-xl p-2.5 text-slate-500">📬 승인/반려</div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => { window.location.href = `/vendor/${token}` }}
              className="w-full bg-green-600 hover:bg-green-500"
            >
              홈으로 돌아가기
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false)
                setForm({ feature_id: '', summary: '', vendor_note: '' })
                setSummaryTouched(false)
              }}
              className="w-full"
            >
              다른 기능 완료 신청하기
            </Button>
          </div>
        </div>

        {/* 기존 이력 */}
        {completions.length > 0 && <CompletionHistory completions={completions} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 기능 선택 */}
            <div className="space-y-2">
              <Label>완료된 기능 <span className="text-red-500">*</span></Label>
              <Select
                value={form.feature_id}
                onValueChange={v => setForm(p => ({ ...p, feature_id: v ?? p.feature_id }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="기능 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {/* 개발 중 기능 먼저 */}
                  {inProgressFeatures.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50">
                        🔨 개발 중 — 신청 권장
                      </div>
                      {inProgressFeatures.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          [{f.order_key}] {f.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* 대기 기능 */}
                  {features.filter(f => f.status === 'spec_approved').length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                        ⏳ 개발 대기
                      </div>
                      {features
                        .filter(f => f.status === 'spec_approved')
                        .map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            [{f.order_key}] {f.name}
                          </SelectItem>
                        ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* 선택된 기능이 in_progress가 아닌 경우 경고 */}
              {selectedFeature && !isInProgress && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    이 기능은 아직 '개발 중' 상태가 아닙니다. 정말 완료 신청하시겠습니까?
                  </p>
                </div>
              )}
            </div>

            {/* 완료 요약 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  완료 요약 <span className="text-red-500">*</span>
                </Label>
                <span className={`text-xs font-mono ${
                  summaryTooLong ? 'text-red-500 font-semibold' :
                  form.summary.length > SUMMARY_MAX * 0.85 ? 'text-amber-500' :
                  'text-slate-400'
                }`}>
                  {form.summary.length}/{SUMMARY_MAX}
                </span>
              </div>

              {/* 작성 가이드 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-700 space-y-0.5">
                <p className="font-semibold text-blue-800">💡 이렇게 작성하면 빠르게 승인됩니다</p>
                <p>① 무엇을 구현했는지 (기능 핵심)</p>
                <p>② 어떻게 검증했는지 (테스트 방법)</p>
                <p>③ 수용 기준 충족 여부 확인</p>
              </div>

              <Textarea
                value={form.summary}
                onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                onBlur={() => setSummaryTouched(true)}
                placeholder={`예) 반려동물 다중 프로필 등록 기능을 구현했습니다. 최대 5개 프로필 생성·수정·삭제 시나리오를 모두 테스트했으며, 정의서의 수용 기준(프로필 전환 시 데이터 분리, 삭제 후 복구 불가 경고)을 확인했습니다.`}
                rows={5}
                maxLength={SUMMARY_MAX + 10}
                className={
                  summaryTooLong ? 'border-red-400 bg-red-50' :
                  summaryTooShort ? 'border-amber-400' : ''
                }
              />
              {summaryTooShort && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  너무 짧습니다. {SUMMARY_MIN}자 이상 구체적으로 작성해주세요
                </p>
              )}
              {summaryTooLong && (
                <p className="text-xs text-red-500">{SUMMARY_MAX}자 이내로 줄여주세요</p>
              )}
            </div>

            {/* 추가 메모 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  검수 참고사항
                  <span className="text-slate-400 text-xs ml-1">(선택)</span>
                </Label>
                {form.vendor_note.length > 0 && (
                  <span className={`text-xs font-mono ${
                    noteTooLong ? 'text-red-500 font-semibold' : 'text-slate-400'
                  }`}>
                    {form.vendor_note.length}/{NOTE_MAX}
                  </span>
                )}
              </div>
              <Textarea
                value={form.vendor_note}
                onChange={e => setForm(p => ({ ...p, vendor_note: e.target.value }))}
                placeholder="테스트 환경, 알려진 한계, 검수 방법 안내 등..."
                rows={2}
                maxLength={NOTE_MAX + 10}
                className={noteTooLong ? 'border-red-400 bg-red-50' : ''}
              />
              {noteTooLong && (
                <p className="text-xs text-red-500">{NOTE_MAX}자 이내로 줄여주세요</p>
              )}
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full gap-2 h-11 transition-all ${
                isValid
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-slate-300 text-slate-500'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {isSubmitting ? '제출 중...' :
               !form.feature_id ? '기능을 먼저 선택해주세요' :
               summaryLen < SUMMARY_MIN ? `요약을 ${SUMMARY_MIN}자 이상 작성해주세요` :
               '개발 완료 신청'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 기존 이력 */}
      {completions.length > 0 && <CompletionHistory completions={completions} />}
    </div>
  )
}

// ── 이력 서브컴포넌트 ────────────────────────────────────────────────────
function CompletionHistory({
  completions,
}: {
  completions: CompletionFormProps['existingCompletions']
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        완료 신청 이력 ({completions.length}건)
      </h2>
      <div className="space-y-3">
        {completions.map(c => {
          const config = statusConfig[c.status] || statusConfig.pending
          return (
            <Card key={c.id} className={`border ${config.color.includes('green') ? 'border-green-200' : 'border-slate-200'}`}>
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    {c.features && (
                      <p className="text-xs font-mono text-slate-500 mb-1">
                        [{c.features.order_key}] {c.features.name}
                      </p>
                    )}
                    <p className="text-sm text-slate-900 line-clamp-3">{c.summary}</p>
                    {c.vendor_note && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        참고: {c.vendor_note}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <Badge className={`text-xs border ${config.color}`}>{config.label}</Badge>
                      <p className="text-xs text-slate-400">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(c.created_at).toLocaleDateString('ko-KR', {
                          month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
