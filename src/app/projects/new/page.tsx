'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [seedData, setSeedData] = useState(true)
  const [form, setForm] = useState({
    name: '',
    vendor_name: '',
    vendor_contact_name: '',
    vendor_contact_email: '',
    vendor_contact_discord: '',
    contract_start: '',
    contract_end: '',
    contract_amount: '',
    goal: '',
    description: '',
    brief_send_time: '09:00',
    discord_webhook_url: '',
    discord_daily_report_channel: '',
    discord_weekly_plan_channel: '',
    discord_risks_channel: '',
    discord_decisions_channel: '',
    discord_completion_channel: '',
    discord_founder_dm_channel: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, seed_data: seedData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '프로젝트 생성 실패')
      toast.success('프로젝트가 생성되었습니다!')
      router.push(`/projects/${data.project.id}/dashboard`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            대시보드로
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">새 프로젝트 생성</h1>
          <p className="text-slate-500 text-sm mt-1">외주 개발 프로젝트를 설정합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>프로젝트명 *</Label>
                  <Input name="name" value={form.name} onChange={handleChange} placeholder="BeforePet v2.0" required />
                </div>
                <div className="space-y-2">
                  <Label>외주사명 *</Label>
                  <Input name="vendor_name" value={form.vendor_name} onChange={handleChange} placeholder="(주)개발컴퍼니" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>프로젝트 목표 *</Label>
                <Textarea name="goal" value={form.goal} onChange={handleChange} placeholder="1인 운영 자동화를 위한 핵심 기능 개발..." required rows={3} />
              </div>
              <div className="space-y-2">
                <Label>프로젝트 설명 (선택)</Label>
                <Textarea name="description" value={form.description} onChange={handleChange} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* 계약 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">계약 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>계약 시작일 *</Label>
                  <Input type="date" name="contract_start" value={form.contract_start} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>계약 종료일 *</Label>
                  <Input type="date" name="contract_end" value={form.contract_end} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>계약 금액 (원, 선택)</Label>
                <Input type="number" name="contract_amount" value={form.contract_amount} onChange={handleChange} placeholder="50000000" />
              </div>
            </CardContent>
          </Card>

          {/* 외주사 담당자 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">외주사 담당자</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>담당자명</Label>
                  <Input name="vendor_contact_name" value={form.vendor_contact_name} onChange={handleChange} placeholder="홍길동" />
                </div>
                <div className="space-y-2">
                  <Label>이메일</Label>
                  <Input type="email" name="vendor_contact_email" value={form.vendor_contact_email} onChange={handleChange} placeholder="dev@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Discord 핸들</Label>
                  <Input name="vendor_contact_discord" value={form.vendor_contact_discord} onChange={handleChange} placeholder="username#1234" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discord 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discord 연동</CardTitle>
              <CardDescription>Webhook URL과 채널명을 설정합니다. 나중에 설정 페이지에서 수정 가능합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input name="discord_webhook_url" value={form.discord_webhook_url} onChange={handleChange} placeholder="https://discord.com/api/webhooks/..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>#daily-report 채널 ID</Label>
                  <Input name="discord_daily_report_channel" value={form.discord_daily_report_channel} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>#weekly-plan 채널 ID</Label>
                  <Input name="discord_weekly_plan_channel" value={form.discord_weekly_plan_channel} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>#risks 채널 ID</Label>
                  <Input name="discord_risks_channel" value={form.discord_risks_channel} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Founder DM 채널 ID</Label>
                  <Input name="discord_founder_dm_channel" value={form.discord_founder_dm_channel} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Founder Daily Brief 발송 시간</Label>
                <Input type="time" name="brief_send_time" value={form.brief_send_time} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>

          {/* 비포펫 시드 데이터 */}
          <Card className="border-blue-100 bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="seed-data"
                  checked={seedData}
                  onCheckedChange={(v) => setSeedData(v === true)}
                />
                <div>
                  <Label htmlFor="seed-data" className="text-sm font-medium cursor-pointer">
                    비포펫 기본 기능 데이터 자동 입력
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    P0 (업로드 핫픽스, 가입 루트 등 7개), P1 (도그워커 게이트, 구독 등 7개) 기능이 자동으로 입력됩니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-500">
              {isLoading ? '생성 중...' : '프로젝트 생성'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline">취소</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
