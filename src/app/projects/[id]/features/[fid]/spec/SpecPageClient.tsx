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
  FileText, Users, Target, Layout, Bell, Shield, Database, AlertCircle,
  Send, Eye, MessageSquare, ChevronRight,
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

// 기능 정의서 협업 상태 계산
function getSpecCollabStatus(spec: Spec | null, featureStatus: string) {
  if (!spec) return 'no_spec'
  if (featureStatus === 'approved') return 'approved'
  if (spec.status === 'approved') return 'final_approved'  // 대표 최종 승인
  const sentAt = (spec as Spec & { sent_at?: string | null }).sent_at
  const viewedAt = (spec as Spec & { viewed_at?: string | null }).viewed_at
  // vendor_answer_drafts에 수정 제안이 포함됐는지
  const hasVendorSuggestion = spec.vendor_answer_drafts?.includes('[외주사 수정 제안')
  if (hasVendorSuggestion) return 'vendor_reviewed'  // 외주사 수정 제안 있음
  if (viewedAt) return 'vendor_viewed'               // 외주사가 열람
  if (sentAt) return 'sent'                          // 외주사에게 전송됨
  return 'draft'                                     // 초안 (미전송)
}

const COLLAB_STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  no_spec: { label: '정의서 없음', color: 'bg-slate-100 text-slate-500', desc: '' },
  draft: { label: '초안 작성됨', color: 'bg-yellow-100 text-yellow-700', desc: '외주사에게 아직 전송하지 않았습니다.' },
  sent: { label: '외주사 전송됨', color: 'bg-blue-100 text-blue-700', desc: '외주사가 아직 열람하지 않았습니다.' },
  vendor_viewed: { label: '외주사 열람', color: 'bg-purple-100 text-purple-700', desc: '외주사가 정의서를 확인했습니다. 수정 제안을 기다리고 있습니다.' },
  vendor_reviewed: { label: '수정 제안 도착', color: 'bg-orange-100 text-orange-700', desc: '외주사가 수정 제안을 제출했습니다. 검토 후 최종 승인해주세요.' },
  final_approved: { label: '최종 승인됨', color: 'bg-green-100 text-green-700', desc: '대표가 최종 승인한 기능 정의서입니다.' },
  approved: { label: '개발 완료', color: 'bg-green-200 text-green-800', desc: '기능 개발이 완료된 상태입니다.' },
}

