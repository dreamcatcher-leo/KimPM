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

    // profiles 테이블에서 role 조회
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              DG
            </div>
            <span className="text-white text-xl font-semibold">DeliveryGuard PM</span>
          </div>
          <p className="text-slate-400 text-sm">AI 외주 PM 워크스페이스</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">로그인</CardTitle>
            <CardDescription className="text-slate-400">
              이메일과 비밀번호로 로그인하세요. 역할에 따라 자동으로 이동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>

            {/* 테스트 계정 안내 */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-slate-500 text-xs text-center mb-3">테스트 계정</p>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setEmail('leo@beforpet.com'); setPassword('founder1234!') }}
                  className="w-full bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-left hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-blue-400 font-medium">대표 / 관리자</div>
                      <div className="text-slate-500 mt-0.5">leo@beforpet.com · founder1234!</div>
                    </div>
                    <span className="text-slate-600 text-xs">클릭하여 입력</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('vendor@beforpet.com'); setPassword('vendor1234!') }}
                  className="w-full bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5 text-left hover:bg-purple-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-purple-400 font-medium">외주사</div>
                      <div className="text-slate-500 mt-0.5">vendor@beforpet.com · vendor1234!</div>
                    </div>
                    <span className="text-slate-600 text-xs">클릭하여 입력</span>
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          DeliveryGuard PM — 외주 개발 관리 플랫폼
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
