'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Send, Plus, Paperclip, ChevronDown, ChevronUp } from 'lucide-react'
import type { Feature } from '@/types'

const WORK_TYPES = [
  { value: '코드_구현', label: '코드 구현' },
  { value: '레거시_분석', label: '레거시 분석' },
  { value: '기획_정책_정리', label: '기획·정책 정리' },
  { value: '버그_재현_원인_분석', label: '버그 재현·원인 분석' },
  { value: '테스트_QA', label: '테스트·QA' },
  { value: '배포_준비', label: '배포 준비' },
  { value: '의사결정_대기', label: '의사결정 대기' },
  { value: '외부_API_검토', label: '외부 API 검토' },
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

interface ReportFormProps {
  projectId: string
  accessLinkId: string
  reportDate: string
  features: Feature[]
  token: string
}

export default function ReportForm({ projectId, accessLinkId, reportDate, features, token }: ReportFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)

  // Required fields
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [blocker, setBlocker] = useState('')

  // Optional fields
  const [filesModified, setFilesModified] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [needsFounderCheck, setNeedsFounderCheck] = useState(false)
  const [privateNote, setPrivateNote] = useState('')

  // Evidence
  const [evidenceItems, setEvidenceItems] = useState<{ type: string; title: string; content: string; url: string }[]>([])

  const toggleWorkType = (type: string) => {
    setSelectedWorkTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const addEvidence = () => {
    setEvidenceItems(prev => [...prev, { type: '코드_증빙', title: '', content: '', url: '' }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedWorkTypes.length === 0) {
      toast.error('작업 유형을 하나 이상 선택해주세요')
      return
    }
    if (!summary.trim()) {
      toast.error('한 줄 요약을 입력해주세요')
      return
    }

    setIsSubmitting(true)
    try {
      // Submit report
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

      // Submit evidence if any
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

      // Submit private note if any
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
      router.push(`/vendor/${token}`)
    } catch (err) {
      toast.error('제출 실패: ' + (err instanceof Error ? err.message : '오류'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* REQUIRED SECTION */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">필</span>
            필수 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Work Types */}
          <div className="space-y-2">
            <Label className="font-medium">1. 작업 유형 <span className="text-red-500">*</span></Label>
            <p className="text-xs text-slate-500">해당하는 것을 모두 선택해 주세요</p>
            <div className="grid grid-cols-2 gap-2">
              {WORK_TYPES.map(wt => (
                <div
                  key={wt.value}
                  onClick={() => toggleWorkType(wt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedWorkTypes.includes(wt.value)
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selectedWorkTypes.includes(wt.value) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                    {selectedWorkTypes.includes(wt.value) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5L2 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs">{wt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Related Features */}
          <div className="space-y-2">
            <Label className="font-medium">2. 관련 기능 <span className="text-slate-400 font-normal text-xs">(선택)</span></Label>
            <div className="flex flex-wrap gap-2">
              {features.map(f => (
                <div
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                    selectedFeatures.includes(f.id)
                      ? 'bg-blue-100 border-blue-400 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="font-mono">{f.order_key}</span>
                  <span>{f.name}</span>
                </div>
              ))}
              {features.length === 0 && (
                <p className="text-xs text-slate-400">승인된 기능이 없습니다</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-2">
            <Label className="font-medium">3. 한 줄 요약 <span className="text-red-500">*</span></Label>
            <p className="text-xs text-slate-500">오늘 가장 중요하게 한 일을 짧게 요약해 주세요</p>
            <Input
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="예: P0-1 이미지 업로드 실패 원인 파악 및 핫픽스 코드 작성"
              required
            />
          </div>

          <Separator />

          {/* Blocker */}
          <div className="space-y-2">
            <Label className="font-medium">4. 막힌 점 <span className="text-slate-400 font-normal text-xs">(없으면 비워두세요)</span></Label>
            <Textarea
              value={blocker}
              onChange={e => setBlocker(e.target.value)}
              placeholder="현재 진행에 어려움이 있다면 간단히 설명해 주세요..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* OPTIONAL SECTION */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          선택 입력 {showOptional ? '접기' : '펼치기'}
        </button>

        {showOptional && (
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label>읽거나 수정한 파일/모듈</Label>
                <Input
                  value={filesModified}
                  onChange={e => setFilesModified(e.target.value)}
                  placeholder="src/upload/handler.ts, api/v1/photos.py 등"
                />
              </div>
              <div className="space-y-2">
                <Label>오늘 얻은 결론</Label>
                <Textarea
                  value={conclusion}
                  onChange={e => setConclusion(e.target.value)}
                  rows={2}
                  placeholder="오늘 확인하거나 결정된 사항..."
                />
              </div>
              <div className="space-y-2">
                <Label>내일 할 일</Label>
                <Textarea
                  value={tomorrowPlan}
                  onChange={e => setTomorrowPlan(e.target.value)}
                  rows={2}
                  placeholder="내일 진행할 작업..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="needs-check"
                  checked={needsFounderCheck}
                  onCheckedChange={v => setNeedsFounderCheck(v === true)}
                />
                <Label htmlFor="needs-check" className="cursor-pointer">
                  대표 확인 필요
                  <span className="text-xs text-slate-400 ml-1">(정책 결정, 중요 질문 등)</span>
                </Label>
              </div>
              <div className="space-y-2">
                <Label>비공개 메모 <span className="text-xs text-slate-400">(대표에게 보이지 않음)</span></Label>
                <Textarea
                  value={privateNote}
                  onChange={e => setPrivateNote(e.target.value)}
                  rows={2}
                  placeholder="내부 메모, 개인 기록..."
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* EVIDENCE SECTION */}
      <div>
        <button
          type="button"
          onClick={() => setShowEvidence(!showEvidence)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          {showEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <Paperclip className="w-3.5 h-3.5" />
          증빙자료 첨부 {showEvidence ? '접기' : '펼치기'}
          <span className="text-xs text-slate-400">(PR이 없어도 텍스트 붙여넣기 가능)</span>
        </button>

        {showEvidence && (
          <Card>
            <CardContent className="pt-4 space-y-4">
              {evidenceItems.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">증빙 {idx + 1}</Label>
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
                      <Label className="text-xs">제목/링크 (선택)</Label>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEvidence}
                className="gap-2 w-full"
              >
                <Plus className="w-3.5 h-3.5" />
                증빙 추가
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-500 gap-2 h-12 text-base"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? '제출 중...' : '보고 제출하기'}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        제출 후 AI 판단 보조 카드가 자동으로 생성되며, 대표에게 Discord 알림이 발송됩니다.
      </p>
    </form>
  )
}