export default function SpecPageClient({ projectId, feature, spec }: SpecPageClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(spec?.raw_content || '')
  const [currentSpec, setCurrentSpec] = useState(spec)
  const [genError, setGenError] = useState<string | null>(null)

  const collabStatus = getSpecCollabStatus(currentSpec, feature.status)
  const statusInfo = COLLAB_STATUS_LABELS[collabStatus]

  const generateSpec = async () => {
    setIsGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`/api/features/${feature.id}/spec`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        const errType = data.errorType || 'unknown'
        const errMessages: Record<string, string> = {
          validation: '입력 데이터 부족 — 기능명이나 설명을 먼저 채워주세요',
          api_key: 'OpenAI API 키 오류 — 기본 템플릿으로 재시도합니다',
          timeout: 'AI 응답 시간 초과 (55초) — 잠시 후 재시도해주세요',
          rate_limit: 'API 한도 초과 — 1분 후 재시도해주세요',
          quota: 'OpenAI 크레딧 부족 — 충전 후 재시도해주세요',
          db_error: `DB 저장 실패 — ${data.error}`,
          not_found: '기능을 찾을 수 없습니다',
          auth: '로그인이 필요합니다',
        }
        throw new Error(errMessages[errType] || data.error || '알 수 없는 오류')
      }
      setCurrentSpec(data.spec)
      setEditContent(data.spec.raw_content || '')
      if (data.isFallback) {
        toast.info('OpenAI 연결 없이 기본 템플릿으로 생성됐습니다. [직접 작성 필요] 항목을 채워주세요.')
      } else {
        toast.success(`AI 기능 정의서 v${data.version} 생성 완료`)
      }
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '생성 실패'
      setGenError(msg)
      toast.error(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  // 외주사에게 전송
  const sendToVendor = async () => {
    if (!currentSpec) return
    setIsSending(true)
    try {
      const res = await fetch(`/api/features/${feature.id}/spec/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // sent_at을 로컬 상태에 반영
      setCurrentSpec(prev => prev ? { ...prev, sent_at: data.sent_at } as typeof prev : null)
      toast.success('외주사에게 기능 정의서를 전송했습니다. 외주사 포털에서 확인 가능합니다.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '전송 실패')
    } finally {
      setIsSending(false)
    }
  }

  // 최종 승인
  const approveSpec = async () => {
    setIsApproving(true)
    try {
      const res = await fetch(`/api/features/${feature.id}/spec/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('승인 실패')
      setCurrentSpec(prev => prev ? { ...prev, status: 'approved' } : null)
      toast.success('기능 정의서가 최종 승인되었습니다')
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
      router.refresh()
    } catch {
      toast.error('저장 실패')
    }
  }

  const isFinalApproved = currentSpec?.status === 'approved'
  // vendor가 수정 제안 남겼는지
  const vendorSuggestionText = currentSpec?.vendor_answer_drafts?.includes('[외주사 수정 제안')
    ? currentSpec.vendor_answer_drafts.split('[외주사 수정 제안').slice(1).map(s => '[외주사 수정 제안' + s).join('\n\n---\n\n')
    : null

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <Link href={`/projects/${projectId}/features`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" />
        기능 목록으로
      </Link>

      {/* Feature Header */}
      <div className="flex items-start justify-between mb-4">
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
            {statusInfo && (
              <Badge className={`text-xs ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">{feature.name}</h2>
          {feature.description && (
            <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0 ml-4 flex-wrap justify-end">
          {!currentSpec && (
            <Button onClick={generateSpec} disabled={isGenerating} className="gap-2 bg-blue-600 hover:bg-blue-500">
              <Zap className="w-4 h-4" />
              {isGenerating ? 'AI 생성 중...' : 'AI 기능 정의서 생성'}
            </Button>
          )}

          {currentSpec && (
            <>
              <Button onClick={generateSpec} disabled={isGenerating} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {isFinalApproved ? '새 버전 생성' : '재생성'}
              </Button>

              {!isFinalApproved && (
                <Button onClick={() => setIsEditing(!isEditing)} variant="outline" size="sm" className="gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  수정
                </Button>
              )}

              {/* 외주사 전송 버튼 — draft 상태에서 전송 가능 */}
              {!isFinalApproved && (
                <Button
                  onClick={sendToVendor}
                  disabled={isSending}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? '전송 중...' : collabStatus === 'sent' || collabStatus === 'vendor_viewed' || collabStatus === 'vendor_reviewed' ? '재전송' : '외주사에게 전송'}
                </Button>
              )}

              {/* 최종 승인 — 외주사가 봤거나 수정 제안 있을 때 강조 */}
              {!isFinalApproved && (
                <Button
                  onClick={approveSpec}
                  disabled={isApproving}
                  size="sm"
                  className={`gap-1.5 ${
                    collabStatus === 'vendor_reviewed'
                      ? 'bg-orange-600 hover:bg-orange-500'
                      : 'bg-green-600 hover:bg-green-500'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isApproving ? '승인 중...' : '최종 승인'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 협업 상태 안내 바 */}
      {currentSpec && statusInfo.desc && (
        <div className={`mb-4 p-3 rounded-lg border text-sm flex items-start gap-2 ${
          collabStatus === 'vendor_reviewed' ? 'bg-orange-50 border-orange-200 text-orange-800' :
          collabStatus === 'final_approved' ? 'bg-green-50 border-green-200 text-green-800' :
          collabStatus === 'sent' || collabStatus === 'vendor_viewed' ? 'bg-blue-50 border-blue-200 text-blue-800' :
          'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          {collabStatus === 'vendor_reviewed' ? <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
           collabStatus === 'final_approved' ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
           collabStatus === 'vendor_viewed' ? <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" /> :
           <Send className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <div>
            <span className="font-semibold">[{statusInfo.label}]</span> {statusInfo.desc}
            {collabStatus === 'draft' && (
              <span className="ml-2 text-xs opacity-70">↑ "외주사에게 전송" 버튼을 눌러 확인 요청을 보내세요</span>
            )}
            {collabStatus === 'vendor_reviewed' && (
              <span className="ml-2 text-xs opacity-70">↓ 아래 "외주사 수정 제안" 탭을 확인하세요</span>
            )}
          </div>
        </div>
      )}

      {/* 3단계 플로우 표시 */}
      {currentSpec && !isFinalApproved && (
        <div className="flex items-center gap-1 mb-5 text-xs text-slate-500">
          <span className={`px-2 py-1 rounded-full font-medium ${collabStatus === 'draft' ? 'bg-blue-600 text-white' : 'bg-green-100 text-green-700'}`}>
            1. 초안 작성
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className={`px-2 py-1 rounded-full font-medium ${['sent', 'vendor_viewed'].includes(collabStatus) ? 'bg-blue-600 text-white' : ['vendor_reviewed', 'final_approved'].includes(collabStatus) ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
            2. 외주사 검토
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className={`px-2 py-1 rounded-full font-medium ${['vendor_reviewed'].includes(collabStatus) ? 'bg-orange-500 text-white' : collabStatus === 'final_approved' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
            3. 최종 승인
          </span>
        </div>
      )}

      {/* No spec yet */}
      {!currentSpec && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="py-10 text-center">
            <FileText className="w-12 h-12 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">AI 기능 정의서가 없습니다</h3>
            <p className="text-slate-500 text-sm mb-2">
              기능 정보를 바탕으로 AI가 상세 기능 정의서를 자동 생성합니다.
            </p>
            <p className="text-xs text-slate-400 mb-5">
              기능 목적 · 범위 · 화면 흐름 · QA 체크리스트 · 외주사 예상 질문 포함<br />
              <span className="text-blue-500">OpenAI API 키 미설정 시 편집 가능한 기본 템플릿이 생성됩니다</span>
            </p>
            {genError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left max-w-sm mx-auto">
                <p className="text-xs font-semibold text-red-700 mb-1">생성 실패 원인</p>
                <p className="text-xs text-red-600">{genError}</p>
              </div>
            )}
            <Button
              onClick={generateSpec}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-500 gap-2"
            >
              <Zap className="w-4 h-4" />
              {isGenerating ? 'AI 분석 중... (30초~1분)' : genError ? '재시도' : 'AI 기능 정의서 생성'}
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
            {vendorSuggestionText && (
              <TabsTrigger value="vendor_suggestion" className="text-orange-600">
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                외주사 수정 제안
              </TabsTrigger>
            )}
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

            {currentSpec.vendor_expected_questions && (
              <Card className="border-purple-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-purple-700">외주사 예상 질문 & 답변 초안</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">예상 질문</p>
                    <div className="bg-purple-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                      {currentSpec.vendor_expected_questions}
                    </div>
                  </div>
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

          {/* 외주사 수정 제안 탭 */}
          {vendorSuggestionText && (
            <TabsContent value="vendor_suggestion">
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <CardTitle className="text-sm text-orange-800">외주사 수정 제안</CardTitle>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    외주사가 이 기능 정의서에 수정 의견을 남겼습니다. 검토 후 직접 정의서를 수정하거나 최종 승인하세요.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border border-orange-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {vendorSuggestionText}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-orange-300 text-orange-700"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      제안 반영해서 정의서 수정
                    </Button>
                    <Button
                      onClick={approveSpec}
                      disabled={isApproving}
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-500"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      그대로 최종 승인
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

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
