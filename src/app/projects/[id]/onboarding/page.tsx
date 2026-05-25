'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Zap, FileText, CheckCircle2, ArrowRight, Sparkles, Calendar, AlertTriangle, RotateCcw, Plus } from 'lucide-react'
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

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: '계획 중', color: 'bg-gray-100 text-gray-600' },
  spec_draft: { label: '초안 생성됨', color: 'bg-yellow-100 text-yellow-700' },
  spec_approved: { label: '정의서 승인', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '개발 중', color: 'bg-purple-100 text-purple-700' },
  approved: { label: '완료', color: 'bg-green-100 text-green-700' },
}

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

  useEffect(() => {
    const load = async () => {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const [{ data: proj }, { data: feats }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('features').select('*').eq('project_id', projectId).order('order_key'),
      ])
      if (proj) setProject(proj)
      if (feats) setFeatures(feats)
      setLoading(false)
    }
    load()
  }, [projectId])

  // 단일 정의서 생성
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

  // 전체 일괄 생성
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
      // API 호출 간 500ms 간격
      await new Promise(r => setTimeout(r, 500))
    }

    setIsBulkGenerating(false)
    const errors = Object.values(featureGenStatus).filter(s => s === 'error').length
    if (errors === 0) toast.success(`전체 ${targets.length}개 기능 정의서 초안 생성 완료!`)
    else toast.warning(`${targets.length - errors}개 성공, ${errors}개 실패. 실패한 항목은 개별 재시도하세요.`)
  }

  const grouped = features.reduce((acc, f) => {
    if (!acc[f.priority_group]) acc[f.priority_group] = []
    acc[f.priority_group].push(f)
    return acc
  }, {} as Record<string, Feature[]>)

  const planningCount = features.filter(f => f.status === 'planning').length
  const specCount = features.filter(f => f.status !== 'planning').length

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
            이제 기능 정의서를 만들고 외주 관리를 시작하세요.
          </p>
        </div>

        {/* 프로젝트 요약 */}
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

        {/* 기능 목록 + 개별 정의서 생성 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">기능별 정의서 생성 현황</h3>
          {['P0', 'P1', 'P2'].map(pg => {
            if (!grouped[pg]?.length) return null
            return (
              <div key={pg}>
                <div className={`flex items-center gap-2 mb-2`}>
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
                              {/* 생성 상태 */}
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
                              {/* 정의서 없으면 개별 생성 버튼 */}
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
                              {/* 정의서 있으면 링크 */}
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

        {/* 대시보드 이동 */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-400">언제든 다시 이 화면으로 돌아올 수 있습니다</p>
          <Link href={`/projects/${projectId}/dashboard`}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-500">
              프로젝트 대시보드로 <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
