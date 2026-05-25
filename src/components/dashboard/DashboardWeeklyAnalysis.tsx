'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  AlertTriangle, TrendingUp, TrendingDown, RefreshCw,
  Zap, ChevronRight, CheckCircle, Clock, AlertCircle
} from 'lucide-react'

interface DelayRisk {
  rank: number
  title: string
  description: string
  severity: '높음' | '보통' | '낮음'
  related_type: string
  action_needed: string
}

interface WeeklyAnalysis {
  execution_score: number
  execution_summary: string
  delay_risk_level: string
  delay_risk_reason: string
  top3_delay_risks: DelayRisk[]
  positive_signals: string[]
  ai_comment: string
  meta: {
    report_count: number
    working_days_elapsed: number
    evidence_count: number
    week_start: string
    week_end: string
  }
}

interface Props {
  projectId: string
  projectName: string
}

// ─── localStorage 캐시 키 헬퍼 ───────────────────────────────────────────────
function getCacheKey(projectId: string) {
  const today = new Date().toISOString().split('T')[0]
  return `kimpm_weekly_analysis_${projectId}_${today}`
}

export default function DashboardWeeklyAnalysis({ projectId, projectName }: Props) {
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isCached, setIsCached] = useState(false)

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    // 당일 캐시 확인
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(getCacheKey(projectId))
        if (cached) {
          const { data, savedAt } = JSON.parse(cached)
          setAnalysis(data)
          setLastUpdated(new Date(savedAt))
          setIsCached(true)
          return
        }
      } catch {
        // 캐시 파싱 실패 시 무시하고 새로 생성
      }
    }

    setIsLoading(true)
    setError(null)
    setIsCached(false)
    try {
      const res = await fetch('/api/projects/weekly-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        if (res.status === 401) {
          // 세션 만료 → 페이지 새로고침하면 미들웨어가 로그인 페이지로 안내
          setError('세션이 만료되었습니다. 페이지를 새로고침해 주세요.')
          return
        }
        throw new Error(errBody?.detail || errBody?.error || `서버 오류 (${res.status})`)
      }
      const data = await res.json()
      setAnalysis(data)
      const now = new Date()
      setLastUpdated(now)
      // 당일 캐시 저장
      try {
        localStorage.setItem(getCacheKey(projectId), JSON.stringify({ data, savedAt: now.toISOString() }))
      } catch {
        // localStorage 저장 실패 무시
      }
    } catch (e) {
      setError('주간 분석 로딩 실패. 재시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchAnalysis(false)
  }, [fetchAnalysis])

  const riskLevelConfig = {
    '낮음': { color: 'text-green-700', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', icon: CheckCircle },
    '보통': { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: AlertCircle },
    '높음': { color: 'text-red-700', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
    '매우높음': { color: 'text-red-800', bg: 'bg-red-100 border-red-300', badge: 'bg-red-200 text-red-800', icon: AlertTriangle },
  }

  const severityConfig = {
    '높음': 'bg-red-100 text-red-700 border-red-200',
    '보통': 'bg-orange-100 text-orange-700 border-orange-200',
    '낮음': 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const riskConfig = riskLevelConfig[analysis?.delay_risk_level as keyof typeof riskLevelConfig] || riskLevelConfig['보통']
  const RiskIcon = riskConfig.icon

  return (
    <div className="space-y-4">
      {/* 주간 AI 분석 헤더 카드 */}
      <Card className={`border-2 ${analysis ? riskConfig.bg : 'border-slate-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span>주간 실행도 AI 분석</span>
              <span className="text-xs font-normal text-slate-500">— {projectName}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-slate-400">
                  {isCached ? '캐시됨 · ' : ''}{lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {isCached && (
                <span className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">일별 1회</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchAnalysis(true)}
                disabled={isLoading}
                className="h-7 gap-1 text-slate-500 hover:text-blue-400"
                title="수동 재분석 (추가 AI 토큰 사용)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? '분석 중...' : isCached ? '수동 재분석' : '새로고침'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !analysis && (
            <div className="flex items-center gap-3 py-4">
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              <div>
                <div className="text-sm font-medium text-slate-700">AI가 이번 주 데이터를 분석 중입니다...</div>
                <div className="text-xs text-slate-500 mt-0.5">보고, 증빙, 진척도, 블로커를 종합 판단합니다</div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-sm text-red-600">{error}</span>
              {error.includes('세션') ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-red-600 h-7 whitespace-nowrap"
                >
                  새로고침
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => fetchAnalysis(true)} className="text-red-600 h-7">재시도</Button>
              )}
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* 3개 지표 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">이번 주 실행도</div>
                  <div className="text-3xl font-bold text-slate-900">{analysis.execution_score}<span className="text-lg text-slate-400">%</span></div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${analysis.execution_score >= 70 ? 'bg-green-500' : analysis.execution_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${analysis.execution_score}%` }}
                    />
                  </div>
                </div>

                <div className={`rounded-xl p-3 border ${riskConfig.bg}`}>
                  <div className="text-xs text-slate-500 mb-1">지연 리스크</div>
                  <div className={`text-2xl font-bold ${riskConfig.color} flex items-center gap-1`}>
                    <RiskIcon className="w-5 h-5" />
                    {analysis.delay_risk_level}
                  </div>
                  <div className={`text-xs mt-1.5 ${riskConfig.color} opacity-80 line-clamp-2`}>
                    {analysis.delay_risk_reason}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">이번 주 데이터</div>
                  <div className="space-y-1 mt-1">
                    <div className="text-xs flex justify-between">
                      <span className="text-slate-500">보고</span>
                      <span className="font-medium text-slate-700">{analysis.meta.report_count}건 / {analysis.meta.working_days_elapsed}일</span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span className="text-slate-500">증빙</span>
                      <span className="font-medium text-slate-700">{analysis.meta.evidence_count}건</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI 코멘트 */}
              {analysis.ai_comment && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">🤖 AI 종합 판단</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{analysis.ai_comment}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이번 주 지연 위험 TOP 3 */}
      {analysis && analysis.top3_delay_risks?.length > 0 && (
        <Card className={`border-2 ${
          analysis.delay_risk_level === '높음' || analysis.delay_risk_level === '매우높음'
            ? 'border-red-200'
            : analysis.delay_risk_level === '보통'
            ? 'border-orange-200'
            : 'border-slate-200'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                analysis.delay_risk_level === '높음' ? 'text-red-500' :
                analysis.delay_risk_level === '보통' ? 'text-orange-500' : 'text-slate-400'
              }`} />
              이번 주 지연 위험 TOP 3
              <Badge className={riskConfig.badge}>{analysis.delay_risk_level}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.top3_delay_risks.map((risk) => (
              <div
                key={risk.rank}
                className={`rounded-xl p-4 border ${
                  risk.severity === '높음'
                    ? 'bg-red-50 border-red-200'
                    : risk.severity === '보통'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    risk.severity === '높음' ? 'bg-red-200 text-red-700' :
                    risk.severity === '보통' ? 'bg-orange-200 text-orange-700' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {risk.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{risk.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${severityConfig[risk.severity as keyof typeof severityConfig] || severityConfig['낮음']}`}
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{risk.description}</p>
                    {risk.action_needed && (
                      <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${
                        risk.severity === '높음' ? 'text-red-600' :
                        risk.severity === '보통' ? 'text-orange-600' : 'text-slate-500'
                      }`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                        {risk.action_needed}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* 긍정 시그널 */}
            {analysis.positive_signals?.filter(s => s).length > 0 && (
              <div className="mt-2 pt-3 border-t border-slate-200">
                <div className="text-xs font-medium text-green-700 mb-2">✅ 긍정 시그널</div>
                <div className="space-y-1">
                  {analysis.positive_signals.filter(s => s).map((signal, i) => (
                    <div key={i} className="text-sm text-slate-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                      {signal}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
