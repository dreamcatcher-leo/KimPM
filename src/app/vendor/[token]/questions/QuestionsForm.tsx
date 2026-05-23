'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { MessageSquare, Send, CheckCircle } from 'lucide-react'
import type { Feature } from '@/types'

interface Question {
  id: string
  question: string
  context: string | null
  answer: string | null
  is_resolved: boolean
  created_at: string
}

interface QuestionsFormProps {
  projectId: string
  accessLinkId: string
  features: Feature[]
  existingQuestions: Question[]
  token: string
}

export default function QuestionsForm({ projectId, accessLinkId, features, existingQuestions, token }: QuestionsFormProps) {
  const [questions, setQuestions] = useState(existingQuestions)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    question: '',
    context: '',
    feature_id: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vendor/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          access_link_id: accessLinkId,
          question: form.question,
          context: form.context || null,
          feature_id: form.feature_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestions(prev => [data.question, ...prev])
      setForm({ question: '', context: '', feature_id: '' })
      toast.success('질문이 등록되었습니다')
    } catch {
      toast.error('등록 실패')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* New Question Form */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {features.length > 0 && (
              <div className="space-y-2">
                <Label>관련 기능 (선택)</Label>
                <Select value={form.feature_id} onValueChange={(v) => setForm(p => ({ ...p, feature_id: v ?? p.feature_id }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="기능 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">없음</SelectItem>
                    {features.map(f => (
                      <SelectItem key={f.id} value={f.id}>[{f.order_key}] {f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>질문 *</Label>
              <Textarea
                value={form.question}
                onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                placeholder="개발 중 궁금한 점을 질문해 주세요..."
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>배경/맥락 (선택)</Label>
              <Textarea
                value={form.context}
                onChange={e => setForm(p => ({ ...p, context: e.target.value }))}
                placeholder="질문의 배경이나 현재 시도한 것들..."
                rows={2}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full gap-2 bg-blue-600 hover:bg-blue-500">
              <Send className="w-4 h-4" />
              {isSubmitting ? '등록 중...' : '질문 등록'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Questions */}
      {questions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-3">등록한 질문 ({questions.length})</h2>
          <div className="space-y-3">
            {questions.map(q => (
              <Card key={q.id}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{q.question}</p>
                      {q.context && <p className="text-xs text-slate-500 mt-1">{q.context}</p>}
                      {q.answer ? (
                        <div className="mt-2 bg-green-50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium text-green-700">답변</span>
                          </div>
                          <p className="text-sm text-green-800">{q.answer}</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="mt-2 text-xs">답변 대기 중</Badge>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(q.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
