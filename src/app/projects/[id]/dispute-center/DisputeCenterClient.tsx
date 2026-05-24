'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

interface Stats {
  totalDecisions: number
  approvedDecisions: number
  totalChangeRequests: number
  approvedChanges: number
  totalQuestions: number
  answeredQuestions: number
  totalReports: number
  totalEvidence: number
  approvedWeeklyPlans: number
  totalFeatures: number
  completedFeatures: number
}

interface DisputeRisk {
  level: string
  title: string
  description: string
  link: string
}

interface TimelineItem {
  date: string
  type: string
  title: string
  detail?: string | null
  badge?: string
}

interface Props {
  projectId: string
  projectName: string
  vendorName: string
  contractStart: string
  contractEnd: string
  stats: Stats
  disputeRisks: DisputeRisk[]
  timeline: TimelineItem[]
  decisions: Record<string, unknown>[]
  changeRequests: Record<string, unknown>[]
  questions: Record<string, unknown>[]
  weeklyPlans: Record<string, unknown>[]
  reports: Record<string, unknown>[]
}

export default function DisputeCenterClient({
  projectName, vendorName, contractStart, contractEnd,
  stats, disputeRisks, timeline,
  decisions, changeRequests, questions, weeklyPlans, reports,
}: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    try {
      const now = new Date().toLocaleDateString('ko-KR')
      const checklist = [
        { label: '의사결정 문서화', ok: stats.approvedDecisions > 0, detail: `${stats.approvedDecisions}/${stats.totalDecisions}건 승인` },
        { label: '질문 90% 이상 답변', ok: stats.answeredQuestions >= stats.totalQuestions * 0.9 || stats.totalQuestions === 0, detail: `${stats.answeredQuestions}/${stats.totalQuestions}건` },
        { label: '변경 요청 전부 처리', ok: stats.approvedChanges >= stats.totalChangeRequests || stats.totalChangeRequests === 0, detail: `${stats.approvedChanges}/${stats.totalChangeRequests}건` },
        { label: '주간 계획 승인 이력', ok: stats.approvedWeeklyPlans > 0, detail: `${stats.approvedWeeklyPlans}건 승인` },
        { label: '증빙 자료 제출', ok: stats.totalEvidence > 0, detail: `${stats.totalEvidence}건` },
      ]

      const lines = [
        `# DeliveryGuard PM — 분쟁 대비 패킷`,
        `생성일: ${now}`,
        `프로젝트: ${projectName} / 외주사: ${vendorName}`,
        `계약 기간: ${contractStart} ~ ${contractEnd}`,
        ``,
        `## 분쟁 위험 (자동 감지)`,
        disputeRisks.length === 0
          ? '  감지된 위험 없음'
          : disputeRisks.map(r => `  [${r.level.toUpperCase()}] ${r.title}\n  → ${r.description}`).join('\n'),
        ``,
        `## 분쟁 대비 체크리스트`,
        checklist.map(c => `  [${c.ok ? 'O' : 'X'}] ${c.label} (${c.detail})`).join('\n'),
        ``,
        `## 합의 & 의사결정 타임라인 (${timeline.length}건)`,
        timeline.map(t =>
          `  [${new Date(t.date).toLocaleDateString('ko-KR')}] [${t.type}/${t.badge || '-'}] ${t.title}${t.detail ? ` — ${t.detail}` : ''}`
        ).join('\n'),
        ``,
        `## 의사결정 전체 (${decisions.length}건)`,
        decisions.map((d: Record<string, unknown>) =>
          `  [${String(d.status || '')}] ${String(d.title || '')} (${String((d.created_at as string)?.slice(0, 10) || '')})`
        ).join('\n'),
        ``,
        `## 변경 요청 전체 (${changeRequests.length}건)`,
        changeRequests.map((cr: Record<string, unknown>) =>
          `  [${String(cr.status || '')}] ${String(cr.title || '')} | 일정영향: ${String(cr.schedule_impact || '없음')} | 비용영향: ${String(cr.cost_impact || '없음')} (${String((cr.created_at as string)?.slice(0, 10) || '')})`
        ).join('\n'),
        ``,
        `## 질문 & 합의 기록 (${questions.length}건)`,
        questions.map((q: Record<string, unknown>) =>
          `  [${q.answer ? '답변완료' : '대기중'}] ${String(q.question || '').slice(0, 80)}${q.answer ? ` → ${String(q.answer || '').slice(0, 60)}` : ''} (${String((q.created_at as string)?.slice(0, 10) || '')})`
        ).join('\n'),
        ``,
        `## 주간 계획 (${weeklyPlans.length}건)`,
        weeklyPlans.map((wp: Record<string, unknown>) =>
          `  [${String(wp.status || '')}] ${String(wp.week_start || '')} ~ ${String(wp.week_end || '')} | 승인: ${wp.founder_approved_at ? String((wp.founder_approved_at as string).slice(0, 10)) : '미승인'}`
        ).join('\n'),
        ``,
        `## 일일 보고 요약 (${reports.length}건)`,
        reports.slice(0, 50).map((r: Record<string, unknown>) =>
          `  [${String(r.report_date || '')}] ${String(r.summary || '').slice(0, 80)}`
        ).join('\n'),
        ``,
        `---`,
        `이 패킷은 DeliveryGuard PM에서 자동 생성되었습니다.`,
        `실제 분쟁 시 원본 데이터(Supabase)를 함께 제출하세요.`,
      ]

      const content = lines.join('\n')
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `분쟁대비패킷_${projectName}_${now.replace(/\./g, '')}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('분쟁 대비 패킷이 다운로드되었습니다')
    } catch {
      toast.error('내보내기 실패')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
    >
      <Download className="w-4 h-4" />
      {isExporting ? '생성 중...' : '분쟁 대비 패킷 내보내기'}
    </Button>
  )
}
