'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Zap, CheckCircle, Clock, AlertTriangle, RefreshCw,
  Layers, FileText, CalendarDays, Send, RotateCcw,
  Play, XCircle, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { useParams } from 'next/navigation'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
type JobStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped'

interface Job {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  category: 'ai' | 'spec' | 'plan' | 'discord'
  status: JobStatus
  progress?: number          // 0~100
  progressText?: string
  result?: string
  error?: string
  startedAt?: Date
  finishedAt?: Date
  subItems?: { label: string; status: JobStatus }[]
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const statusConfig: Record<JobStatus, { label: string; color: string; icon: React.ReactNode }> = {
  idle:    { label: '대기',   color: 'bg-slate-100 text-slate-500 border-slate-200',   icon: <Clock className="w-3 h-3" /> },
  running: { label: '실행 중', color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  success: { label: '완료',   color: 'bg-green-100 text-green-700 border-green-200',   icon: <CheckCircle className="w-3 h-3" /> },
  error:   { label: '오류',   color: 'bg-red-100 text-red-700 border-red-200',         icon: <XCircle className="w-3 h-3" /> },
  skipped: { label: '스킵',   color: 'bg-yellow-100 text-yellow-600 border-yellow-200', icon: <Info className="w-3 h-3" /> },
}

const categoryConfig = {
  ai:      { label: 'AI 분석',    color: 'text-purple-600', bg: 'bg-purple-50' },
  spec:    { label: '기능정의서',  color: 'text-blue-600',   bg: 'bg-blue-50' },
  plan:    { label: '주간 계획',   color: 'text-green-600',  bg: 'bg-green-50' },
  discord: { label: 'Discord',    color: 'text-indigo-600', bg: 'bg-indigo-50' },
}

function elapsed(start?: Date, end?: Date): string {
  if (!start) return ''
  const ms = ((end || new Date()).getTime() - start.getTime())
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ─── JobCard ────────────────────────────────────────────────────────────────
function JobCard({
  job,
  onRun,
  onRetry,
  isAnyRunning,
}: {
  job: Job
  onRun: (id: string) => void
  onRetry: (id: string) => void
  isAnyRunning: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const sc = statusConfig[job.status]
  const cc = categoryConfig[job.category]

  return (
    <Card className={`overflow-hidden transition-all ${job.status === 'running' ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 아이콘 + 정보 */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cc.bg}`}>
              <span className={cc.color}>{job.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-900">{job.label}</span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                  {sc.icon}{sc.label}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${cc.bg} ${cc.color}`}>
                  {cc.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{job.description}</p>

              {/* 진행률 바 */}
              {job.status === 'running' && job.progress !== undefined && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  {job.progressText && (
                    <p className="text-xs text-blue-600">{job.progressText}</p>
                  )}
                </div>
              )}

              {/* 결과 / 오류 */}
              {job.status === 'success' && job.result && (
                <p className="text-xs text-green-700 mt-1.5 bg-green-50 rounded-lg px-2 py-1">{job.result}</p>
              )}
              {job.status === 'error' && job.error && (
                <p className="text-xs text-red-600 mt-1.5 bg-red-50 rounded-lg px-2 py-1">{job.error}</p>
              )}
              {job.status === 'skipped' && job.result && (
                <p className="text-xs text-yellow-600 mt-1.5">{job.result}</p>
              )}

              {/* 시간 */}
              {(job.startedAt || job.finishedAt) && (
                <p className="text-xs text-slate-300 mt-1">
                  {job.startedAt && `시작 ${job.startedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                  {job.finishedAt && ` · 소요 ${elapsed(job.startedAt, job.finishedAt)}`}
                </p>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {job.subItems && job.subItems.length > 0 && (
              <Button
                size="sm" variant="ghost"
                className="h-7 px-2 text-xs text-slate-400"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            )}
            {job.status === 'error' ? (
              <Button
                size="sm" variant="outline"
                className="h-7 px-2.5 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => onRetry(job.id)}
                disabled={isAnyRunning}
              >
                <RotateCcw className="w-3 h-3" />재시도
              </Button>
            ) : (
              <Button
                size="sm" variant="outline"
                className="h-7 px-2.5 text-xs gap-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => onRun(job.id)}
                disabled={isAnyRunning || job.status === 'running'}
              >
                <Play className="w-3 h-3" />
                {job.status === 'success' ? '재실행' : '실행'}
              </Button>
            )}
          </div>
        </div>

        {/* 서브 아이템 (예: 주차별 생성 결과) */}
        {expanded && job.subItems && job.subItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {job.subItems.map((sub, i) => {
              const s = statusConfig[sub.status]
              return (
                <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${s.color} border`}>
                  {s.icon}
                  <span className="truncate">{sub.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function JobsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 'bulk_weekly_plan',
      label: '전체 기간 주간 계획 생성',
      description: '계약 기간 전체를 주차별로 AI가 계획 초안을 생성합니다 (기존 항목 유지)',
      icon: <CalendarDays className="w-4 h-4" />,
      category: 'plan',
      status: 'idle',
    },
    {
      id: 'bulk_weekly_plan_force',
      label: '전체 주간 계획 강제 재생성',
      description: '이미 생성된 주차도 포함하여 모두 재생성합니다 (기존 AI 초안 덮어쓰기)',
      icon: <RefreshCw className="w-4 h-4" />,
      category: 'plan',
      status: 'idle',
    },
    {
      id: 'send_all_specs',
      label: '기능정의서 일괄 전달',
      description: '승인되었지만 미전달된 기능정의서를 외주사에게 모두 전달 처리합니다',
      icon: <Send className="w-4 h-4" />,
      category: 'spec',
      status: 'idle',
    },
    {
      id: 'bulk_spec_generate',
      label: '미작성 기능정의서 일괄 생성',
      description: '정의서가 없는 기능들의 AI 초안을 일괄 생성합니다',
      icon: <FileText className="w-4 h-4" />,
      category: 'spec',
      status: 'idle',
    },
    {
      id: 'weekly_analysis',
      label: 'AI 주간 종합 분석',
      description: '이번 주 보고, 증빙, 리스크를 종합 분석하고 결과를 캐시합니다',
      icon: <Zap className="w-4 h-4" />,
      category: 'ai',
      status: 'idle',
    },
  ])

  const isAnyRunning = jobs.some(j => j.status === 'running')

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }, [])

  // ── 잡 실행 핸들러 ────────────────────────────────────────────────────────
  const runJob = useCallback(async (jobId: string) => {
    updateJob(jobId, { status: 'running', startedAt: new Date(), finishedAt: undefined, result: undefined, error: undefined, progress: 0, subItems: [] })

    try {
      switch (jobId) {

        // ── 전체 주간 계획 생성 ─────────────────────────────────────────
        case 'bulk_weekly_plan':
        case 'bulk_weekly_plan_force': {
          const force = jobId === 'bulk_weekly_plan_force'
          updateJob(jobId, { progressText: 'API 호출 중...' })

          const res = await fetch(`/api/projects/${projectId}/weekly-plan`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'bulk_generate', force }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || '실패')

          const subItems = (data.results || []).map((r: { week_start: string; status: string }) => ({
            label: r.week_start,
            status: r.status === 'created' ? 'success' : r.status === 'error' ? 'error' : 'skipped',
          }))

          updateJob(jobId, {
            status: 'success',
            progress: 100,
            result: `전체 ${data.total_weeks}주 처리 완료 — 생성 ${data.generated}주, 스킵 ${data.skipped}주${data.errors > 0 ? `, 오류 ${data.errors}주` : ''}`,
            subItems,
            finishedAt: new Date(),
          })
          toast.success('주간 계획 일괄 생성 완료')
          break
        }

        // ── 기능정의서 일괄 전달 ─────────────────────────────────────────
        case 'send_all_specs': {
          updateJob(jobId, { progressText: '전달 처리 중...' })
          const res = await fetch(`/api/projects/${projectId}/specs`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'send_all' }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || '실패')

          updateJob(jobId, {
            status: data.sent === 0 ? 'skipped' : 'success',
            progress: 100,
            result: data.sent === 0
              ? '전달할 정의서가 없습니다 (이미 모두 전달됨)'
              : `${data.sent}개 기능정의서 전달 완료`,
            finishedAt: new Date(),
          })
          if (data.sent > 0) toast.success(`${data.sent}개 기능정의서 전달 완료`)
          break
        }

        // ── 미작성 기능정의서 일괄 생성 ──────────────────────────────────
        case 'bulk_spec_generate': {
          updateJob(jobId, { progressText: '기능 목록 조회 중...' })

          // features/bulk-generate 엔드포인트가 있다면 호출, 없으면 features 페이지 안내
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: features, error } = await supabase
            .from('features')
            .select('id, name, status, spec_status')
            .eq('project_id', projectId)
            .eq('status', 'planning')

          if (error) throw error

          const needSpec = (features || []).filter(f => f.spec_status === 'none' || !f.spec_status)
          if (needSpec.length === 0) {
            updateJob(jobId, {
              status: 'skipped',
              progress: 100,
              result: '정의서 미작성 기능이 없습니다',
              finishedAt: new Date(),
            })
            break
          }

          updateJob(jobId, { progressText: `${needSpec.length}개 기능 정의서 생성 중...`, progress: 10 })

          let done = 0
          const subItems: { label: string; status: JobStatus }[] = []

          for (const f of needSpec) {
            try {
              const res = await fetch(`/api/projects/${projectId}/features/${f.id}/generate-spec`, {
                method: 'POST',
              })
              if (res.ok) {
                subItems.push({ label: f.name, status: 'success' })
              } else {
                subItems.push({ label: f.name, status: 'error' })
              }
            } catch {
              subItems.push({ label: f.name, status: 'error' })
            }
            done++
            updateJob(jobId, {
              progress: Math.round((done / needSpec.length) * 100),
              progressText: `${done}/${needSpec.length} 완료`,
              subItems: [...subItems],
            })
          }

          const successCount = subItems.filter(s => s.status === 'success').length
          const errorCount = subItems.filter(s => s.status === 'error').length
          updateJob(jobId, {
            status: errorCount === needSpec.length ? 'error' : 'success',
            progress: 100,
            result: `${successCount}개 생성 완료${errorCount > 0 ? `, ${errorCount}개 오류` : ''}`,
            finishedAt: new Date(),
          })
          break
        }

        // ── AI 주간 종합 분석 ──────────────────────────────────────────
        case 'weekly_analysis': {
          updateJob(jobId, { progressText: 'AI 분석 요청 중...' })
          const res = await fetch(`/api/projects/weekly-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, force: true }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || '실패')

          // localStorage 캐시 무효화 (새 데이터 반영용)
          const today = new Date().toISOString().split('T')[0]
          localStorage.removeItem(`kimpm_weekly_analysis_${projectId}_${today}`)

          updateJob(jobId, {
            status: 'success',
            progress: 100,
            result: `분석 완료 — 실행도 ${data.execution_score ?? '?'}%, 지연리스크 ${data.delay_risk ?? '?'}`,
            finishedAt: new Date(),
          })
          toast.success('AI 주간 분석 완료')
          break
        }

        default:
          updateJob(jobId, { status: 'error', error: '알 수 없는 잡 ID', finishedAt: new Date() })
      }
    } catch (err) {
      updateJob(jobId, {
        status: 'error',
        error: err instanceof Error ? err.message : '알 수 없는 오류',
        finishedAt: new Date(),
      })
    }
  }, [projectId, updateJob])

  const runAll = async () => {
    const idleJobs = jobs.filter(j => j.status === 'idle' || j.status === 'error')
    for (const job of idleJobs) {
      await runJob(job.id)
    }
  }

  // 통계
  const successCount = jobs.filter(j => j.status === 'success').length
  const errorCount = jobs.filter(j => j.status === 'error').length
  const runningJob = jobs.find(j => j.status === 'running')

  const groupedJobs = ['plan', 'spec', 'ai', 'discord'].map(cat => ({
    category: cat as keyof typeof categoryConfig,
    items: jobs.filter(j => j.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">백그라운드 작업센터</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            시간이 오래 걸리는 AI 분석, 일괄 생성 작업을 여기서 실행하고 추적합니다
          </p>
        </div>
        <Button
          onClick={runAll}
          disabled={isAnyRunning}
          className="gap-2 bg-slate-800 hover:bg-slate-700 h-9"
          size="sm"
        >
          <Layers className="w-4 h-4" />
          전체 실행
        </Button>
      </div>

      {/* 상태 바 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">전체 잡</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${isAnyRunning ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
          <p className={`text-2xl font-bold ${isAnyRunning ? 'text-blue-700' : 'text-slate-400'}`}>
            {jobs.filter(j => j.status === 'running').length}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">실행 중</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${successCount > 0 ? 'bg-green-50 border-green-100' : 'bg-white border-slate-200'}`}>
          <p className={`text-2xl font-bold ${successCount > 0 ? 'text-green-700' : 'text-slate-400'}`}>{successCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">완료</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{errorCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">오류</p>
        </div>
      </div>

      {/* 현재 실행 중 배너 */}
      {runningJob && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-blue-800">{runningJob.label} 실행 중</span>
            {runningJob.progressText && (
              <span className="text-xs text-blue-600 ml-2">{runningJob.progressText}</span>
            )}
          </div>
          {runningJob.progress !== undefined && (
            <span className="text-sm font-bold text-blue-700">{runningJob.progress}%</span>
          )}
        </div>
      )}

      {/* 카테고리별 잡 목록 */}
      {groupedJobs.map(({ category, items }) => {
        const cc = categoryConfig[category]
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${cc.bg} ${cc.color}`}>
                {cc.label}
              </span>
              <span className="text-xs text-slate-400">{items.length}개 작업</span>
            </div>
            <div className="space-y-2">
              {items.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onRun={runJob}
                  onRetry={runJob}
                  isAnyRunning={isAnyRunning}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* 안내 */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-500 space-y-1">
            <p>• 작업은 순차 실행됩니다. 브라우저를 닫으면 실행 중 작업이 중단될 수 있습니다</p>
            <p>• "강제 재생성" 작업은 기존 AI 초안을 덮어씁니다. 승인된 계획은 영향받지 않습니다</p>
            <p>• AI 분석 작업 완료 후 대시보드를 새로고침하면 최신 분석 결과를 볼 수 있습니다</p>
          </div>
        </div>
      </div>
    </div>
  )
}
