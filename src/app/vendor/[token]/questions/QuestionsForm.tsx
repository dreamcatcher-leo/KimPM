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
import { MessageSquare, Send, CheckCircle, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import type { Feature } from '@/types'

interface Question {
  id: string
  question: string
  context: string | null
  answer: string | null
  is_resolved: boolean
  created_at: string
  question_type?: string | null
  answer_needed_by?: string | null
  schedule_impact?: string | null
  default_assumption?: string | null
}

interface QuestionsFormProps {
  projectId: string
  accessLinkId: string
  features: Feature[]
  existingQuestions: Question[]
  token: string
}

const QUESTION_MIN = 10
const QUESTION_MAX = 500
const CONTEXT_MAX = 300
const ASSUMPTION_MAX = 200

const QUESTION_TYPES = [
  { value: '정책', label: '정책 — 비즈니스 규칙/운영 방침' },
  { value: '방향', label: '방향 — 기술적/UX 방향 결정' },
  { value: '범위', label: '범위 — 포함/제외 여부 확인' },
  { value: '데이터', label: '데이터 — 데이터 구조/값 정의' },
  { value: 'API', label: 'API — 외부 서비스 연동' },
  { value: '디자인', label: '디자인 — UI/UX 상세 확인' },
]

const SCHEDULE_IMPACTS = [
  { value: '없음', label: '없음 — 일정에 영향 없음', color: 'text-green-700' },
  { value: '낮음', label: '낮음 — 1~2일 영향', color: 'text-yellow-700' },
  { value: '중간', label: '중간 — 3~5일 영향', color: 'text-orange-700' },
  { value: '높음', label: '높음 — 1주 이상 영향', color: 'text-red-700' },
]

const scheduleImpactColors: Record<string, string> = {
  '없음': 'bg-green-50 text-green-700 border-green-200',
  '낮음': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  '중간': 'bg-orange-50 text-orange-700 border-orange-200',
  '높음': 'bg-red-50 text-red-700 border-red-200',
}

const questionTypeColors: Record<string, string> = {
  '정책': 'bg-purple-50 text-purple-700 border-purple-200',
  '방향': 'bg-blue-50 text-blue-700 border-blue-200',
  '범위': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '데이터': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'API': 'bg-teal-50 text-teal-700 border-teal-200',
  '디자인': 'bg-pink-50 text-pink-700 border-pink-200',
}

export default function QuestionsForm({ projectId, accessLinkId, features, existingQuestions, token }: QuestionsFormProps) {
  const [questions, setQuestions] = useState(existingQuestions)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [questionTouched, setQuestionTouched] = useState(false)
  const [form, setForm] = useState({
    question: '',
    context: '',
    feature_id: '',
    question_type: '',
    answer_needed_by: '',
    schedule_impact: '없음',
    default_assumption: '',
  })

  // 유효성 상태
  const questionLen = form.question.trim().length
  const questionTooShort = questionTouched && questionLen > 0 && questionLen < QUESTION_MIN
  const questionTooLong = form.question.length > QUESTION_MAX
  const contextTooLong = form.context.length > CONTEXT_MAX
  const assumptionTooLong = form.default_assumption.length > ASSUMPTION_MAX
  const isFormValid = questionLen >= QUESTION_MIN && !questionTooLong && !contextTooLong && !assumptionTooLong

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuestionTouched(true)
    if (!form.question.trim()) {
      toast.error('협의 내용을 입력해주세요')
      return
    }
    if (questionLen < QUESTION_MIN) {
      toast.error(`너무 짧습니다. ${QUESTION_MIN}자 이상 입력해주세요`)
      return
    }
    if (questionTooLong) {
      toast.error(`협의 내용은 ${QUESTION_MAX}자 이내로 줄여주세요`)
      return
    }
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
          question_type: form.question_type || null,
          answer_needed_by: form.answer_needed_by || null,
          schedule_impact: form.schedule_impact || null,
          default_assumption: form.default_assumption || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestions(prev => [data.question, ...prev])
      setForm({
        question: '',
        context: '',
        feature_id: '',
        question_type: '',
        answer_needed_by: '',
        schedule_impact: '없음',
        default_assumption: '',
      })
      setQuestionTouched(false)
      setShowAdvanced(false)
      toast.success('협의 요청이 등록되었습니다')
    } catch {
      toast.error('등록 실패')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 협의 등록 폼 */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 관련 기능 선택 */}
            {features.length > 0 && (
              <div className="space-y-2">
                <Label>관련 기능 <span className="text-slate-400 text-xs">(선택)</span></Label>
                <Select value={form.feature_id} onValueChange={(v) => setForm(p => ({ ...p, feature_id: v ?? p.feature_id }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="관련 기능 선택..." />
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

            {/* 질문/협의 유형 */}
            <div className="space-y-2">
              <Label>질문 유형 <span className="text-slate-400 text-xs">(선택)</span></Label>
              <Select value={form.question_type} onValueChange={(v) => setForm(p => ({ ...p, question_type: v ?? p.question_type }))}>
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">미분류</SelectItem>
                  {QUESTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 질문 본문 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>협의 내용 <span className="text-red-500">*</span></Label>
                <span className={`text-xs font-mono ${
                  questionTooLong ? 'text-red-500 font-semibold' :
                  form.question.length > QUESTION_MAX * 0.85 ? 'text-amber-500' :
                  'text-slate-400'
                }`}>
                  {form.question.length}/{QUESTION_MAX}
                </span>
              </div>
              <Textarea
                value={form.question}
                onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                onBlur={() => setQuestionTouched(true)}
                placeholder="대표에게 확인이 필요한 내용을 적어주세요. 예) 결제 실패 시 재시도 횟수는 몇 회로 할까요?"
                rows={3}
                maxLength={QUESTION_MAX + 10}
                className={questionTooShort ? 'border-amber-400' : questionTooLong ? 'border-red-400 bg-red-50' : ''}
              />
              {questionTooShort && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  너무 짧습니다. 구체적으로 {QUESTION_MIN}자 이상 작성해주세요
                </p>
              )}
              {questionTooLong && (
                <p className="text-xs text-red-500">
                  {QUESTION_MAX}자 이내로 줄여주세요
                </p>
              )}
              {!questionTouched && !form.question && (
                <p className="text-xs text-slate-400">
                  구체적일수록 빠른 답변을 받을 수 있어요 (최소 {QUESTION_MIN}자)
                </p>
              )}
            </div>

            {/* 배경/맥락 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>배경/맥락 <span className="text-slate-400 text-xs">(선택)</span></Label>
                {form.context.length > 0 && (
                  <span className={`text-xs font-mono ${
                    contextTooLong ? 'text-red-500 font-semibold' :
                    form.context.length > CONTEXT_MAX * 0.85 ? 'text-amber-500' :
                    'text-slate-400'
                  }`}>
                    {form.context.length}/{CONTEXT_MAX}
                  </span>
                )}
              </div>
              <Textarea
                value={form.context}
                onChange={e => setForm(p => ({ ...p, context: e.target.value }))}
                placeholder="질문의 배경이나 현재 시도한 것들..."
                rows={2}
                maxLength={CONTEXT_MAX + 10}
                className={contextTooLong ? 'border-red-400 bg-red-50' : ''}
              />
              {contextTooLong && (
                <p className="text-xs text-red-500">{CONTEXT_MAX}자 이내로 줄여주세요</p>
              )}
            </div>

            {/* 고급 필드 — 접기/펼치기 */}
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAdvanced ? '상세 정보 접기' : '일정 영향 / 기본 가정 추가 (권장)'}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-3 border-l-2 border-slate-200">
                {/* 답변 필요 시점 */}
                <div className="space-y-2">
                  <Label className="text-sm">답변 필요 시점</Label>
                  <Input
                    type="date"
                    value={form.answer_needed_by}
                    onChange={e => setForm(p => ({ ...p, answer_needed_by: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400">이 날짜까지 답변이 없으면 일정이 영향을 받습니다</p>
                </div>

                {/* 일정 영향도 */}
                <div className="space-y-2">
                  <Label className="text-sm">일정 영향도</Label>
                  <Select value={form.schedule_impact} onValueChange={(v) => setForm(p => ({ ...p, schedule_impact: v ?? p.schedule_impact }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_IMPACTS.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className={s.color}>{s.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 기본 가정 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">답변 없을 경우 기본 가정</Label>
                    {form.default_assumption.length > 0 && (
                      <span className={`text-xs font-mono ${
                        assumptionTooLong ? 'text-red-500 font-semibold' :
                        form.default_assumption.length > ASSUMPTION_MAX * 0.85 ? 'text-amber-500' :
                        'text-slate-400'
                      }`}>
                        {form.default_assumption.length}/{ASSUMPTION_MAX}
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={form.default_assumption}
                    onChange={e => setForm(p => ({ ...p, default_assumption: e.target.value }))}
                    placeholder="예) 답변이 없으면 재시도 3회로 구현하고 변경 요청을 통해 수정할 예정"
                    rows={2}
                    maxLength={ASSUMPTION_MAX + 10}
                    className={assumptionTooLong ? 'border-red-400 bg-red-50' : ''}
                  />
                  {assumptionTooLong && (
                    <p className="text-xs text-red-500">{ASSUMPTION_MAX}자 이내로 줄여주세요</p>
                  )}
                  {!assumptionTooLong && (
                    <p className="text-xs text-slate-400">나중에 &quot;대표가 답을 안 줘서 임의로 했다&quot;는 상황을 방지하기 위해 사전에 기본 가정을 명시해두세요</p>
                  )}
                </div>
              </div>
            )}

            {/* 일정 영향 경고 */}
            {form.schedule_impact === '높음' && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  일정 영향도가 &apos;높음&apos;입니다. 대표에게 빠른 답변이 필요한 사항임을 알립니다.
                  기본 가정도 함께 기재해두는 것을 권장합니다.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className={`w-full gap-2 ${
                isFormValid
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? '등록 중...' :
               !questionTouched && !form.question ? '협의 요청 등록' :
               questionLen < QUESTION_MIN ? `내용을 ${QUESTION_MIN}자 이상 입력해주세요` :
               questionTooLong ? `${QUESTION_MAX}자 이내로 줄여주세요` :
               '협의 요청 등록'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 기존 협의 목록 */}
      {questions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-3">협의 기록 ({questions.length})</h2>
          <div className="space-y-3">
            {questions.map(q => (
              <Card key={q.id} className={q.answer ? 'border-green-200' : 'border-slate-200'}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 mt-0.5 ${q.answer ? 'text-green-500' : 'text-blue-500'}`} />
                    <div className="flex-1">
                      {/* 배지 행 */}
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {q.question_type && (
                          <Badge className={`text-xs border ${questionTypeColors[q.question_type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {q.question_type}
                          </Badge>
                        )}
                        {q.schedule_impact && q.schedule_impact !== '없음' && (
                          <Badge className={`text-xs border ${scheduleImpactColors[q.schedule_impact] || ''}`}>
                            일정영향 {q.schedule_impact}
                          </Badge>
                        )}
                        {q.answer_needed_by && !q.answer && (
                          <Badge className="text-xs bg-orange-50 text-orange-700 border border-orange-200">
                            <Clock className="w-3 h-3 mr-1" />
                            {q.answer_needed_by}까지
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-slate-900 font-medium">{q.question}</p>
                      {q.context && <p className="text-xs text-slate-500 mt-1">{q.context}</p>}

                      {/* 기본 가정 */}
                      {q.default_assumption && !q.answer && (
                        <div className="mt-1.5 bg-slate-50 rounded p-2">
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-600">기본 가정:</span> {q.default_assumption}
                          </p>
                        </div>
                      )}

                      {/* 답변 */}
                      {q.answer ? (
                        <div className="mt-2 bg-green-50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium text-green-700">대표 답변</span>
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
