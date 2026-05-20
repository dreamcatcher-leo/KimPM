'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, Upload, Link, FileText, Image, Video, Code, MessageSquare, GitCommit } from 'lucide-react'

const EVIDENCE_TYPES = [
  { value: 'screenshot', label: '스크린샷', icon: Image, description: '화면 캡처 이미지' },
  { value: 'url', label: '링크', icon: Link, description: 'URL, 시연 링크' },
  { value: 'text', label: '텍스트 설명', icon: FileText, description: '작업 내용 설명' },
  { value: 'video', label: '영상', icon: Video, description: '화면 녹화, 영상 링크' },
  { value: 'code', label: '코드', icon: Code, description: '코드 스니펫, PR 링크' },
  { value: 'pr', label: 'PR/커밋', icon: GitCommit, description: 'GitHub PR, 커밋 링크' },
  { value: 'message', label: '메시지 첨부', icon: MessageSquare, description: 'Discord, 슬랙 캡처' },
] as const

type EvidenceType = typeof EVIDENCE_TYPES[number]['value']

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
  reports: { id: string; report_date: string; overall_status: string }[]
  existingEvidence: ExistingEvidence[]
}

export default function EvidenceForm({ projectId, token, reports, existingEvidence }: EvidenceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState(reports[0]?.id || '')
  const [items, setItems] = useState<EvidenceItem[]>([
    { type: 'text', title: '', content: '', url: '' },
  ])

  const addItem = () => {
    setItems(prev => [...prev, { type: 'text', title: '', content: '', url: '' }])
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof EvidenceItem, value: string) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = items.filter(item => item.content || item.url)
    if (validItems.length === 0) {
      toast.error('최소 1개의 증빙 내용을 입력해주세요.')
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

      toast.success(`증빙자료 ${validItems.length}건이 제출되었습니다.`)
      setItems([{ type: 'text', title: '', content: '', url: '' }])
    } catch {
      toast.error('제출 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const evidenceTypeIcon = (type: string) => {
    const found = EVIDENCE_TYPES.find(t => t.value === type)
    if (!found) return FileText
    return found.icon
  }

  return (
    <div className="space-y-6">
      {/* 증빙 제출 폼 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 보고서 연결 */}
        {reports.length > 0 && (
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">연결할 보고서</Label>
              <select
                value={selectedReportId}
                onChange={e => setSelectedReportId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">보고서 없이 제출</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.report_date} ({r.overall_status === 'on_track' ? '정상' : r.overall_status === 'at_risk' ? '주의' : '블록'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">증빙을 연결할 일일 보고서를 선택하세요.</p>
            </CardContent>
          </Card>
        )}

        {/* 증빙 항목 */}
        {items.map((item, index) => {
          const TypeIcon = EVIDENCE_TYPES.find(t => t.value === item.type)?.icon || FileText
          return (
            <Card key={index} className="border border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">증빙 {index + 1}</span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* 유형 선택 */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">증빙 유형</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EVIDENCE_TYPES.map(type => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => updateItem(index, 'type', type.value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                            item.type === type.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{type.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 제목 */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">제목 (선택)</Label>
                  <Input
                    value={item.title}
                    onChange={e => updateItem(index, 'title', e.target.value)}
                    placeholder="예: 로그인 화면 스크린샷"
                    className="text-sm"
                  />
                </div>

                {/* URL */}
                {(item.type === 'url' || item.type === 'video' || item.type === 'pr' || item.type === 'screenshot') && (
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">
                      URL {(item.type === 'url' || item.type === 'pr') ? '(필수)' : '(선택)'}
                    </Label>
                    <Input
                      value={item.url}
                      onChange={e => updateItem(index, 'url', e.target.value)}
                      placeholder="https://..."
                      className="text-sm font-mono"
                    />
                  </div>
                )}

                {/* 내용 */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">
                    내용 {(item.type === 'text' || item.type === 'code' || item.type === 'message') ? '(필수)' : '(설명)'}
                  </Label>
                  <Textarea
                    value={item.content}
                    onChange={e => updateItem(index, 'content', e.target.value)}
                    placeholder={
                      item.type === 'code' ? '코드 스니펫을 붙여넣으세요...' :
                      item.type === 'text' ? '작업 내용을 설명해주세요...' :
                      item.type === 'message' ? '메시지 내용을 붙여넣으세요...' :
                      '추가 설명 (선택)'
                    }
                    className={`text-sm resize-none ${item.type === 'code' ? 'font-mono text-xs' : ''}`}
                    rows={item.type === 'code' || item.type === 'message' ? 5 : 3}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* 항목 추가 */}
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed border-gray-300 text-gray-500 hover:text-gray-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          증빙 항목 추가
        </Button>

        {/* 제출 버튼 */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isSubmitting ? '제출 중...' : `증빙 제출 (${items.filter(i => i.content || i.url).length}건)`}
        </Button>
      </form>

      {/* 기존 증빙 목록 */}
      {existingEvidence.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">제출된 증빙 ({existingEvidence.length}건)</h2>
          <div className="space-y-2">
            {existingEvidence.map(ev => {
              const Icon = evidenceTypeIcon(ev.evidence_type)
              return (
                <Card key={ev.id} className="border border-gray-200">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-800">
                          {ev.title || EVIDENCE_TYPES.find(t => t.value === ev.evidence_type)?.label || ev.evidence_type}
                        </span>
                        {ev.reports && (
                          <Badge className="bg-gray-100 text-gray-500 text-xs">{ev.reports.report_date}</Badge>
                        )}
                      </div>
                      {ev.content && (
                        <p className="text-xs text-gray-500 line-clamp-2">{ev.content}</p>
                      )}
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate block"
                        >
                          {ev.url}
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(ev.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
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
