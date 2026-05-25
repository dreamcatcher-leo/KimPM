'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Send, Plus, Paperclip, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertTriangle
} from 'lucide-react'
import type { Feature } from '@/types'

const WORK_TYPES = [
  { value: '코드_구현', label: '코드 구현', emoji: '💻' },
  { value: '테스트_QA', label: '테스트·QA', emoji: '🧪' },
  { value: '버그_재현_원인_분석', label: '버그 분석', emoji: '🐛' },
  { value: '기획_정책_정리', label: '기획·정책', emoji: '📋' },
  { value: '배포_준비', label: '배포 준비', emoji: '🚀' },
  { value: '레거시_분석', label: '레거시 분석', emoji: '🔍' },
  { value: '의사결정_대기', label: '대기 중', emoji: '⏳' },
  { value: '외부_API_검토', label: 'API 검토', emoji: '🔌' },
]

const EVIDENCE_TYPES = [
  { value: '코드_증빙', label: '코드 증빙', placeholder: 'PR URL, Commit URL, 변경된 파일 등' },
  { value: '조사_증빙', label: '조사 증빙', placeholder: '분석 메모, 읽은 파일 목록 등' },
  { value: '기획_증빙', label: '기획 증빙', placeholder: '화면 흐름, 정책 메모 등' },
  { value: '디버깅_증빙', label: '디버깅 증빙', placeholder: '로그, 스크린샷, 재현 단계 등' },
  { value: '검증_증빙', label: '검증 증빙', placeholder: '테스트 결과, QA 체크 결과 등' },
  { value: '배포_증빙', label: '배포 증빙', placeholder: '스테이징 링크, 프리뷰 URL 등' },
  { value: '협업_증빙', label: '협업 증빙', placeholder: '질문 내용, blocker 설명 등' },
]

interface ExistingReport {
  id: string
  summary?: string | null
  work_types?: string[] | null
  related_feature_ids?: string[] | null
  blocker?: string | null
  tomorrow_plan?: string | null
  needs_founder_check?: boolean
  files_modified?: string | null
  conclusion?: string | null
}

interface ReportFormProps {
  projectId: string
  accessLinkId: string
  reportDate: string
  features: Feature[]
  token: string
  existingReport?: ExistingReport | null
}

