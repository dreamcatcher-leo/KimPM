'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ArrowLeft, Zap, Save, CheckCircle, Edit, RefreshCw,
  FileText, Users, Target, Layout, Bell, Shield, Database, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import type { Feature, Spec } from '@/types'

interface SpecPageClientProps {
  projectId: string
  feature: Feature & { projects: { name: string; goal: string } }
  spec: Spec | null
}

const categoryLabels: Record<string, string> = {
  '신규_개발': '신규 개발',
  '기존_보완': '기존 보완',
  '신규_개발_기존_보완': '신규+보완',
  '정책_반영': '정책 반영',
  '어드민_기능': '어드민',
  '후순위_보류': '후순위',
}

function SpecSection({ title, icon: Icon, content }: { title: string; icon: React.ElementType; content: string | null }) {
  if (!content) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="w-4 h-4 text-blue-500" />
        {title}
      </div>
      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  )
}

export default function SpecPageClient({ projectId, feature, spec }: SpecPageClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(spec?.raw_content || '')
  const [currentSpec, setCurrentSpec] = useState(spec)

  const generateSpec = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/features/${feature.id}/spec`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentSpec(data.spec)
      setEditContent(data.spec.raw_content || '')
      toast.success('AI 기능 정의서가 생성되었습니다')
      router.refresh()
    } catch (err) {
      toast.error('정의서 생성 실패')
    } finally {
      setIsGenerating(false)
    }
  }

  const approveSpec = async () => {
    setIsApproving(true)
    try {
      const res = await fetch(`/api/features/${feature.id}/spec/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('승인 실패')
      setCurrentSpec(prev => prev ? { ...prev, status: 'approved' } : null)
      toast.success('기능 정의서가 승인되었습니다')
      router.refresh()
    } catch {
      toast.error('승인 실패')
    } finally {
      setIsApproving(false)
    }
  }

  const saveEdit = async () => {
    try {
      const res = await fetch(`/api/features/${feature.id}/spec`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_content: editContent }),
      })
      if (!res.ok) throw new Error()
      toast.success('저장되었습니다')
      setIsEditing(false)
    } catch {
      toast.error('저장 실패')
    }
  }

  const isApproved = currentSpec?.status === 'approved'

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <Link href={`/projects/${projectId}/features`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" />
        기능 목록으로
      </Link>

      {/* Feature Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
              {feature.order_key}
            </span>
            <Badge variant="outline" className="text-xs">
              {categoryLabels[feature.category]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {feature.priority_group}
            </Badge>
            {isApproved && (
              <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                <CheckCircle className="w-3 h-3" />
                승인됨
              </Badge>
            )}
            {currentSpec?.status === 'draft' && (
              <Badge className="bg-yellow-100 text-yellow-700 text-xs">초안</Badge>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">{feature.name}</h2>
          {feature.description && (
            <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0 ml-4">
          {!currentSpec && (
            <Button
              onClick={generateSpec}
              disabled={isGenerating}
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              <Zap className="w-4 h-4" />
              {isGenerating ? 'AI 생성 중...' : 'AI 기능 정의서 생성'}
            </Button>
          )}
          {currentSpec && currentSpec.status === 'draft' && (
            <>
              <Button onClick={generateSpec} disabled={isGenerating} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                재생성
              </Button>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                수정
              </Button>
              <Button
                onClick={approveSpec}
                disabled={isApproving}
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-500"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {isApproving ? '승인 중...' : '승인'}
              </Button>
            </>
          )}
          {isApproved && (
            <Button onClick={generateSpec} disabled={isGenerating} variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              새 버전 생성
            </Button>
          )}
        </div>
      </div>

      {/* No spec yet */}
      {!currentSpec && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">AI 기능 정의서가 없습니다</h3>
            <p className="text-slate-500 text-sm mb-6">
              기능 정보를 바탕으로 AI가 상세 기능 정의서를 자동 생성합니다.<br />
              배경, 범위, 화면 흐름, QA 체크리스트, 외주사 예상 질문까지 포함됩니다.
            </p>
            <Button
              onClick={generateSpec}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-500 gap-2"
            >
              <Zap className="w-4 h-4" />
              {isGenerating ? '생성 중... (30초 ~ 1분)' : 'AI 기능 정의서 생성'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Spec Content */}
      {currentSpec && (
        <Tabs defaultValue="structured">
          <TabsList className="mb-4">
            <TabsTrigger value="structured">구조화 보기</TabsTrigger>
            <TabsTrigger value="raw">전문 보기</TabsTrigger>
            {isEditing && <TabsTrigger value="edit">수정 모드</TabsTrigger>}
          </TabsList>

          <TabsContent value="structured" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <SpecSection title="기능 배경" icon={FileText} content={currentSpec.background} />
              <SpecSection title="현재 문제" icon={AlertCircle} content={currentSpec.current_problem} />
              <SpecSection title="관련 사용자" icon={Users} content={currentSpec.related_users} />

              <div className="grid grid-cols-2 gap-4">
                <SpecSection title="포함 범위 (In Scope)" icon={CheckCircle} content={currentSpec.in_scope} />
                <SpecSection title="제외 범위 (Out of Scope)" icon={AlertCircle} content={currentSpec.out_of_scope} />
              </div>

              <SpecSection title="화면 흐름" icon={Layout} content={currentSpec.screen_flow} />
              <SpecSection title="상태값" icon={Target} content={currentSpec.state_values} />
              <SpecSection title="알림 조건" icon={Bell} content={currentSpec.notification_conditions} />
              <SpecSection title="어드민 기능" icon={Shield} content={currentSpec.admin_features} />
              <SpecSection title="데이터 항목" icon={Database} content={currentSpec.data_items} />
              <SpecSection title="예외 케이스" icon={AlertCircle} content={currentSpec.edge_cases} />
              <SpecSection title="수용 기준" icon={CheckCircle} content={currentSpec.acceptance_criteria} />
            </div>

            {(currentSpec.vendor_expected_questions || currentSpec.vendor_answer_drafts) && (
              <Card className="border-purple-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-purple-700">외주사 예상 질문 & 답변 초안</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentSpec.vendor_expected_questions && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">예상 질문</p>
                      <div className="bg-purple-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                        {currentSpec.vendor_expected_questions}
                      </div>
                    </div>
                  )}
                  {currentSpec.vendor_answer_drafts && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">답변 초안</p>
                      <div className="bg-blue-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                        {currentSpec.vendor_answer_drafts}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono bg-slate-50 rounded-lg p-4 max-h-[600px] overflow-auto">
                  {currentSpec.raw_content || '내용 없음'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isEditing && (
            <TabsContent value="edit">
              <Card>
                <CardContent className="pt-4">
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={30}
                    className="font-mono text-sm"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button onClick={saveEdit} size="sm" className="gap-2">
                      <Save className="w-3.5 h-3.5" />
                      저장
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}
