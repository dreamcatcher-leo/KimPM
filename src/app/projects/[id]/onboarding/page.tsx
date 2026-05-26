'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Zap, FileText, CheckCircle2, ArrowRight, Sparkles, Calendar,
  AlertTriangle, RotateCcw, Plus, Bell, ChevronRight, ChevronLeft,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface Feature {
  id: string
  order_key: string
  name: string
  priority_group: string
  category: string
  description: string
  status: string
}

interface Project {
  id: string
  name: string
  vendor_name: string
  goal: string
}

type GenerationStatus = 'idle' | 'generating' | 'done' | 'error'
type FeatureGenStatus = Record<string, GenerationStatus>

// 온보딩 스텝
type OnboardingStep = 'spec' | 'discord' | 'done'

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: '계획 중', color: 'bg-gray-100 text-gray-600' },
  spec_draft: { label: '초안 생성됨', color: 'bg-yellow-100 text-yellow-700' },
  spec_approved: { label: '정의서 승인', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '개발 중', color: 'bg-purple-100 text-purple-700' },
  approved: { label: '완료', color: 'bg-green-100 text-green-700' },
}

// Discord 2채널 설정
interface DiscordWebhooks {
  discord_webhook_daily: string
  discord_webhook_mustcheck: string
  // 구버전 호환 필드 (deprecated)
  discord_webhook_decision: string
  discord_webhook_risk: string
}

