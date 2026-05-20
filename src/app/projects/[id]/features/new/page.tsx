'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NewFeaturePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    order_key: '',
    name: '',
    category: '신규_개발',
    priority_group: 'P1',
    description: '',
    expected_effect: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('features')
        .insert({ ...form, project_id: params.id })
        .select()
        .single()

      if (error) throw error
      toast.success('기능이 추가되었습니다')
      router.push(`/projects/${params.id}/features/${data.id}/spec`)
    } catch (err) {
      toast.error('기능 추가 실패')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link href={`/projects/${params.id}/features`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        기능 목록으로
      </Link>
      <h2 className="text-xl font-bold text-slate-900 mb-6">기능 추가</h2>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>순서 코드 *</Label>
                <Input
                  value={form.order_key}
                  onChange={e => setForm(p => ({ ...p, order_key: e.target.value }))}
                  placeholder="P0-1, P1-3 등"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>우선순위 그룹 *</Label>
                <Select value={form.priority_group} onValueChange={(v) => setForm(p => ({ ...p, priority_group: v ?? p.priority_group }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['P0', 'P1', 'P2', 'P3'].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>기능명 *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="업로드·촬영 장애 핫픽스"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>현재상태 (분류) *</Label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v ?? p.category }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: '신규_개발', label: '신규 개발' },
                    { value: '기존_보완', label: '기존 보완' },
                    { value: '신규_개발_기존_보완', label: '신규 개발 · 기존 보완' },
                    { value: '정책_반영', label: '정책 반영' },
                    { value: '어드민_기능', label: '어드민 기능' },
                    { value: '후순위_보류', label: '후순위 보류' },
                  ].map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>상세 설명 *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="이 기능이 무엇을 하는지 설명..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>기대 효과</Label>
              <Textarea
                value={form.expected_effect}
                onChange={e => setForm(p => ({ ...p, expected_effect: e.target.value }))}
                placeholder="이 기능을 통해 기대되는 효과..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-4">
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-500">
            {isLoading ? '저장 중...' : '기능 저장'}
          </Button>
          <Link href={`/projects/${params.id}/features`}>
            <Button type="button" variant="outline">취소</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
