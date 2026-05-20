'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Save, Bell, Link2, Trash2, Copy, RefreshCw, Settings } from 'lucide-react'
import type { Project } from '@/types'

interface AccessLink {
  id: string
  token: string
  vendor_name: string
  vendor_email: string | null
  is_active: boolean
  created_at: string
  expires_at: string | null
}

interface SettingsClientProps {
  project: Project
  accessLinks: AccessLink[]
}

export default function SettingsClient({ project, accessLinks }: SettingsClientProps) {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    name: project.name,
    description: project.description || '',
    goal: project.goal || '',
    contract_start: project.contract_start || '',
    contract_end: project.contract_end || '',
    contract_amount: project.contract_amount || '',
    discord_webhook_url: project.discord_webhook_url || '',
    discord_channel_id: project.discord_channel_id || '',
    brief_send_time: project.brief_send_time || '09:00',
    vendor_report_reminder_time: project.vendor_report_reminder_time || '17:00',
    status: project.status,
  })

  const [links, setLinks] = useState(accessLinks)

  const saveSettings = async () => {
    setSaving(true)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('projects')
        .update({
          name: settings.name,
          description: settings.description || null,
          goal: settings.goal || null,
          contract_start: settings.contract_start || null,
          contract_end: settings.contract_end || null,
          contract_amount: settings.contract_amount ? Number(settings.contract_amount) : null,
          discord_webhook_url: settings.discord_webhook_url || null,
          discord_channel_id: settings.discord_channel_id || null,
          brief_send_time: settings.brief_send_time,
          vendor_report_reminder_time: settings.vendor_report_reminder_time,
          status: settings.status,
        })
        .eq('id', project.id)

      if (error) throw error
      toast.success('설정이 저장되었습니다.')
    } catch {
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const testDiscordWebhook = async () => {
    if (!settings.discord_webhook_url) {
      toast.error('Discord Webhook URL을 먼저 입력해주세요.')
      return
    }
    try {
      const res = await fetch(settings.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '✅ DeliveryGuard PM 연결 테스트',
            description: `**${project.name}** 프로젝트와 Discord가 성공적으로 연결되었습니다.`,
            color: 0x22c55e,
            timestamp: new Date().toISOString(),
          }],
        }),
      })
      if (res.ok) {
        toast.success('Discord 연결 테스트 성공! 채널을 확인해주세요.')
      } else {
        toast.error('Discord 전송에 실패했습니다. URL을 확인해주세요.')
      }
    } catch {
      toast.error('Discord 연결 테스트 실패')
    }
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/vendor/${token}`
    navigator.clipboard.writeText(url)
    toast.success('링크가 복사되었습니다.')
  }

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('access_links')
        .update({ is_active: !isActive })
        .eq('id', linkId)

      if (error) throw error
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, is_active: !isActive } : l))
      toast.success(isActive ? '링크가 비활성화되었습니다.' : '링크가 활성화되었습니다.')
    } catch {
      toast.error('처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-base">기본 정보</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm">프로젝트명</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="goal" className="text-sm">프로젝트 목표</Label>
            <Input
              id="goal"
              value={settings.goal}
              onChange={e => setSettings(s => ({ ...s, goal: e.target.value }))}
              placeholder="핵심 목표를 한 문장으로 입력하세요"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-sm">설명</Label>
            <Input
              id="description"
              value={settings.description}
              onChange={e => setSettings(s => ({ ...s, description: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contract_start" className="text-sm">계약 시작일</Label>
              <Input
                id="contract_start"
                type="date"
                value={settings.contract_start}
                onChange={e => setSettings(s => ({ ...s, contract_start: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contract_end" className="text-sm">계약 종료일</Label>
              <Input
                id="contract_end"
                type="date"
                value={settings.contract_end}
                onChange={e => setSettings(s => ({ ...s, contract_end: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contract_amount" className="text-sm">계약 금액 (원)</Label>
            <Input
              id="contract_amount"
              type="number"
              value={settings.contract_amount}
              onChange={e => setSettings(s => ({ ...s, contract_amount: e.target.value }))}
              placeholder="50000000"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="status" className="text-sm">프로젝트 상태</Label>
            <select
              id="status"
              value={settings.status}
              onChange={e => setSettings(s => ({ ...s, status: e.target.value as Project['status'] }))}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">진행중</option>
              <option value="on_hold">일시중단</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Discord 설정 */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-base">Discord 알림 설정</CardTitle>
          </div>
          <CardDescription className="text-xs">일일 보고, 리스크, 완료 알림을 Discord로 받습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhook" className="text-sm">Webhook URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="webhook"
                value={settings.discord_webhook_url}
                onChange={e => setSettings(s => ({ ...s, discord_webhook_url: e.target.value }))}
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 font-mono text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={testDiscordWebhook}
                className="flex-shrink-0"
              >
                <Bell className="w-3.5 h-3.5 mr-1" />
                테스트
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="channel" className="text-sm">채널 ID (선택)</Label>
            <Input
              id="channel"
              value={settings.discord_channel_id}
              onChange={e => setSettings(s => ({ ...s, discord_channel_id: e.target.value }))}
              placeholder="Discord 채널 ID"
              className="mt-1 font-mono text-xs"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">알림 시간 설정</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brief_time" className="text-sm">Founder Daily Brief</Label>
                <Input
                  id="brief_time"
                  type="time"
                  value={settings.brief_send_time}
                  onChange={e => setSettings(s => ({ ...s, brief_send_time: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">매일 대표님께 브리프 전송</p>
              </div>
              <div>
                <Label htmlFor="reminder_time" className="text-sm">외주사 보고 리마인더</Label>
                <Input
                  id="reminder_time"
                  type="time"
                  value={settings.vendor_report_reminder_time}
                  onChange={e => setSettings(s => ({ ...s, vendor_report_reminder_time: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">외주사 보고 독려 메시지</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 외주사 링크 관리 */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-base">외주사 접근 링크</CardTitle>
          </div>
          <CardDescription className="text-xs">외주사 포털 접근 링크를 관리합니다. 새 링크는 프로젝트 대시보드에서 발급하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">발급된 링크가 없습니다.</p>
              <p className="text-xs mt-1">프로젝트 대시보드에서 링크를 발급하세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <div
                  key={link.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${link.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{link.vendor_name}</span>
                      <Badge className={link.is_active ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>
                        {link.is_active ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    {link.vendor_email && (
                      <p className="text-xs text-gray-400">{link.vendor_email}</p>
                    )}
                    <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                      /vendor/{link.token.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => copyLink(link.token)}
                      title="링크 복사"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => toggleLinkStatus(link.id, link.is_active)}
                      title={link.is_active ? '비활성화' : '활성화'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${link.is_active ? 'text-gray-400' : 'text-green-500'}`} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  )
}
