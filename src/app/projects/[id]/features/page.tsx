import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileText, ChevronRight, CheckCircle, Clock, Zap } from 'lucide-react'
import type { Feature } from '@/types'

const categoryLabels: Record<string, string> = {
  '신규_개발': '신규 개발',
  '기존_보완': '기존 보완',
  '신규_개발_기존_보완': '신규+보완',
  '정책_반영': '정책 반영',
  '어드민_기능': '어드민',
  '후순위_보류': '후순위',
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: '계획 중', color: 'bg-gray-100 text-gray-600' },
  spec_draft: { label: '정의서 초안', color: 'bg-yellow-100 text-yellow-700' },
  spec_approved: { label: '정의서 승인', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '개발 중', color: 'bg-purple-100 text-purple-700' },
  completed_candidate: { label: '완료 후보', color: 'bg-orange-100 text-orange-700' },
  approved: { label: '완료 승인', color: 'bg-green-100 text-green-700' },
  on_hold: { label: '보류', color: 'bg-red-100 text-red-600' },
}

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: features } = await supabase
    .from('features')
    .select('*')
    .eq('project_id', id)
    .order('order_key') as { data: Feature[] | null }

  const grouped = (features || []).reduce((acc, feature) => {
    const group = feature.priority_group
    if (!acc[group]) acc[group] = []
    acc[group].push(feature)
    return acc
  }, {} as Record<string, Feature[]>)

  const groups = ['P0', 'P1', 'P2', 'P3'].filter(g => grouped[g]?.length > 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">기능 목록</h2>
          <p className="text-sm text-slate-500 mt-0.5">총 {features?.length || 0}개 기능</p>
        </div>
        <Link href={`/projects/${id}/features/new`}>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-500">
            <Plus className="w-4 h-4" />
            기능 추가
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`px-2.5 py-0.5 rounded-full text-sm font-bold ${
                group === 'P0' ? 'bg-red-100 text-red-700' :
                group === 'P1' ? 'bg-orange-100 text-orange-700' :
                group === 'P2' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {group}
              </div>
              <span className="text-sm text-slate-500">{grouped[group].length}개</span>
            </div>

            <div className="space-y-2">
              {grouped[group].map(feature => {
                const status = statusConfig[feature.status] || statusConfig.planning
                return (
                  <Link key={feature.id} href={`/projects/${id}/features/${feature.id}/spec`}>
                    <Card className="hover:shadow-sm transition-shadow cursor-pointer group">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-400 w-12 flex-shrink-0">
                            {feature.order_key}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {feature.name}
                            </p>
                            {feature.description && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {feature.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-xs py-0 h-5">
                              {categoryLabels[feature.category] || feature.category}
                            </Badge>
                            <Badge className={`text-xs py-0 h-5 ${status.color}`}>
                              {status.label}
                            </Badge>
                            {feature.status === 'approved' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {feature.status === 'planning' && (
                              <Clock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {features?.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">기능이 없습니다</h3>
            <p className="text-slate-400 text-sm mb-4">기능을 추가하거나 프로젝트 생성 시 시드 데이터를 활성화하세요</p>
            <Link href={`/projects/${id}/features/new`}>
              <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="w-4 h-4" />
                첫 기능 추가
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
