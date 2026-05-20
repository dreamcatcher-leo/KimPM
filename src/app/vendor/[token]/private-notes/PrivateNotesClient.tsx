'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Lock, Trash2, StickyNote } from 'lucide-react'

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

const CATEGORIES = [
  { value: 'internal', label: '내부 메모', color: 'bg-gray-100 text-gray-600' },
  { value: 'concern', label: '우려사항', color: 'bg-orange-100 text-orange-700' },
  { value: 'question', label: '확인 필요', color: 'bg-blue-100 text-blue-700' },
  { value: 'idea', label: '아이디어', color: 'bg-purple-100 text-purple-700' },
  { value: 'blocker', label: '블로커', color: 'bg-red-100 text-red-700' },
]

export default function PrivateNotesClient({
  projectId,
  accessLinkId,
  token,
  initialNotes,
}: PrivateNotesClientProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    note: '',
    category: 'internal',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.note.trim()) {
      toast.error('메모 내용을 입력해주세요.')
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

      // 목록에 추가
      setNotes(prev => [{
        id: data.id || crypto.randomUUID(),
        note: form.note,
        category: form.category,
        created_at: new Date().toISOString(),
      }, ...prev])

      toast.success('메모가 저장되었습니다.')
      setForm({ note: '', category: 'internal' })
      setShowForm(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '오류가 발생했습니다.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryConfig = (category: string | null) =>
    CATEGORIES.find(c => c.value === category) || CATEGORIES[0]

  return (
    <div className="space-y-4">
      {/* 작성 버튼 / 폼 */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 메모 작성
        </Button>
      ) : (
        <Card className="border border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">메모 유형</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        form.category === cat.value
                          ? `${cat.color} border-current scale-105`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1 block">메모 내용</Label>
                <Textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="내부 메모를 자유롭게 작성하세요. Founder에게는 공개되지 않습니다."
                  className="resize-none text-sm min-h-[100px]"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  {isSubmitting ? '저장 중...' : '비공개 저장'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setForm({ note: '', category: 'internal' })
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 메모 목록 */}
      {notes.length === 0 ? (
        <Card className="border border-dashed border-gray-200">
          <CardContent className="p-10 text-center">
            <StickyNote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">아직 작성된 메모가 없습니다.</p>
            <p className="text-xs text-gray-300 mt-1">
              프로젝트 진행 중 내부 메모를 자유롭게 남겨보세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-600">저장된 메모</h2>
            <span className="text-xs text-gray-400">{notes.length}건</span>
          </div>
          {notes.map(note => {
            const catConfig = getCategoryConfig(note.category)
            return (
              <Card key={note.id} className="border border-gray-200 hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-gray-300" />
                      <Badge className={`text-xs ${catConfig.color}`}>
                        {catConfig.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(note.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.note}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
