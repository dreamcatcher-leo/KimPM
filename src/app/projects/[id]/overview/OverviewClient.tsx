'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Bell, AlertTriangle, Scale, FileText, ChevronRight,
  CheckCircle, XCircle, Clock, X, ArrowLeft,
  TrendingDown, ShieldAlert, Loader2
} from 'lucide-react'
import type { Project, MustCheckItem, Decision, Risk, Report, Feature, DecisionStatus } from '@/types'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'must-check', label: 'Must-Check', icon: Bell, color: 'text-purple-600', badgeClass: 'bg-purple-100 text-purple-700' },
  { id: 'decisions', label: '의사결정', icon: Scale, color: 'text-orange-600', badgeClass: 'bg-orange-100 text-orange-700' },
  { id: 'risks', label: '오픈 리스크', icon: AlertTriangle, color: 'text-red-600', badgeClass: 'bg-red-100 text-red-700' },
  { id: 'reports', label: '최근 보고', icon: FileText, color: 'text-blue-600', badgeClass: 'bg-blue-100 text-blue-700' },
]

const triggerLabels: Record<string, string> = {
  '정책_범위_비용_변경': '정책/범위/비용 변경',
  '반복_blocker': '반복 Blocker',
  '완료_후보_검수': '완료 후보 검수',
  '점검_권장_신호': 'AI 점검 권장',
  '외주사_확인_요청': '외주사 확인 요청',
  'Weekly_Plan_미달성_누적': '주간 계획 미달성',
}

const riskLevelConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  '낮음':          { label: '낮음',      color: 'text-gray-600',   bg: 'bg-gray-50',    border: 'border-gray-200' },
  '주의':          { label: '주의',      color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  '위험':          { label: '위험',      color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
  'Must_Check_필요': { label: 'Must-Check', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
}

const decisionStatusConfig: Record<DecisionStatus, { label: string; color: string }> = {
  pending:  { label: '대기 중', color: 'bg-orange-100 text-orange-700' },
  approved: { label: '승인',   color: 'bg-green-100 text-green-700' },
  rejected: { label: '반려',   color: 'bg-red-100 text-red-700' },
  deferred: { label: '보류',   color: 'bg-gray-100 text-gray-600' },
}

const signalColors: Record<string, string> = {
  '정상':        'bg-green-100 text-green-700',
  '주의':        'bg-yellow-100 text-yellow-700',
  '점검_권장':   'bg-red-100 text-red-700',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  project: Project
  projectId: string
  initialTab: string
  initialItem: string | null
  mustCheckItems: MustCheckItem[]
  decisions: Decision[]
  risks: Risk[]
  reports: Report[]
  features: Feature[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OverviewClient({
  project, projectId, initialTab, initialItem,
  mustCheckItems: initMustChecks,
  decisions: initDecisions,
  risks: initRisks,
  reports,
  features,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedId, setSelectedId] = useState<string | null>(initialItem)

  // 로컬 상태 (낙관적 업데이트)
  const [mustChecks, setMustChecks] = useState(initMustChecks)
  const [decisions, setDecisions] = useState(initDecisions)
  const [risks, setRisks] = useState(initRisks)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [decisionText, setDecisionText] = useState<Record<string, string>>({})

  // 카운트
  const pendingMustChecks = mustChecks.filter(i => !i.is_resolved)
  const pendingDecisions = decisions.filter(d => d.status === 'pending')
  const openRisks = risks.filter(r => !r.is_resolved)

  // 탭 변경
  const switchTab = (tab: string) => {
    setActiveTab(tab)
    setSelectedId(null)
  }

  // ─── Must-Check 해결 ───────────────────────────────────────────────────────
  const resolveMustCheck = async (itemId: string) => {
    setProcessingId(itemId)
    try {
      const res = await fetch(`/api/must-check/${itemId}/resolve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setMustChecks(prev => prev.map(i =>
        i.id === itemId ? { ...i, is_resolved: true, resolved_at: new Date().toISOString() } : i
      ))
      setSelectedId(null)
      toast.success('Must-Check 확인 완료')
    } catch {
      toast.error('처리 실패')
    } finally {
      setProcessingId(null)
    }
  }

  // ─── 의사결정 처리 ──────────────────────────────────────────────────────────
  const decide = async (decisionId: string, status: DecisionStatus) => {
    setProcessingId(decisionId)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('decisions').update({
        status,
        founder_decision: decisionText[decisionId] || null,
        decided_at: new Date().toISOString(),
      }).eq('id', decisionId)
      if (error) throw error
      setDecisions(prev => prev.map(d =>
        d.id === decisionId ? { ...d, status, founder_decision: decisionText[decisionId] } : d
      ))
      setSelectedId(null)
      toast.success(`${decisionStatusConfig[status].label} 처리되었습니다`)
    } catch {
      toast.error('처리 실패')
    } finally {
      setProcessingId(null)
    }
  }

  // ─── 리스크 해결 ───────────────────────────────────────────────────────────
  const resolveRisk = async (riskId: string) => {
    setProcessingId(riskId)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('risks').update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      }).eq('id', riskId)
      if (error) throw error
      setRisks(prev => prev.map(r =>
        r.id === riskId ? { ...r, is_resolved: true, resolved_at: new Date().toISOString() } : r
      ))
      setSelectedId(null)
      toast.success('리스크 해결 처리되었습니다')
    } catch {
      toast.error('처리 실패')
    } finally {
      setProcessingId(null)
    }
  }

  // ─── 현재 탭의 선택된 항목 ─────────────────────────────────────────────────
  const selectedMustCheck = activeTab === 'must-check' ? mustChecks.find(i => i.id === selectedId) : null
  const selectedDecision = activeTab === 'decisions' ? decisions.find(d => d.id === selectedId) : null
  const selectedRisk = activeTab === 'risks' ? risks.find(r => r.id === selectedId) : null
  const selectedReport = activeTab === 'reports' ? reports.find(r => r.id === selectedId) : null
  const hasPanel = !!(selectedMustCheck || selectedDecision || selectedRisk || selectedReport)

  // 연관 기능 찾기
  const getFeatureName = (featureId: string | null) => {
    if (!featureId) return null
    return features.find(f => f.id === featureId)?.name || null
  }

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/dashboard`)}
          className="gap-1.5 text-slate-500 hover:text-slate-800 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          대시보드
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">통합 결정함</h1>
          <p className="text-sm text-slate-500">{project.name} — 확인·승인·해결이 필요한 항목</p>
        </div>
      </div>

      {/* 요약 배너 */}
      {(pendingMustChecks.length + pendingDecisions.length + openRisks.length) > 0 && (
        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-orange-800 font-medium">
            Must-Check {pendingMustChecks.length}건 · 의사결정 대기 {pendingDecisions.length}건 · 오픈 리스크 {openRisks.length}건 — 순서대로 처리하세요
          </span>
        </div>
      )}

      {/* 탭 + 본문 */}
      <div className="flex gap-4">
        {/* 탭 목록 */}
        <div className="flex flex-col gap-1 w-48 flex-shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const count = tab.id === 'must-check' ? pendingMustChecks.length
              : tab.id === 'decisions' ? pendingDecisions.length
              : tab.id === 'risks' ? openRisks.length
              : reports.length
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-white shadow-sm border border-slate-200 font-semibold text-slate-900'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${activeTab === tab.id ? tab.color : 'text-slate-400'}`} />
                <span className="text-sm flex-1">{tab.label}</span>
                {count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab.badgeClass}`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 본문 — 리스트 + 상세 패널 */}
        <div className="flex-1 flex gap-4 min-w-0">
          {/* 리스트 */}
          <div className={`flex-1 min-w-0 space-y-2 ${hasPanel ? 'max-w-sm' : ''}`}>

            {/* ── Must-Check 탭 ── */}
            {activeTab === 'must-check' && (
              <>
                {mustChecks.length === 0 && (
                  <EmptyState icon={<Bell className="w-8 h-8 text-purple-300" />} message="Must-Check 항목이 없습니다" />
                )}
                {mustChecks.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedId === item.id
                        ? 'border-purple-400 bg-purple-50 shadow-md'
                        : item.is_resolved
                        ? 'border-slate-100 bg-slate-50 opacity-50'
                        : 'border-purple-100 bg-white hover:border-purple-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${item.is_resolved ? 'bg-green-400' : 'bg-purple-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            {triggerLabels[item.trigger_type] || item.trigger_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                          {item.is_resolved && <span className="text-xs text-green-600">✓ 완료</span>}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5 transition-transform ${selectedId === item.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* ── 의사결정 탭 ── */}
            {activeTab === 'decisions' && (
              <>
                {decisions.length === 0 && (
                  <EmptyState icon={<Scale className="w-8 h-8 text-orange-300" />} message="의사결정 항목이 없습니다" />
                )}
                {decisions.map(decision => {
                  const config = decisionStatusConfig[decision.status]
                  return (
                    <button
                      key={decision.id}
                      onClick={() => setSelectedId(selectedId === decision.id ? null : decision.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedId === decision.id
                          ? 'border-orange-400 bg-orange-50 shadow-md'
                          : decision.status !== 'pending'
                          ? 'border-slate-100 bg-slate-50 opacity-60'
                          : 'border-orange-100 bg-white hover:border-orange-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                          decision.status === 'pending' ? 'bg-orange-500' :
                          decision.status === 'approved' ? 'bg-green-500' : 'bg-slate-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-snug">{decision.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                            {decision.decision_type && (
                              <span className="text-xs text-slate-400">{decision.decision_type}</span>
                            )}
                            <span className="text-xs text-slate-400">
                              {new Date(decision.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5 transition-transform ${selectedId === decision.id ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {/* ── 리스크 탭 ── */}
            {activeTab === 'risks' && (
              <>
                {risks.length === 0 && (
                  <EmptyState icon={<AlertTriangle className="w-8 h-8 text-red-300" />} message="오픈 리스크가 없습니다" />
                )}
                {risks.map(risk => {
                  const cfg = riskLevelConfig[risk.level] || riskLevelConfig['낮음']
                  return (
                    <button
                      key={risk.id}
                      onClick={() => setSelectedId(selectedId === risk.id ? null : risk.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedId === risk.id
                          ? `${cfg.border} ${cfg.bg} shadow-md`
                          : risk.is_resolved
                          ? 'border-slate-100 bg-slate-50 opacity-50'
                          : `border-slate-200 bg-white hover:${cfg.border} hover:shadow-sm`
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`flex-shrink-0 mt-0.5`}>
                          <Badge className={`text-xs ${cfg.bg} ${cfg.color} border-0 px-1.5`}>{cfg.label}</Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-snug">{risk.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">{risk.risk_type?.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(risk.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                            {risk.is_resolved && <span className="text-xs text-green-600">✓ 해결됨</span>}
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5 transition-transform ${selectedId === risk.id ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {/* ── 보고 탭 ── */}
            {activeTab === 'reports' && (
              <>
                {reports.length === 0 && (
                  <EmptyState icon={<FileText className="w-8 h-8 text-blue-300" />} message="보고 내역이 없습니다" />
                )}
                {reports.map(report => {
                  const assessment = report.daily_assessments?.[0]
                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedId(selectedId === report.id ? null : report.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedId === report.id
                          ? 'border-blue-400 bg-blue-50 shadow-md'
                          : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-blue-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-800">{report.report_date}</span>
                            {assessment && (
                              <Badge className={`text-xs ${signalColors[assessment.alignment_signal] || ''}`}>
                                {assessment.alignment_signal}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 truncate">{report.summary}</p>
                          {report.blocker && (
                            <p className="text-xs text-orange-600 mt-0.5 truncate">⛔ {report.blocker}</p>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5 transition-transform ${selectedId === report.id ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>

          {/* ─── 상세 패널 ──────────────────────────────────────────────────── */}
          {hasPanel && (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-4 self-start sticky top-6 max-h-[calc(100vh-160px)] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">상세 보기</h3>
                <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Must-Check 상세 */}
              {selectedMustCheck && (
                <MustCheckDetail
                  item={selectedMustCheck}
                  featureName={getFeatureName(selectedMustCheck.related_feature_id)}
                  processing={processingId === selectedMustCheck.id}
                  onResolve={() => resolveMustCheck(selectedMustCheck.id)}
                />
              )}

              {/* 의사결정 상세 */}
              {selectedDecision && (
                <DecisionDetail
                  decision={selectedDecision}
                  featureName={getFeatureName(selectedDecision.related_feature_id)}
                  processing={processingId === selectedDecision.id}
                  decisionText={decisionText[selectedDecision.id] || ''}
                  onTextChange={(text) => setDecisionText(prev => ({ ...prev, [selectedDecision.id]: text }))}
                  onDecide={(status) => decide(selectedDecision.id, status)}
                />
              )}

              {/* 리스크 상세 */}
              {selectedRisk && (
                <RiskDetail
                  risk={selectedRisk}
                  featureName={getFeatureName(selectedRisk.related_feature_id)}
                  processing={processingId === selectedRisk.id}
                  onResolve={() => resolveRisk(selectedRisk.id)}
                />
              )}

              {/* 보고 상세 */}
              {selectedReport && (
                <ReportDetail
                  report={selectedReport}
                  features={features}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 opacity-40">{icon}</div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  )
}

// ─── Must-Check 상세 패널 ──────────────────────────────────────────────────────

function MustCheckDetail({
  item, featureName, processing, onResolve
}: {
  item: MustCheckItem
  featureName: string | null
  processing: boolean
  onResolve: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
            {triggerLabels[item.trigger_type] || item.trigger_type}
          </span>
        </div>
        <h4 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h4>
        {item.description && (
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.description}</p>
        )}
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-1.5 text-xs text-purple-800">
        <div className="font-semibold text-purple-900 mb-1">📌 왜 대표가 직접 봐야 하나요?</div>
        <div>
          {item.trigger_type === '정책_범위_비용_변경' && '정책·범위·비용 변경이 감지되었습니다. 대표 확인 없이 진행하면 나중에 분쟁의 빌미가 될 수 있습니다.'}
          {item.trigger_type === '반복_blocker' && '같은 문제가 반복적으로 발생하고 있습니다. 방치하면 납기 지연으로 이어질 수 있습니다.'}
          {item.trigger_type === '완료_후보_검수' && '기능 완료 후보가 제출되었습니다. 대표가 직접 검수를 완료해야 최종 승인 처리됩니다.'}
          {item.trigger_type === '점검_권장_신호' && 'AI가 점검이 필요한 이상 신호를 감지했습니다. 빠른 확인이 필요합니다.'}
          {item.trigger_type === '외주사_확인_요청' && '외주사가 대표 확인을 명시적으로 요청했습니다.'}
          {item.trigger_type === 'Weekly_Plan_미달성_누적' && '주간 계획이 연속으로 미달성되고 있습니다. 원인 파악이 필요합니다.'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <div className="font-medium text-slate-700 mb-0.5">발생일</div>
          <div>{new Date(item.created_at).toLocaleDateString('ko-KR')}</div>
        </div>
        {featureName && (
          <div>
            <div className="font-medium text-slate-700 mb-0.5">연관 기능</div>
            <div className="truncate">{featureName}</div>
          </div>
        )}
        {item.is_resolved && item.resolved_at && (
          <div>
            <div className="font-medium text-slate-700 mb-0.5">해결일</div>
            <div>{new Date(item.resolved_at).toLocaleDateString('ko-KR')}</div>
          </div>
        )}
      </div>

      {!item.is_resolved && (
        <Button
          className="w-full gap-2 bg-purple-600 hover:bg-purple-500"
          disabled={processing}
          onClick={onResolve}
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          확인 완료로 처리
        </Button>
      )}
      {item.is_resolved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span>이미 해결된 항목입니다</span>
        </div>
      )}
    </div>
  )
}

// ─── 의사결정 상세 패널 ────────────────────────────────────────────────────────

function DecisionDetail({
  decision, featureName, processing, decisionText, onTextChange, onDecide
}: {
  decision: Decision
  featureName: string | null
  processing: boolean
  decisionText: string
  onTextChange: (text: string) => void
  onDecide: (status: DecisionStatus) => void
}) {
  const config = decisionStatusConfig[decision.status]
  const isPending = decision.status === 'pending'

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-4 h-4 text-orange-600" />
          <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
          {decision.decision_type && (
            <span className="text-xs text-slate-400">{decision.decision_type}</span>
          )}
        </div>
        <h4 className="text-base font-bold text-slate-900 leading-snug">{decision.title}</h4>
        {decision.description && (
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{decision.description}</p>
        )}
      </div>

      {decision.context && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
          <div className="text-xs font-semibold text-orange-800 mb-1">📋 배경/상황</div>
          <p className="text-sm text-orange-800 leading-relaxed">{decision.context}</p>
        </div>
      )}

      {decision.options && decision.options.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">선택 옵션</div>
          {decision.options.map((opt, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <div className="text-xs font-semibold text-slate-800">{opt.label}</div>
              {opt.description && <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>}
            </div>
          ))}
        </div>
      )}

      {decision.ai_recommendation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <div className="text-xs font-semibold text-blue-800 mb-1">🤖 AI 권장</div>
          <p className="text-sm text-blue-800 leading-relaxed">{decision.ai_recommendation}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <div className="font-medium text-slate-700 mb-0.5">요청일</div>
          <div>{new Date(decision.created_at).toLocaleDateString('ko-KR')}</div>
        </div>
        {featureName && (
          <div>
            <div className="font-medium text-slate-700 mb-0.5">연관 기능</div>
            <div className="truncate">{featureName}</div>
          </div>
        )}
        {!isPending && decision.decided_at && (
          <div>
            <div className="font-medium text-slate-700 mb-0.5">결정일</div>
            <div>{new Date(decision.decided_at).toLocaleDateString('ko-KR')}</div>
          </div>
        )}
      </div>

      {!isPending && decision.founder_decision && (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="text-xs font-semibold text-slate-700 mb-1">대표 결정 내용</div>
          <p className="text-sm text-slate-700">{decision.founder_decision}</p>
        </div>
      )}

      {isPending && (
        <div className="space-y-3">
          <Textarea
            placeholder="결정 내용이나 코멘트를 입력하세요 (선택)"
            value={decisionText}
            onChange={e => onTextChange(e.target.value)}
            className="text-sm min-h-[70px] resize-none"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-500 text-sm"
              disabled={processing}
              onClick={() => onDecide('approved')}
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              승인
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 border-red-200 text-red-700 hover:bg-red-50 text-sm"
              disabled={processing}
              onClick={() => onDecide('rejected')}
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              반려
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
              disabled={processing}
              onClick={() => onDecide('deferred')}
            >
              <Clock className="w-3.5 h-3.5" />
              보류
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 리스크 상세 패널 ──────────────────────────────────────────────────────────

function RiskDetail({
  risk, featureName, processing, onResolve
}: {
  risk: Risk
  featureName: string | null
  processing: boolean
  onResolve: () => void
}) {
  const cfg = riskLevelConfig[risk.level] || riskLevelConfig['낮음']

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <Badge className={`text-xs ${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
          <span className="text-xs text-slate-400">{risk.risk_type?.replace(/_/g, ' ')}</span>
        </div>
        <h4 className="text-base font-bold text-slate-900 leading-snug">{risk.title}</h4>
        {risk.description && (
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{risk.description}</p>
        )}
      </div>

      <div className={`rounded-xl p-3 border ${cfg.border} ${cfg.bg}`}>
        <div className={`text-xs font-semibold ${cfg.color} mb-1`}>⚠️ 이 리스크가 해결되지 않으면</div>
        <p className={`text-sm ${cfg.color} leading-relaxed`}>
          {risk.level === '위험' && '납기일이 지연되거나 추가 비용이 발생할 가능성이 높습니다. 즉각 조치가 필요합니다.'}
          {risk.level === '주의' && '방치하면 위험 수준으로 격상될 수 있습니다. 이번 주 안에 해소 계획을 세워야 합니다.'}
          {risk.level === '낮음' && '당장 긴급하지는 않지만 정기적으로 모니터링이 필요합니다.'}
          {risk.level === 'Must_Check_필요' && '대표가 반드시 직접 확인하고 의사결정해야 하는 리스크입니다.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <div className="font-medium text-slate-700 mb-0.5">발생일</div>
          <div>{new Date(risk.created_at).toLocaleDateString('ko-KR')}</div>
        </div>
        {featureName && (
          <div>
            <div className="font-medium text-slate-700 mb-0.5">연관 기능</div>
            <div className="truncate">{featureName}</div>
          </div>
        )}
        {risk.is_resolved && risk.resolved_at && (
          <div>
            <div className="font-medium text-slate-700 mb-0.5">해결일</div>
            <div>{new Date(risk.resolved_at).toLocaleDateString('ko-KR')}</div>
          </div>
        )}
      </div>

      {!risk.is_resolved && (
        <Button
          className="w-full gap-2 bg-slate-800 hover:bg-slate-700"
          disabled={processing}
          onClick={onResolve}
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          리스크 해결 완료
        </Button>
      )}
      {risk.is_resolved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span>해결된 리스크입니다</span>
        </div>
      )}
    </div>
  )
}

// ─── 보고 상세 패널 ──────────────────────────────────────────────────────────

function ReportDetail({ report, features }: { report: Report; features: Feature[] }) {
  const assessment = report.daily_assessments?.[0]
  const relatedFeatures = features.filter(f => report.related_feature_ids?.includes(f.id))

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-900">{report.report_date} 일일 보고</span>
          {assessment && (
            <Badge className={`text-xs ${signalColors[assessment.alignment_signal] || ''}`}>
              {assessment.alignment_signal}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{report.summary}</p>
      </div>

      {report.blocker && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <div className="text-xs font-semibold text-orange-800 mb-1">⛔ 막힌 점 (대표 확인 필요)</div>
          <p className="text-sm text-orange-800 leading-relaxed">{report.blocker}</p>
        </div>
      )}

      {report.tomorrow_plan && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-700 mb-1">📅 내일 계획</div>
          <p className="text-sm text-slate-600 leading-relaxed">{report.tomorrow_plan}</p>
        </div>
      )}

      {assessment && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">AI 판단</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '기능 정합', score: assessment.spec_alignment_score },
              { label: '주간계획', score: assessment.weekly_plan_score },
              { label: '증빙 강도', score: assessment.evidence_score },
            ].map(({ label, score }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-2 text-center">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className={`text-lg font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {score}
                </div>
              </div>
            ))}
          </div>
          {assessment.ai_comment && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="text-xs font-semibold text-blue-800 mb-1">🤖 AI 코멘트</div>
              <p className="text-sm text-blue-800 leading-relaxed">{assessment.ai_comment}</p>
            </div>
          )}
        </div>
      )}

      {relatedFeatures.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-1.5">관련 기능</div>
          <div className="flex flex-wrap gap-1.5">
            {relatedFeatures.map(f => (
              <span key={f.id} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{f.name}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <div className="font-medium text-slate-700 mb-0.5">제출 시간</div>
          <div>{new Date(report.submitted_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div>
          <div className="font-medium text-slate-700 mb-0.5">작업 유형</div>
          <div>{report.work_types?.join(', ') || '—'}</div>
        </div>
      </div>
    </div>
  )
}
