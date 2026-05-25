'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Lock, StickyNote, AlertTriangle } from 'lucide-react'

// ── 상수 ─────────────────────────────────────────────────────────────────
const NOTE_MIN = 5
const NOTE_MAX = 500

// ── 카테고리 정의 ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'internal', label: '내부 메모',   emoji: '📝', color: 'bg-slate-100  text-slate-600  border-slate-300'  },
  { value: 'concern',  label: '우려사항',    emoji: '⚠️', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'question', label: '확인 필요',   emoji: '❓', color: 'bg-blue-100   text-blue-700   border-blue-300'   },
  { value: 'idea',     label: '아이디어',    emoji: '💡', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'blocker',  label: '블로커',      emoji: '🚫', color: 'bg-red-100    text-red-700    border-red-300'    },
]

interface PrivateNote {
  id: string
  note: string
  category: string | null
  created_at: string
}

interface PrivateNotesClientProps {
  projectId: string
  accessLinkId: string
  token: string
  initialNotes: PrivateNote[]
}

function getCategoryConfig(category: string | null) {
  return CATEGORIES.find(c => c.value === category) ?? CATEGORIES[0]
}

export default function PrivateNotesClient({
  projectId,
  accessLinkId,
  token,
  initialNotes,
}: PrivateNotesClientProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [noteTouched, setNoteTouched] = useState(false)

  // 필터 상태 ('all' or category value)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [form, setForm] = useState({ note: '', category: 'internal' })

  // ── 유효성 ──
  const noteLen = form.note.trim().length
  const noteTooShort = noteTouched && noteLen > 0 && noteLen < NOTE_MIN
  const noteTooLong  = form.note.length > NOTE_MAX
  const isValid = noteLen >= NOTE_MIN && !noteTooLong

  // ── 필터된 메모 ──
  const filteredNotes = useMemo(() => {
    if (filterCategory === 'all') return notes
    return notes.filter(n => (n.category ?? 'internal') === filterCategory)
  }, [notes, filterCategory])

  // ── 카테고리별 카운트 ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length }
    for (const n of notes) {
      const c = n.category ?? 'internal'
      counts[c] = (counts[c] || 0) + 1
    }
    return counts
  }, [notes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNoteTouched(true)

    if (!form.note.trim()) {
      toast.error('메모 내용을 입력해주세요')
      return
    }
    if (noteLen < NOTE_MIN) {
      toast.error(`메모를 ${NOTE_MIN}자 이상 작성해주세요`)
      return
    }
    if (noteTooLong) {
      toast.error(`메모는 ${NOTE_MAX}자 이내로 작성해주세요`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vendor/private-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          project_id: projectId,
          access_link_id: accessLinkId,
          note: form.note,
          category: form.category,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '제출 실패')
      }
      const data = await res.json()

      setNotes(prev => [{
        id: data.id || crypto.randomUUID(),
        note: form.note,
        category: form.category,
        created_at: new Date().toISOString(),
      }, ...prev])

      toast.success('메모가 저장되었습니다')
      setForm({ note: '', category: 'internal' })
      setNoteTouched(false)
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── 새 메모 작성 버튼 / 폼 ── */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 메모 작성
        </Button>
      ) : (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* 유형 선택 칩 */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">메모 유형</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        form.category === cat.value
                          ? `${cat.color} border-current scale-105 shadow-sm`
                          : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 메모 내용 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-700">메모 내용</Label>
                  <span className={`text-xs font-mono ${
                    noteTooLong ? 'text-red-500 font-semibold' :
                    form.note.length > NOTE_MAX * 0.85 ? 'text-amber-500' :
                    'text-slate-400'
                  }`}>
                    {form.note.length}/{NOTE_MAX}
                  </span>
                </div>
                <Textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  onBlur={() => setNoteTouched(true)}
                  placeholder="내부 메모를 자유롭게 작성하세요. 대표에게는 공개되지 않습니다."
                  className={`resize-none text-sm min-h-[100px] ${
                    noteTooLong ? 'border-red-400 bg-red-50' :
                    noteTooShort ? 'border-amber-400' : ''
                  }`}
                  maxLength={NOTE_MAX + 10}
                  autoFocus
                />
                {noteTooShort && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {NOTE_MIN}자 이상 입력해주세요
                  </p>
                )}
                {noteTooLong && (
                  <p className="text-xs text-red-500">{NOTE_MAX}자 이내로 줄여주세요</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className={`flex-1 gap-1.5 transition-all ${
                    isValid
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-300 text-slate-500'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isSubmitting ? '저장 중...' :
                   noteLen < NOTE_MIN ? `${NOTE_MIN}자 이상 입력해주세요` :
                   '비공개 저장'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setForm({ note: '', category: 'internal' })
                    setNoteTouched(false)
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── 카테고리 필터 탭 (메모가 있을 때만) ── */}
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {/* 전체 */}
          <button
            onClick={() => setFilterCategory('all')}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              filterCategory === 'all'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
            }`}
          >
            전체 ({categoryCounts.all})
          </button>
          {/* 카테고리별 — 메모가 있는 것만 표시 */}
          {CATEGORIES.filter(cat => (categoryCounts[cat.value] ?? 0) > 0).map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filterCategory === cat.value
                  ? `${cat.color} border-current scale-105`
                  : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
              }`}
            >
              {cat.emoji} {cat.label} ({categoryCounts[cat.value] ?? 0})
            </button>
          ))}
        </div>
      )}

      {/* ── 메모 목록 ── */}
      {notes.length === 0 ? (
        <Card className="border border-dashed border-slate-200">
          <CardContent className="p-10 text-center">
            <StickyNote className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">아직 작성된 메모가 없습니다</p>
            <p className="text-xs text-slate-300 mt-1">
              프로젝트 진행 중 내부 메모를 자유롭게 남겨보세요.
            </p>
          </CardContent>
        </Card>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="text-sm">이 유형의 메모가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500">
              저장된 메모
            </h2>
            <span className="text-xs text-slate-400">
              {filterCategory === 'all' ? `${notes.length}건` : `${filteredNotes.length}/${notes.length}건`}
            </span>
          </div>
          {filteredNotes.map(note => {
            const catConfig = getCategoryConfig(note.category)
            return (
              <Card
                key={note.id}
                className="border border-slate-200 hover:shadow-sm transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-300" />
                      <Badge className={`text-xs border ${catConfig.color}`}>
                        {catConfig.emoji} {catConfig.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(note.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {note.note}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
