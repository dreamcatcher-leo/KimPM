'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Send, CheckCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'

interface VendorSpecReviewFormProps {
  specId: string
  featureName: string
  projectId: string
  /** 이미 제출된 수정 제안이 있으면 표시 */
  existingReview?: string | null
}

export default function VendorSpecReviewForm({
  specId,
  featureName,
  projectId,
  existingReview,
}: VendorSpecReviewFormProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 10) {
      toast.error('수정 제안을 10자 이상 입력해주세요')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/vendor/spec-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec_id: specId,
          project_id: projectId,
          review: text,
          feature_name: featureName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '제출 실패')
      setSubmitted(true)
      setText('')
      toast.success('수정 제안이 대표에게 전달되었습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '제출 실패')
    } finally {
      setSubmitting(false)
    }
  }

  // 이미 제출된 제안 표시
  if (submitted || existingReview) {
    return (
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-xs font-semibold text-green-700">수정 제안 제출 완료</span>
        </div>
        {existingReview && (
          <p className="text-xs text-slate-600 bg-green-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
            {existingReview}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1.5">
          대표가 검토 후 최종 승인합니다.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          수정 제안 작성하기
          <span className="text-xs font-normal text-orange-500">(내용이 다르거나 수정이 필요한 경우)</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700 leading-relaxed">
            <p className="font-semibold mb-0.5">✏️ 수정 제안 작성 안내</p>
            <p>
              정의서에서 수정이 필요한 부분을 구체적으로 작성해주세요.
              제출 후 대표가 검토하고 최종 승인합니다.
            </p>
          </div>

          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`예)\n- 포함 범위: '결제 실패 시 재시도' 항목을 추가해주세요\n- 화면 흐름: 3단계에서 취소 버튼 위치가 불명확합니다\n- 수용 기준: 응답 시간을 2초 → 3초로 조정 요청합니다`}
            rows={5}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs font-mono ${text.length < 10 ? 'text-slate-400' : 'text-slate-600'}`}>
              {text.length}자 {text.length < 10 ? `(최소 10자)` : ''}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setOpen(false); setText('') }}
                className="text-xs"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || text.trim().length < 10}
                className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-xs text-white"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? '제출 중...' : '수정 제안 제출'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
