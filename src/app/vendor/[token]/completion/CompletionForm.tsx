'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { CheckSquare, Clock } from 'lucide-react'
import type { Feature } from '@/types'

interface CompletionFormProps {
  projectId: string
  accessLinkId: string
  features: Feature[]
  existingCompletions: {
    id: string
    summary: string
    vendor_note: string | null
    status: string
    created_at: string
    features: { order_key: string; name: string } | null
  }[]
  token: string
}

export default function CompletionForm({ projectId, accessLinkId, features, existingCompletions, token }: CompletionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completions, setCompletions] = useState(existingCompletions)
  const [form, setForm] = useState({
    feature_id: '',
    summary: '',
    vendor_note: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.feature_id) { toast.error('기능을 선택해주세요'); return }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/vendor/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          access_link_id: accessLinkId,
          feature_id: form.feature_id,
          summary: form.summary,
          vendor_note: form.vendor_note || null,
          token,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('완료 후보가 제출되었습니다. 대표가 검토 후 확인합니다.')
      setForm({ feature_id: '', summary: '', vendor_note: '' })
      router.refresh()
    } catch {
      toast.error('제출 실패')
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: '검수 대기', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: '✅ 완료 승인', color: 'bg-green-100 text-green-700' },
    rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
    deferred: { label: '보류', color: 'bg-gray-100 text-gray-600' },
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>완료된 기능 *</Label>
              <Select value={form.feature_id} onValueChange={(v) => setForm(p => ({ ...p, feature_id: v ?? p.feature_id }))}>
                <SelectTrigger>
                  <SelectValue placeholder="기능 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {features.map(f => (
                    <SelectItem key={f.id} value={f.id}>[{f.order_key}] {f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>완료 요약 *</Label>
              <Textarea
                value={form.summary}
                onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="어떤 작업을 완료했고, 어떻게 검증했는지 요약해 주세요..."
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>추가 메모 (선택)</Label>
              <Textarea
                value={form.vendor_note}
                onChange={e => setForm(p => ({ ...p, vendor_note: e.target.value }))}
                placeholder="검수 시 참고사항, 테스트 환경 등..."
                rows={2}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full gap-2 bg-green-600 hover:bg-green-500">
              <CheckSquare className="w-4 h-4" />
              {isSubmitting ? '제출 중...' : '완료 후보 제출'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {completions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-3">제출한 완료 후보</h2>
          <div className="space-y-3">
            {completions.map(c => {
              const config = statusConfig[c.status] || statusConfig.pending
              return (
                <Card key={c.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        {c.features && (
                          <p className="text-xs font-mono text-slate-500 mb-1">
                            [{c.features.order_key}] {c.features.name}
                          </p>
                        )}
                        <p className="text-sm text-slate-900">{c.summary}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                          <p className="text-xs text-slate-400">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(c.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                    </div>
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
