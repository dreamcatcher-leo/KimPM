'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { GitBranch, Send } from 'lucide-react'

export default function VendorChangeRequestPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    reason: '',
    affected_features: '',
    schedule_impact: '',
    cost_impact: '',
    alternative: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vendor/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token: params.token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('범위 변경 요청이 제출되었습니다. 대표가 검토 후 승인/반려를 회신드립니다.')
      router.push(`/vendor/${params.token}`)
    } catch (err) {
      toast.error('제출 실패')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
        <GitBranch className="w-5 h-5" />
        범위 변경 요청
      </h1>
      <p className="text-sm text-slate-500 mb-2">개발 범위·일정 변경이 필요할 때 대표에게 먼저 승인을 받으세요</p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-6">
        <p className="text-xs text-amber-700">
          ⚠️ 승인 전에 범위 밖의 작업을 시작하면 비용·일정 분쟁이 생길 수 있습니다. 반드시 승인 후 착수해 주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>변경 요청 제목 *</Label>
              <Input name="title" value={form.title} onChange={handleChange} placeholder="P0-3 강아지 프로필 분리 범위 조정" required />
            </div>
            <div className="space-y-2">
              <Label>변경 내용 *</Label>
              <Textarea name="content" value={form.content} onChange={handleChange} rows={4} placeholder="어떤 부분을 어떻게 변경하고 싶은지 설명해 주세요..." required />
            </div>
            <div className="space-y-2">
              <Label>변경 사유 *</Label>
              <Textarea name="reason" value={form.reason} onChange={handleChange} rows={2} placeholder="이 변경이 필요한 이유..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>영향 받는 기능</Label>
                <Input name="affected_features" value={form.affected_features} onChange={handleChange} placeholder="P0-3, P1-2 등" />
              </div>
              <div className="space-y-2">
                <Label>일정 영향</Label>
                <Input name="schedule_impact" value={form.schedule_impact} onChange={handleChange} placeholder="예: 1주 추가 필요" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>비용 영향</Label>
                <Input name="cost_impact" value={form.cost_impact} onChange={handleChange} placeholder="없음 / 추가 협의 필요" />
              </div>
              <div className="space-y-2">
                <Label>대안 (있을 경우)</Label>
                <Input name="alternative" value={form.alternative} onChange={handleChange} placeholder="대안적 접근 방식..." />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full gap-2 bg-blue-600 hover:bg-blue-500">
              <Send className="w-4 h-4" />
              {isSubmitting ? '제출 중...' : '범위 변경 요청 제출'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
