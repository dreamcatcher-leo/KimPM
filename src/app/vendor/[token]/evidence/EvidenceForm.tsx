'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus, Trash2, Upload, Link, FileText, Image,
  Video, Code, MessageSquare, GitCommit,
  AlertTriangle, Info, CheckCircle2
} from 'lucide-react'

// ── 증빙 유형 정의 ────────────────────────────────────────────────────────
const EVIDENCE_TYPES = [
  { value: 'pr',          label: 'PR/커밋',      icon: GitCommit,    description: 'GitHub PR, 커밋 링크', needsUrl: true  },
  { value: 'screenshot',  label: '스크린샷',      icon: Image,        description: '화면 캡처 이미지',    needsUrl: false },
  { value: 'url',         label: '링크',          icon: Link,         description: 'URL, 시연 링크',      needsUrl: true  },
  { value: 'code',        label: '코드',          icon: Code,         description: '코드 스니펫',         needsUrl: false },
  { value: 'video',       label: '영상',          icon: Video,        description: '화면 녹화, 영상 링크', needsUrl: true  },
  { value: 'text',        label: '텍스트',        icon: FileText,     description: '작업 내용 설명',      needsUrl: false },
  { value: 'message',     label: '메시지',        icon: MessageSquare,description: 'Discord/슬랙 캡처',  needsUrl: false },
] as const

type EvidenceType = typeof EVIDENCE_TYPES[number]['value']

// ── 글자수 상수 ──────────────────────────────────────────────────────────
const TITLE_MAX   = 60
const CONTENT_MAX = 1000

interface EvidenceItem {
  type: EvidenceType
  title: string
  content: string
  url: string
}

interface ExistingEvidence {
  id: string
  evidence_type: string
  title: string | null
  content: string | null
  url: string | null
  created_at: string
  reports: { report_date: string } | null
}

interface EvidenceFormProps {
  projectId: string
  token: string
  reports: { id: string; report_date: string; summary?: string | null; overall_status?: string }[]
  existingEvidence: ExistingEvidence[]
}

// ── 유형 아이콘 헬퍼 ─────────────────────────────────────────────────────
function typeIcon(typeVal: string) {
  return EVIDENCE_TYPES.find(t => t.value === typeVal)?.icon ?? FileText
}

