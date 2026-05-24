'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      toast.error('로그인 실패: ' + (error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : error.message))
      setIsLoading(false)
      return
    }

    if (!data.user) {
      toast.error('로그인 중 오류가 발생했습니다.')
      setIsLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role || 'founder'

    if (role === 'vendor') {
      toast.success('환영합니다! 외주사 포털로 이동합니다.')
      router.push('/vendor/home')
    } else {
      toast.success('환영합니다!')
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3 mb-2">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-blue-900/40 border border-white/10">
              <Image
                src="/kimpm-logo.png"
                alt="김PM 로고"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div>
              <div className="text-white text-2xl font-bold tracking-tight">김PM</div>
              <div className="text-blue-400 text-sm font-medium">AI 외주 개발 관리 플랫폼</div>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-2">대표자와 외주사 모두를 위한 스마트 PM</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">로그인</CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              역할에 따라 대표자 대시보드 또는 외주사 포털로 자동 이동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-700/80 border-slate-600 text-white focus:border-blue-500"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-5"
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>

            {/* 테스트 계정 */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-slate-500 text-xs text-center mb-3">데모 계정으로 체험하기</p>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setEmail('leo@beforpet.com'); setPassword('founder1234!') }}
                  className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-left hover:bg-blue-500/20 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-blue-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                        대표 / 관리자
                      </div>
                      <div className="text-slate-500 mt-0.5">leo@beforpet.com</div>
                    </div>
                    <span className="text-slate-600 text-xs group-hover:text-blue-400 transition-colors">클릭하여 입력 →</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('vendor@beforpet.com'); setPassword('vendor1234!') }}
                  className="w-full bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-left hover:bg-purple-500/20 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-purple-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                        외주사
                      </div>
                      <div className="text-slate-500 mt-0.5">vendor@beforpet.com</div>
                    </div>
                    <span className="text-slate-600 text-xs group-hover:text-purple-400 transition-colors">클릭하여 입력 →</span>
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          김PM — AI 외주 개발 관리 플랫폼
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-sm">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