const DISCORD_CHANNELS = [
  {
    key: 'discord_webhook_daily' as keyof DiscordWebhooks,
    label: '📊 일일보고 채널',
    emoji: '📊',
    colorBadge: 'bg-blue-100 text-blue-700',
    colorBorder: 'border-blue-200',
    desc: '오전 9시 고정 — 정보성 (흘려봐도 됨)',
    bullets: [
      '외주사 일일 보고 수신 알림 (링크만)',
      'Founder Daily Brief — AI 요약 + 리스크/Blocker 통합',
    ],
    recommended: true,
    example: '예) #daily-report',
  },
  {
    key: 'discord_webhook_mustcheck' as keyof DiscordWebhooks,
    label: '🔴 Must-Check 채널',
    emoji: '🔴',
    colorBadge: 'bg-red-100 text-red-700',
    colorBorder: 'border-red-200',
    desc: '발생 즉시 @here — 협의 필요 항목 전부',
    bullets: [
      '외주사 질문 (일정영향 무관, 전부)',
      '외주사 변경 요청',
      '기능 정의서 수정 제안',
      '기능 완료 신청 (검수 필요)',
      '주간 계획 공유 (동의 필요)',
    ],
    recommended: true,
    example: '예) #must-check',
  },
] as const

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [featureGenStatus, setFeatureGenStatus] = useState<FeatureGenStatus>({})
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  // 온보딩 스텝
  const [step, setStep] = useState<OnboardingStep>('spec')

  // Discord 웹훅 상태
  const [webhooks, setWebhooks] = useState<DiscordWebhooks>({
    discord_webhook_daily: '',
    discord_webhook_mustcheck: '',
    discord_webhook_decision: '',
    discord_webhook_risk: '',
  })
  const [testingChannel, setTestingChannel] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<Record<string, boolean | null>>({})
  const [savingDiscord, setSavingDiscord] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const [{ data: proj }, { data: feats }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('features').select('*').eq('project_id', projectId).order('order_key'),
      ])
      if (proj) {
        setProject(proj)
        // 기존 설정 있으면 채움
        setWebhooks({
          discord_webhook_daily: proj.discord_webhook_daily || '',
          discord_webhook_mustcheck: proj.discord_webhook_mustcheck || '',
          discord_webhook_decision: proj.discord_webhook_decision || '',
          discord_webhook_risk: proj.discord_webhook_risk || '',
        })
      }
      if (feats) setFeatures(feats)
      setLoading(false)
    }
    load()
  }, [projectId])

  // ── 정의서 생성 ──────────────────────────────────────────
  const generateSingleSpec = async (featureId: string) => {
    setFeatureGenStatus(prev => ({ ...prev, [featureId]: 'generating' }))
    try {
      const res = await fetch(`/api/features/${featureId}/spec`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, status: 'spec_draft' } : f))
      setFeatureGenStatus(prev => ({ ...prev, [featureId]: 'done' }))
      if (data.isFallback) toast.info(`${features.find(f => f.id === featureId)?.name} — 기본 템플릿으로 생성됨`)
      else toast.success(`정의서 초안 생성 완료`)
    } catch (err) {
      setFeatureGenStatus(prev => ({ ...prev, [featureId]: 'error' }))
      toast.error(err instanceof Error ? err.message : '생성 실패')
    }
  }

  const bulkGenerate = async () => {
    const targets = features.filter(f => f.status === 'planning')
    if (targets.length === 0) { toast.info('생성할 기능이 없습니다 (이미 모두 정의서 있음)'); return }

    setIsBulkGenerating(true)
    setBulkProgress({ done: 0, total: targets.length })

    for (const f of targets) {
      setFeatureGenStatus(prev => ({ ...prev, [f.id]: 'generating' }))
      try {
        const res = await fetch(`/api/features/${f.id}/spec`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setFeatures(prev => prev.map(feat => feat.id === f.id ? { ...feat, status: 'spec_draft' } : feat))
        setFeatureGenStatus(prev => ({ ...prev, [f.id]: 'done' }))
      } catch {
        setFeatureGenStatus(prev => ({ ...prev, [f.id]: 'error' }))
      }
      setBulkProgress(prev => ({ ...prev, done: prev.done + 1 }))
      await new Promise(r => setTimeout(r, 500))
    }

    setIsBulkGenerating(false)
    const errors = Object.values(featureGenStatus).filter(s => s === 'error').length
    if (errors === 0) toast.success(`전체 ${targets.length}개 기능 정의서 초안 생성 완료!`)
    else toast.warning(`${targets.length - errors}개 성공, ${errors}개 실패. 실패한 항목은 개별 재시도하세요.`)
  }

  // ── Discord 테스트 & 저장 ────────────────────────────────
  const testChannelWebhook = async (chKey: keyof DiscordWebhooks, label: string) => {
    const url = webhooks[chKey]
    if (!url) { toast.error('Webhook URL을 먼저 입력해주세요.'); return }

    setTestingChannel(chKey)
    setTestStatus(prev => ({ ...prev, [chKey]: null }))
    try {
      const res = await fetch('/api/discord/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: url,
          channelLabel: label,
          projectName: project?.name,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestStatus(prev => ({ ...prev, [chKey]: true }))
        toast.success(`${label} 연결 성공! Discord를 확인해주세요.`)
      } else {
        setTestStatus(prev => ({ ...prev, [chKey]: false }))
        toast.error(data.error || '전송 실패')
      }
    } catch {
      setTestStatus(prev => ({ ...prev, [chKey]: false }))
      toast.error('연결 테스트 중 오류가 발생했습니다.')
    } finally {
      setTestingChannel(null)
    }
  }

  const saveDiscordAndContinue = async (skip = false) => {
    if (!skip) {
      setSavingDiscord(true)
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient()
        const { error } = await supabase
          .from('projects')
          .update({
            discord_webhook_daily: webhooks.discord_webhook_daily || null,
            discord_webhook_mustcheck: webhooks.discord_webhook_mustcheck || null,
            discord_webhook_decision: webhooks.discord_webhook_decision || null,
            discord_webhook_risk: webhooks.discord_webhook_risk || null,
          })
          .eq('id', projectId)

        if (error) throw error
        toast.success('Discord 채널 설정이 저장되었습니다.')
      } catch {
        toast.error('저장 중 오류가 발생했습니다.')
        setSavingDiscord(false)
        return
      }
      setSavingDiscord(false)
    }
    setStep('done')
  }

  // ── 헬퍼 ────────────────────────────────────────────────
  const grouped = features.reduce((acc, f) => {
    if (!acc[f.priority_group]) acc[f.priority_group] = []
    acc[f.priority_group].push(f)
    return acc
  }, {} as Record<string, Feature[]>)

  const planningCount = features.filter(f => f.status === 'planning').length
  const specCount = features.filter(f => f.status !== 'planning').length
  const filledCount = Object.values(webhooks).filter(v => v.trim()).length

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400 text-sm">로딩 중...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">프로젝트 생성 완료!</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <strong className="text-slate-700">{project?.name}</strong> 프로젝트가 생성됐습니다.
            아래 단계를 완료하면 외주 관리를 시작할 수 있습니다.
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 mb-6">
          {(
            [
              { id: 'spec', label: '기능 정의서', icon: FileText },
              { id: 'discord', label: 'Discord 설정', icon: Bell },
              { id: 'done', label: '완료', icon: CheckCircle2 },
            ] as const
          ).map((s, i) => {
            const isCurrent = step === s.id
            const isDone = (step === 'discord' && s.id === 'spec') || (step === 'done')
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isCurrent ? 'bg-blue-600 text-white' :
                  isDone ? 'bg-green-100 text-green-700' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                  {isDone && !isCurrent && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </div>
            )
          })}
        </div>

        {/* ═══════════════════════════════════════════════════
            STEP 1 — 기능 정의서
        ═══════════════════════════════════════════════════ */}
        {step === 'spec' && (
          <>
            {/* 프로젝트 요약 카드 */}
            <Card className="mb-5 bg-gradient-to-br from-blue-50 to-slate-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">{project?.name}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{project?.vendor_name} · {project?.goal || '목표 미입력'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> 기능 {features.length}개</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> 정의서 {specCount}개</span>
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> 정의서 필요 {planningCount}개</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 핵심 액션 3개 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={bulkGenerate}
                disabled={isBulkGenerating || planningCount === 0}
                className="flex flex-col items-center gap-2 p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all text-center"
              >
                <Zap className="w-6 h-6" />
                <span className="text-xs font-semibold">
                  {isBulkGenerating
                    ? `생성 중 ${bulkProgress.done}/${bulkProgress.total}`
                    : `전체 정의서 일괄 생성\n(${planningCount}개)`}
                </span>
              </button>
              <Link href={`/projects/${projectId}/weekly-plan`} className="flex flex-col items-center gap-2 p-4 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all text-center">
                <Calendar className="w-6 h-6" />
                <span className="text-xs font-semibold">첫 주간 계획<br />생성하기</span>
              </Link>
              <Link href={`/projects/${projectId}/features`} className="flex flex-col items-center gap-2 p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all text-center">
                <FileText className="w-6 h-6" />
                <span className="text-xs font-semibold">기능 목록<br />관리하기</span>
              </Link>
            </div>

            {/* 일괄 생성 진행 표시 */}
            {isBulkGenerating && (
              <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-900">전체 기능 정의서 생성 중...</p>
                    <span className="text-xs text-blue-700">{bulkProgress.done} / {bulkProgress.total}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 기능 목록 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">기능별 정의서 생성 현황</h3>
              {['P0', 'P1', 'P2'].map(pg => {
                if (!grouped[pg]?.length) return null
                return (
                  <div key={pg}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${pg === 'P0' ? 'bg-red-100 text-red-700' : pg === 'P1' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {pg}
                      </span>
                      <span className="text-xs text-slate-400">{grouped[pg].length}개</span>
                    </div>
                    <div className="space-y-2">
                      {grouped[pg].map(feature => {
                        const genStatus = featureGenStatus[feature.id]
                        const specStatus = statusConfig[feature.status] || statusConfig.planning
                        return (
                          <Card key={feature.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-slate-400 w-12 flex-shrink-0">{feature.order_key}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">{feature.name}</p>
                                  {feature.description && (
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{feature.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {genStatus === 'generating' && (
                                    <span className="text-xs text-blue-600 animate-pulse">생성 중...</span>
                                  )}
                                  {genStatus === 'done' && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> 생성됨
                                    </span>
                                  )}
                                  {genStatus === 'error' && (
                                    <button
                                      onClick={() => generateSingleSpec(feature.id)}
                                      className="text-xs text-red-600 flex items-center gap-1 hover:underline"
                                    >
                                      <RotateCcw className="w-3 h-3" /> 재시도
                                    </button>
                                  )}
                                  {!genStatus && (
                                    <Badge className={`text-xs py-0 h-5 ${specStatus.color}`}>{specStatus.label}</Badge>
                                  )}
                                  {!genStatus && feature.status === 'planning' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs px-2 gap-1"
                                      onClick={() => generateSingleSpec(feature.id)}
                                      disabled={isBulkGenerating}
                                    >
                                      <Zap className="w-3 h-3" /> 정의서 생성
                                    </Button>
                                  )}
                                  {(feature.status !== 'planning' || genStatus === 'done') && (
                                    <Link href={`/projects/${projectId}/features/${feature.id}/spec`}>
                                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2 gap-1">
                                        <FileText className="w-3 h-3" /> 보기
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {features.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">기능 목록이 비어있습니다</h4>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                    프로젝트 생성 시 AI 분석을 건너뛰셨나요?<br />
                    기능을 직접 추가하거나, 설정에서 요구사항을 다시 입력해 AI 분석을 받을 수 있습니다.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Link href={`/projects/${projectId}/features/new`}>
                      <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500">
                        <Plus className="w-3.5 h-3.5" /> 기능 직접 추가
                      </Button>
                    </Link>
                    <Link href={`/projects/${projectId}/dashboard`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        대시보드로 이동
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 다음 단계 버튼 */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
              <p className="text-xs text-slate-400">다음은 Discord 알림 채널 설정입니다</p>
              <Button
                onClick={() => setStep('discord')}
                className="gap-2 bg-blue-600 hover:bg-blue-500"
              >
                Discord 설정하기 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 2 — Discord 2채널 설정
        ═══════════════════════════════════════════════════ */}
        {step === 'discord' && (
          <>
            <Card className="mb-5 border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-base">Discord 알림 채널 설정</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* 2채널 설명 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    📌 2개 채널로 알림을 분리하는 이유
                  </p>
                  <div className="space-y-1.5 text-xs text-blue-800">
                    <p>• <strong>📊 일일보고 채널</strong> — 오전 9시 AI 요약 + 리스크/Blocker. 흘려봐도 됩니다.</p>
                    <p>• <strong>🔴 Must-Check 채널</strong> — 외주사 질문·변경요청·수정제안·완료신청이 즉시 @here. 알림 ON 필수!</p>
                    <p className="mt-2 text-blue-700">협의가 필요한 모든 항목은 Must-Check 채널로 집중됩니다.</p>
                  </div>
                </div>

                {/* 웹훅 발급 안내 */}
                <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5 text-xs text-gray-600">
                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                  <div>
                    <span className="font-semibold">웹훅 발급:</span> Discord 채널 → 설정 → 연동 → 웹훅 → 새 웹훅 만들기 → URL 복사
                  </div>
                </div>

                {/* 2채널 입력 */}
                <div className="space-y-4">
                  {DISCORD_CHANNELS.map(ch => {
                    const ts = testStatus[ch.key]
                    return (
                      <div key={ch.key} className={`border rounded-xl p-4 ${ch.colorBorder} bg-white`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${ch.colorBadge}`}>
                                {ch.label}
                              </span>
                              <span className="text-xs text-gray-400">{ch.desc}</span>
                              {ch.recommended && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                  필수 권장
                                </span>
                              )}
                            </div>
                            <ul className="text-xs text-gray-500 space-y-0.5 ml-1">
                              {'bullets' in ch && ch.bullets.map((b: string, i: number) => (
                                <li key={i} className="flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            {ts === true && (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 연결됨
                              </span>
                            )}
                            {ts === false && (
                              <span className="text-xs text-red-500 font-medium">실패</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={webhooks[ch.key]}
                            onChange={e => setWebhooks(w => ({ ...w, [ch.key]: e.target.value }))}
                            placeholder={`https://discord.com/api/webhooks/... (${ch.example})`}
                            className="flex-1 font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testChannelWebhook(ch.key, ch.label)}
                            disabled={testingChannel === ch.key || !webhooks[ch.key].trim()}
                            className="flex-shrink-0 text-xs"
                          >
                            {testingChannel === ch.key ? '전송 중...' : '테스트'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 입력 현황 */}
                {filledCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span>{filledCount}개 채널 URL 입력됨</span>
                    {filledCount === 2 && <span className="text-green-600 font-medium">— 전체 채널 설정 완료!</span>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 버튼 영역 */}
            <div className="flex justify-between items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep('spec')}
                className="gap-1.5 text-slate-500"
              >
                <ChevronLeft className="w-4 h-4" /> 이전 단계
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => saveDiscordAndContinue(true)}
                  className="text-slate-500 text-sm"
                >
                  나중에 설정하기
                </Button>
                <Button
                  onClick={() => saveDiscordAndContinue(false)}
                  disabled={savingDiscord || filledCount === 0}
                  className="gap-2 bg-blue-600 hover:bg-blue-500"
                >
                  {savingDiscord ? '저장 중...' : '저장하고 계속'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 3 — 완료
        ═══════════════════════════════════════════════════ */}
        {step === 'done' && (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">설정 완료! 🎉</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              <strong className="text-slate-700">{project?.name}</strong> 프로젝트가 모든 초기 설정을 마쳤습니다.<br />
              이제 외주사 포털 링크를 공유하고 관리를 시작하세요.
            </p>

            {/* 완료 체크리스트 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-left max-w-sm mx-auto">
              <p className="text-xs font-semibold text-slate-600 mb-3">초기 설정 현황</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${specCount > 0 ? 'text-green-500' : 'text-slate-300'}`} />
                  <span className={specCount > 0 ? 'text-slate-700' : 'text-slate-400'}>
                    기능 정의서 {specCount}개 생성
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${filledCount > 0 ? 'text-green-500' : 'text-slate-300'}`} />
                  <span className={filledCount > 0 ? 'text-slate-700' : 'text-slate-400'}>
                    Discord 채널 {filledCount > 0 ? `${filledCount}개` : '미설정'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/projects/${projectId}/dashboard`}>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-500 w-full sm:w-auto">
                  프로젝트 대시보드로 <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href={`/projects/${projectId}/settings#discord`}>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Bell className="w-4 h-4" /> Discord 설정 수정
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