// ── 단일 증빙 아이템 카드 ─────────────────────────────────────────────────
function EvidenceItemCard({
  item,
  index,
  total,
  onChange,
  onRemove,
}: {
  item: EvidenceItem
  index: number
  total: number
  onChange: (field: keyof EvidenceItem, value: string) => void
  onRemove: () => void
}) {
  const typeInfo = EVIDENCE_TYPES.find(t => t.value === item.type)
  const contentTooLong = item.content.length > CONTENT_MAX
  const titleTooLong   = item.title.length > TITLE_MAX
  const urlMissing     = typeInfo?.needsUrl && !item.url.trim()
  const contentMissing = !typeInfo?.needsUrl && !item.content.trim() && !item.url.trim()

  return (
    <Card className={`border ${
      (urlMissing || contentMissing || contentTooLong || titleTooLong)
        ? 'border-amber-300'
        : item.content || item.url ? 'border-blue-200' : 'border-slate-200'
    }`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">증빙 {index + 1}</span>
          {total > 1 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* 유형 선택 — 칩 그리드 */}
        <div>
          <Label className="text-xs text-slate-500 mb-1.5 block">증빙 유형</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {EVIDENCE_TYPES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onChange('type', t.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                    item.type === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
          {typeInfo && (
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {typeInfo.description}
            </p>
          )}
        </div>

        {/* 제목 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-slate-600">
              제목 <span className="text-slate-400">(선택)</span>
            </Label>
            {item.title.length > 0 && (
              <span className={`text-xs font-mono ${titleTooLong ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                {item.title.length}/{TITLE_MAX}
              </span>
            )}
          </div>
          <Input
            value={item.title}
            onChange={e => onChange('title', e.target.value)}
            placeholder="예: 로그인 화면 스크린샷"
            className={`text-sm ${titleTooLong ? 'border-red-400 bg-red-50' : ''}`}
            maxLength={TITLE_MAX + 5}
          />
          {titleTooLong && (
            <p className="text-xs text-red-500 mt-1">{TITLE_MAX}자 이내로 줄여주세요</p>
          )}
        </div>

        {/* URL — needsUrl 타입일 때 강조 */}
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">
            URL{' '}
            <span className={typeInfo?.needsUrl ? 'text-red-500' : 'text-slate-400'}>
              {typeInfo?.needsUrl ? '(필수)' : '(선택)'}
            </span>
          </Label>
          <Input
            value={item.url}
            onChange={e => onChange('url', e.target.value)}
            placeholder="https://..."
            className={`text-sm font-mono ${urlMissing ? 'border-amber-400 bg-amber-50' : ''}`}
          />
          {urlMissing && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              이 유형은 URL이 필요합니다
            </p>
          )}
        </div>

        {/* 내용 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-slate-600">
              내용{' '}
              <span className={(!typeInfo?.needsUrl) ? 'text-slate-500' : 'text-slate-400'}>
                {(!typeInfo?.needsUrl) ? '(필수)' : '(설명)'}
              </span>
            </Label>
            {item.content.length > 0 && (
              <span className={`text-xs font-mono ${
                contentTooLong ? 'text-red-500 font-semibold' :
                item.content.length > CONTENT_MAX * 0.85 ? 'text-amber-500' :
                'text-slate-400'
              }`}>
                {item.content.length}/{CONTENT_MAX}
              </span>
            )}
          </div>
          <Textarea
            value={item.content}
            onChange={e => onChange('content', e.target.value)}
            placeholder={
              item.type === 'code'    ? '코드 스니펫을 붙여넣으세요...' :
              item.type === 'text'    ? '작업 내용을 구체적으로 설명해주세요...' :
              item.type === 'message' ? '메시지 내용을 붙여넣으세요...' :
              '추가 설명 (선택)'
            }
            className={`text-sm resize-none ${
              item.type === 'code' ? 'font-mono text-xs' : ''
            } ${contentTooLong ? 'border-red-400 bg-red-50' : ''}`}
            rows={item.type === 'code' || item.type === 'message' ? 5 : 3}
            maxLength={CONTENT_MAX + 10}
          />
          {contentTooLong && (
            <p className="text-xs text-red-500 mt-1">{CONTENT_MAX}자 이내로 줄여주세요</p>
          )}
          {contentMissing && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              내용 또는 URL을 입력해주세요
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function EvidenceForm({
  projectId, token, reports, existingEvidence,
}: EvidenceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [evidence, setEvidence] = useState(existingEvidence)
  const [selectedReportId, setSelectedReportId] = useState(reports[0]?.id || '')
  const [items, setItems] = useState<EvidenceItem[]>([
    { type: 'pr', title: '', content: '', url: '' },
  ])

  const addItem = () => {
    setItems(prev => [...prev, { type: 'text', title: '', content: '', url: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof EvidenceItem, value: string) => {
    setItems(prev =>
      prev.map((item, i) => i === index ? { ...item, [field]: value } : item)
    )
  }

  // 유효 아이템 = content 또는 url 입력된 것
  const validItems = items.filter(item => item.content.trim() || item.url.trim())

  // 전체 에러 여부
  const hasErrors = items.some(item => {
    const typeInfo = EVIDENCE_TYPES.find(t => t.value === item.type)
    return (
      item.title.length > TITLE_MAX ||
      item.content.length > CONTENT_MAX ||
      (typeInfo?.needsUrl && !item.url.trim() && (item.content.trim() || item.url.trim()))
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (validItems.length === 0) {
      toast.error('최소 1개의 증빙 내용 또는 URL을 입력해주세요')
      return
    }
    if (hasErrors) {
      toast.error('입력 오류를 먼저 수정해주세요')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: selectedReportId || null,
          project_id: projectId,
          evidence_items: validItems,
        }),
      })
      if (!res.ok) throw new Error('제출 실패')

      toast.success(`증빙자료 ${validItems.length}건이 제출되었습니다`)

      // 목록 즉시 반영
      const selectedReport = reports.find(r => r.id === selectedReportId)
      const newItems = validItems.map(item => ({
        id: crypto.randomUUID(),
        evidence_type: item.type,
        title: item.title || null,
        content: item.content || null,
        url: item.url || null,
        created_at: new Date().toISOString(),
        reports: selectedReport ? { report_date: selectedReport.report_date } : null,
      }))
      setEvidence(prev => [...newItems, ...prev])
      setItems([{ type: 'pr', title: '', content: '', url: '' }])
    } catch {
      toast.error('제출 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 선택된 보고서 정보
  const selectedReport = reports.find(r => r.id === selectedReportId)

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 보고서 연결 (강조 개선) ── */}
        {reports.length > 0 ? (
          <Card className={`border-2 ${selectedReportId ? 'border-blue-300 bg-blue-50/30' : 'border-dashed border-slate-300'}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${selectedReportId ? 'text-blue-600' : 'text-slate-400'}`} />
                <Label className="text-sm font-semibold text-slate-700">
                  연결할 일일 보고서
                </Label>
                {selectedReportId && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs ml-auto">
                    연결됨
                  </Badge>
                )}
              </div>
              <select
                value={selectedReportId}
                onChange={e => setSelectedReportId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">보고서 없이 제출</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.report_date}
                    {r.summary ? ` — ${r.summary.slice(0, 25)}${r.summary.length > 25 ? '…' : ''}` : ''}
                  </option>
                ))}
              </select>
              {selectedReport?.report_date && (
                <p className="text-xs text-blue-700">
                  📅 {selectedReport.report_date} 보고서에 증빙이 연결됩니다 —
                  대표가 보고 검토 시 바로 확인할 수 있습니다
                </p>
              )}
              {!selectedReportId && (
                <p className="text-xs text-slate-400">
                  보고서와 연결하면 대표가 보고 검토 시 증빙을 함께 확인할 수 있습니다
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              아직 제출된 일일 보고서가 없습니다.
              증빙은 보고서 없이도 제출할 수 있지만, 일일 보고와 연결하면 관리가 더 편리합니다.
            </p>
          </div>
        )}

        {/* ── 증빙 항목 ── */}
        {items.map((item, index) => (
          <EvidenceItemCard
            key={index}
            item={item}
            index={index}
            total={items.length}
            onChange={(field, value) => updateItem(index, field, value)}
            onRemove={() => removeItem(index)}
          />
        ))}

        {/* 항목 추가 */}
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed border-slate-300 text-slate-500 hover:text-slate-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          증빙 항목 추가
        </Button>

        {/* 제출 버튼 */}
        <Button
          type="submit"
          disabled={isSubmitting || validItems.length === 0 || hasErrors}
          className={`w-full gap-2 h-11 transition-all ${
            validItems.length > 0 && !hasErrors
              ? 'bg-blue-600 hover:bg-blue-500'
              : 'bg-slate-300 text-slate-500'
          }`}
        >
          <Upload className="w-4 h-4" />
          {isSubmitting ? '제출 중...' :
           validItems.length === 0 ? '증빙 내용을 입력해주세요' :
           hasErrors ? '입력 오류를 수정해주세요' :
           `증빙 제출 (${validItems.length}건)`}
        </Button>
      </form>

      {/* ── 기존 증빙 목록 ── */}
      {evidence.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-3">
            제출된 증빙 ({evidence.length}건)
          </h2>
          <div className="space-y-2">
            {evidence.map(ev => {
              const Icon = typeIcon(ev.evidence_type)
              const typeLabel = EVIDENCE_TYPES.find(t => t.value === ev.evidence_type)?.label ?? ev.evidence_type
              return (
                <Card key={ev.id} className="border-slate-200">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <Badge className="bg-slate-100 text-slate-600 text-xs border-slate-200">
                          {typeLabel}
                        </Badge>
                        {ev.title && (
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {ev.title}
                          </span>
                        )}
                        {/* 연결된 보고서 배지 */}
                        {ev.reports ? (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs ml-auto flex-shrink-0">
                            📅 {ev.reports.report_date} 보고
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-50 text-slate-400 border-slate-200 text-xs ml-auto flex-shrink-0">
                            보고서 미연결
                          </Badge>
                        )}
                      </div>
                      {ev.content && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{ev.content}</p>
                      )}
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate block mt-0.5"
                        >
                          {ev.url}
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
                      {new Date(ev.created_at).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric',
                      })}
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