export default function ReportForm({ projectId, accessLinkId, reportDate, features, token, existingReport }: ReportFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── 필수 필드 ──
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>(
    existingReport?.work_types || []
  )
  const [summary, setSummary] = useState(existingReport?.summary || '')

  // ── 선택 필드 (접기) ──
  const [showOptional, setShowOptional] = useState(
    !!(existingReport?.blocker || existingReport?.tomorrow_plan || existingReport?.files_modified || existingReport?.conclusion)
  )
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    existingReport?.related_feature_ids || []
  )
  const [blocker, setBlocker] = useState(existingReport?.blocker || '')
  const [tomorrowPlan, setTomorrowPlan] = useState(existingReport?.tomorrow_plan || '')
  const [needsFounderCheck, setNeedsFounderCheck] = useState(existingReport?.needs_founder_check || false)
  const [filesModified, setFilesModified] = useState(existingReport?.files_modified || '')
  const [conclusion, setConclusion] = useState(existingReport?.conclusion || '')
  const [privateNote, setPrivateNote] = useState('')

  // ── 증빙 (별도 접기) ──
  const [showEvidence, setShowEvidence] = useState(false)
  const [evidenceItems, setEvidenceItems] = useState<{ type: string; title: string; content: string; url: string }[]>([])

  const toggleWorkType = (type: string) =>
    setSelectedWorkTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )

  const toggleFeature = (id: string) =>
    setSelectedFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )

  const addEvidence = () =>
    setEvidenceItems(prev => [...prev, { type: '코드_증빙', title: '', content: '', url: '' }])

  const SUMMARY_MIN = 10
  const SUMMARY_MAX = 200
  const summaryTooShort = summary.trim().length > 0 && summary.trim().length < SUMMARY_MIN
  const summaryTooLong = summary.length > SUMMARY_MAX
  const isValid = selectedWorkTypes.length > 0 && summary.trim().length >= SUMMARY_MIN && !summaryTooLong

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedWorkTypes.length === 0) { toast.error('작업 유형을 하나 이상 선택해주세요'); return }
    if (!summary.trim()) { toast.error('오늘 작업 요약을 입력해주세요'); return }
    if (summary.trim().length < SUMMARY_MIN) { toast.error(`요약이 너무 짧습니다. ${SUMMARY_MIN}자 이상 입력해주세요`); return }
    if (summaryTooLong) { toast.error(`요약이 너무 깁니다. ${SUMMARY_MAX}자 이내로 줄여주세요`); return }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          access_link_id: accessLinkId,
          report_date: reportDate,
          work_types: selectedWorkTypes,
          related_feature_ids: selectedFeatures,
          summary,
          blocker: blocker || null,
          files_modified: filesModified || null,
          conclusion: conclusion || null,
          tomorrow_plan: tomorrowPlan || null,
          needs_founder_check: needsFounderCheck,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (evidenceItems.length > 0 && data.report?.id) {
        await fetch('/api/evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: data.report.id,
            project_id: projectId,
            evidence_items: evidenceItems.filter(e => e.content || e.url),
          }),
        })
      }

      if (privateNote.trim()) {
        await fetch('/api/vendor/private-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            access_link_id: accessLinkId,
            note_date: reportDate,
            content: privateNote,
          }),
        })
      }

      toast.success('보고가 제출되었습니다! 수고하셨습니다 😊')
      // 하드 네비게이션으로 홈 이동 (Server Component 완전 재로드)
      setTimeout(() => {
        window.location.href = `/vendor/${token}`
      }, 800)
    } catch (err) {
      toast.error('제출 실패: ' + (err instanceof Error ? err.message : '오류'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* STEP 1 — 작업 유형 (필수, 칩 클릭) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className={selectedWorkTypes.length > 0 ? 'border-blue-200' : 'border-slate-200'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {selectedWorkTypes.length > 0
              ? <CheckCircle2 className="w-4 h-4 text-blue-600" />
              : <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
            오늘 한 작업 유형
            <span className="text-red-500 font-normal">*</span>
            {selectedWorkTypes.length > 0 && (
              <span className="ml-auto text-xs text-blue-600 font-normal">{selectedWorkTypes.length}개 선택됨</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {WORK_TYPES.map(wt => {
              const active = selectedWorkTypes.includes(wt.value)
              return (
                <button
                  key={wt.value}
                  type="button"
                  onClick={() => toggleWorkType(wt.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span className="text-lg leading-none">{wt.emoji}</span>
                  <span className="text-xs font-medium leading-tight">{wt.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* STEP 2 — 오늘 작업 한 줄 요약 (필수) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card className={
        summaryTooLong ? 'border-red-300' :
        summaryTooShort ? 'border-amber-300' :
        summary.trim().length >= SUMMARY_MIN ? 'border-blue-200' :
        'border-slate-200'
      }>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {summary.trim().length >= SUMMARY_MIN && !summaryTooLong
              ? <CheckCircle2 className="w-4 h-4 text-blue-600" />
              : <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
            오늘 작업 한 줄 요약
            <span className="text-red-500 font-normal">*</span>
            <span className={`ml-auto text-xs font-normal ${summaryTooLong ? 'text-red-500 font-semibold' : summary.length > SUMMARY_MAX * 0.8 ? 'text-amber-500' : 'text-slate-400'}`}>
              {summary.length}/{SUMMARY_MAX}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="예: P0-1 이미지 업로드 실패 원인 파악 및 핫픽스 코드 작성 완료"
            className={`text-sm ${summaryTooLong ? 'border-red-400 bg-red-50' : summaryTooShort ? 'border-amber-300' : ''}`}
            maxLength={SUMMARY_MAX + 20}
          />
          {summaryTooShort && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              너무 짧습니다. 오늘 한 일을 구체적으로 적어주세요 ({SUMMARY_MIN}자 이상)
            </p>
          )}
          {summaryTooLong && (
            <p className="text-xs text-red-500 mt-1.5">너무 깁니다. 핵심 내용만 {SUMMARY_MAX}자 이내로 줄여주세요</p>
          )}
          {!summaryTooShort && !summaryTooLong && (
            <p className="text-xs text-slate-400 mt-1.5">한 문장으로, 오늘 가장 핵심적인 작업 하나만 적어주세요</p>
          )}
        </CardContent>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 막힌 점 — 인라인 (없으면 비워두기) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <Label className="text-sm font-semibold text-orange-800 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          진행에 막힌 점이 있나요?
          <span className="font-normal text-orange-600 text-xs">없으면 비워두세요</span>
          {blocker.length > 0 && (
            <span className={`ml-auto text-xs font-normal ${blocker.length > 300 ? 'text-red-500 font-semibold' : 'text-orange-500'}`}>
              {blocker.length}/300
            </span>
          )}
        </Label>
        <Textarea
          value={blocker}
          onChange={e => setBlocker(e.target.value)}
          placeholder="진행이 막힌 기술적 문제, 대기 중인 의사결정, 필요한 리소스 등을 적어주세요..."
          rows={2}
          maxLength={320}
          className={`bg-white text-sm ${blocker.length > 300 ? 'border-red-300' : 'border-orange-200'}`}
        />
        {blocker.length > 300 && (
          <p className="text-xs text-red-500 mt-1">300자 이내로 줄여주세요</p>
        )}
        {blocker.trim() && (
          <div className="mt-2 flex items-center gap-2">
            <Checkbox
              id="needs-check"
              checked={needsFounderCheck}
              onCheckedChange={v => setNeedsFounderCheck(v === true)}
            />
            <Label htmlFor="needs-check" className="cursor-pointer text-xs text-orange-800">
              대표 확인 필요 <span className="text-orange-500">(정책 결정, 중요 질문 등)</span>
            </Label>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 선택 입력 접기 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors text-sm"
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          추가 입력 — 관련 기능 · 내일 할 일 · 파일 · 비공개 메모
          <span className="text-xs text-slate-400">(선택)</span>
        </span>
        {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showOptional && (
        <Card className="border-slate-200">
          <CardContent className="pt-5 space-y-5">
            {/* 관련 기능 */}
            {features.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">관련 기능</Label>
                <div className="flex flex-wrap gap-2">
                  {features.map(f => {
                    const active = selectedFeatures.includes(f.id)
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFeature(f.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          active
                            ? 'bg-blue-100 border-blue-400 text-blue-800 font-medium'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="font-mono">{f.order_key}</span> {f.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 내일 할 일 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">내일 할 일</Label>
              <Textarea
                value={tomorrowPlan}
                onChange={e => setTomorrowPlan(e.target.value)}
                rows={2}
                placeholder="내일 진행할 작업..."
                className="text-sm"
              />
            </div>

            {/* 읽거나 수정한 파일 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">읽거나 수정한 파일/모듈</Label>
              <Input
                value={filesModified}
                onChange={e => setFilesModified(e.target.value)}
                placeholder="src/upload/handler.ts, api/v1/photos.py 등"
                className="text-sm"
              />
            </div>

            {/* 오늘 얻은 결론 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">오늘 얻은 결론</Label>
              <Textarea
                value={conclusion}
                onChange={e => setConclusion(e.target.value)}
                rows={2}
                placeholder="오늘 확인하거나 결정된 사항..."
                className="text-sm"
              />
            </div>

            {/* 비공개 메모 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-500">
                비공개 메모
                <span className="text-xs text-slate-400 ml-1 font-normal">(대표에게 보이지 않음)</span>
              </Label>
              <Textarea
                value={privateNote}
                onChange={e => setPrivateNote(e.target.value)}
                rows={2}
                placeholder="내부 메모, 개인 기록..."
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 증빙 접기 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <button
        type="button"
        onClick={() => setShowEvidence(!showEvidence)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors text-sm"
      >
        <span className="flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          증빙자료 첨부 — PR / 커밋 / 스크린샷
          {evidenceItems.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{evidenceItems.length}건</span>
          )}
        </span>
        {showEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showEvidence && (
        <Card className="border-slate-200">
          <CardContent className="pt-4 space-y-4">
            {evidenceItems.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">증빙 {idx + 1}</Label>
                  <button
                    type="button"
                    onClick={() => setEvidenceItems(prev => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">유형</Label>
                    <select
                      value={item.type}
                      onChange={e => {
                        const updated = [...evidenceItems]
                        updated[idx] = { ...updated[idx], type: e.target.value }
                        setEvidenceItems(updated)
                      }}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                    >
                      {EVIDENCE_TYPES.map(et => (
                        <option key={et.value} value={et.value}>{et.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">링크 (선택)</Label>
                    <Input
                      value={item.url}
                      onChange={e => {
                        const updated = [...evidenceItems]
                        updated[idx] = { ...updated[idx], url: e.target.value }
                        setEvidenceItems(updated)
                      }}
                      placeholder="https://..."
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">내용</Label>
                  <Textarea
                    value={item.content}
                    onChange={e => {
                      const updated = [...evidenceItems]
                      updated[idx] = { ...updated[idx], content: e.target.value }
                      setEvidenceItems(updated)
                    }}
                    placeholder={EVIDENCE_TYPES.find(et => et.value === item.type)?.placeholder || '내용 입력...'}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEvidence} className="gap-2 w-full">
              <Plus className="w-3.5 h-3.5" />
              증빙 추가
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 제출 버튼 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Button
        type="submit"
        disabled={isSubmitting || !isValid}
        className={`w-full gap-2 h-12 text-base transition-all ${
          isValid
            ? 'bg-blue-600 hover:bg-blue-500'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
        }`}
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? '제출 중...' :
         isValid ? '오늘 보고 제출하기' :
         selectedWorkTypes.length === 0 ? '작업 유형을 선택해주세요' :
         summaryTooShort ? `요약을 ${SUMMARY_MIN}자 이상 입력해주세요` :
         summaryTooLong ? `요약을 ${SUMMARY_MAX}자 이내로 줄여주세요` :
         '오늘 작업 요약을 입력해주세요'}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        제출 후 AI 판단 보조 카드가 자동 생성되며, 대표에게 알림이 발송됩니다.
      </p>
    </form>
  )
}
