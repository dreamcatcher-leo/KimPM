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
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// 글자수 제한 상수
const NAME_MAX = 60
const ORDER_KEY_MAX = 10
const DESCRIPTION_MIN = 10
const DESCRIPTION_MAX = 500
const EFFECT_MAX = 200

export default function NewFeaturePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const [form, setForm] = useState({
    order_key: '',
    name: '',
    category: '신규_개발',
    priority_group: 'P1',
    description: '',
    expected_effect: '',
  })

  // 유효성 검사
  const errors = {
    order_key: touched && !form.order_key.trim(),
    order_key_too_long: form.order_key.length > ORDER_KEY_MAX,
    name: touched && !form.name.trim(),
    name_too_long: form.name.length > NAME_MAX,
    description: touched && form.description.trim().length < DESCRIPTION_MIN,
    description_too_long: form.description.length > DESCRIPTION_MAX,
    effect_too_long: form.expected_effect.length > EFFECT_MAX,
  }
  const hasError = errors.order_key || errors.name || errors.description || errors.description_too_long || errors.name_too_long || errors.order_key_too_long || errors.effect_too_long

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (hasError || errors.order_key || errors.name || errors.description) {
      toast.error('입력 내용을 확인해주세요')
      return
    }
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
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">기능 직접 추가</h2>
        <p className="text-sm text-slate-500 mt-1">개발이 필요한 기능을 하나씩 등록합니다. 저장 후 AI 기획서 초안을 자동 생성할 수 있어요.</p>
      </div>

      {/* 안내 배너 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          기능명과 설명만 입력해도 됩니다. AI가 기획서 초안을 만들어드리며, 이후 언제든 수정할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-700">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 기능 번호 + 우선순위 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    기능 번호 <span className="text-red-500">*</span>
                    <span className="text-slate-400 text-xs font-normal ml-1">예: P0-1, P1-3</span>
                  </Label>
                  <span className={`text-xs ${errors.order_key_too_long ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                    {form.order_key.length}/{ORDER_KEY_MAX}
                  </span>
                </div>
                <Input
                  value={form.order_key}
                  onChange={e => setForm(p => ({ ...p, order_key: e.target.value }))}
                  placeholder="P0-1"
                  maxLength={ORDER_KEY_MAX + 2}
                  className={errors.order_key || errors.order_key_too_long ? 'border-red-400 bg-red-50' : ''}
                />
                {errors.order_key && <p className="text-xs text-red-500">기능 번호를 입력해주세요</p>}
                {errors.order_key_too_long && <p className="text-xs text-red-500">너무 깁니다 ({ORDER_KEY_MAX}자 이내)</p>}
                <p className="text-xs text-slate-400">
                  P0 = MVP 필수, P1 = 중요, P2 = 보통, P3 = 후순위
                </p>
              </div>
              <div className="space-y-2">
                <Label>우선순위 그룹 <span className="text-red-500">*</span></Label>
                <Select value={form.priority_group} onValueChange={(v) => setForm(p => ({ ...p, priority_group: v ?? p.priority_group }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0"><span className="text-red-600 font-semibold">P0</span> — MVP 필수 (없으면 서비스 불가)</SelectItem>
                    <SelectItem value="P1"><span className="text-orange-600 font-semibold">P1</span> — 중요 (주요 기능)</SelectItem>
                    <SelectItem value="P2"><span className="text-yellow-600 font-semibold">P2</span> — 보통 (있으면 좋음)</SelectItem>
                    <SelectItem value="P3"><span className="text-slate-500 font-semibold">P3</span> — 후순위 (나중에)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 기능명 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>기능명 <span className="text-red-500">*</span></Label>
                <span className={`text-xs ${errors.name_too_long ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                  {form.name.length}/{NAME_MAX}
                </span>
              </div>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="예: 회원가입 / 카카오페이 결제 연동 / 주문 상태 실시간 추적"
                maxLength={NAME_MAX + 10}
                className={errors.name || errors.name_too_long ? 'border-red-400 bg-red-50' : ''}
              />
              {errors.name && <p className="text-xs text-red-500">기능명을 입력해주세요</p>}
              {errors.name_too_long && <p className="text-xs text-red-500">기능명이 너무 깁니다 ({NAME_MAX}자 이내). 간결하게 줄여주세요</p>}
            </div>

            {/* 기능 유형 */}
            <div className="space-y-2">
              <Label>기능 유형 <span className="text-red-500">*</span></Label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v ?? p.category }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="신규_개발">🆕 신규 개발 — 처음 만드는 기능</SelectItem>
                  <SelectItem value="기존_보완">🔧 기존 개선 — 이미 있는 기능을 수정/보완</SelectItem>
                  <SelectItem value="신규_개발_기존_보완">🔀 신규 + 개선 — 새 기능이면서 기존도 수정</SelectItem>
                  <SelectItem value="정책_반영">📋 정책 반영 — 법령·정책 준수 대응</SelectItem>
                  <SelectItem value="어드민_기능">🛠️ 관리자 기능 — 내부 운영용</SelectItem>
                  <SelectItem value="후순위_보류">⏸️ 보류 — 이번 범위 제외, 나중에 재검토</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 상세 설명 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  기능 설명 <span className="text-red-500">*</span>
                  <span className="text-slate-400 text-xs font-normal ml-1">이 기능이 무엇을 하는지</span>
                </Label>
                <span className={`text-xs ${errors.description_too_long ? 'text-red-500 font-semibold' : form.description.length > DESCRIPTION_MAX * 0.8 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {form.description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder={`예: 카카오/네이버 소셜 계정으로 1초 만에 로그인할 수 있다. 이메일·비밀번호 입력 없이 기존 SNS 계정을 활용해 가입 허들을 낮춘다.`}
                rows={4}
                maxLength={DESCRIPTION_MAX + 50}
                className={errors.description || errors.description_too_long ? 'border-red-400 bg-red-50' : ''}
              />
              {errors.description && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  설명이 너무 짧습니다. 이 기능이 무엇을 하는지 구체적으로 적어주세요 ({DESCRIPTION_MIN}자 이상)
                </p>
              )}
              {errors.description_too_long && (
                <p className="text-xs text-red-500">너무 깁니다 ({DESCRIPTION_MAX}자 이내). 핵심 내용만 간결하게 작성해주세요</p>
              )}
              {!errors.description && !errors.description_too_long && (
                <p className="text-xs text-slate-400">
                  AI가 이 내용을 기반으로 상세 기획서를 자동 작성합니다. 구체적일수록 기획서 품질이 올라갑니다.
                </p>
              )}
            </div>

            {/* 기대 효과 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  기대 효과
                  <span className="text-slate-400 text-xs font-normal">(선택)</span>
                </Label>
                <span className={`text-xs ${errors.effect_too_long ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                  {form.expected_effect.length}/{EFFECT_MAX}
                </span>
              </div>
              <Textarea
                value={form.expected_effect}
                onChange={e => setForm(p => ({ ...p, expected_effect: e.target.value }))}
                placeholder="예: 가입 완료율 40% 향상 / 로그인 이탈 제거 / 고객 불만 감소"
                rows={2}
                maxLength={EFFECT_MAX + 20}
                className={errors.effect_too_long ? 'border-red-400 bg-red-50' : ''}
              />
              {errors.effect_too_long && (
                <p className="text-xs text-red-500">너무 깁니다 ({EFFECT_MAX}자 이내)</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-5">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-500 gap-2"
          >
            {isLoading ? '저장 중...' : '기능 저장 후 AI 기획서 작성 →'}
          </Button>
          <Link href={`/projects/${params.id}/features`}>
            <Button type="button" variant="outline">취소</Button>
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          저장 후 AI가 상세 기획서 초안을 자동 생성합니다. 검토 후 수정·승인하면 외주사에게 공유됩니다.
        </p>
      </form>
    </div>
  )
}
