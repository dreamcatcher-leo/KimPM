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
import { Eye, EyeOff, User, Mail, Lock, CheckCircle2 } from 'lucide-react'

function LoginForm() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')

  // 로그인 상태
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  // 회원가입 상태
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('')
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // ── 로그인 ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.message === 'Email not confirmed'
          ? '이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.'
          : error.message
      )
      setLoginLoading(false)
      return
    }

    if (!data.user) {
      toast.error('로그인 중 오류가 발생했습니다.')
      setLoginLoading(false)
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

  // ── 회원가입 ─────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signupName.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }
    if (signupPassword.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (signupPassword !== signupPasswordConfirm) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }

    setSignupLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: signupName.trim(),
          role: 'founder',
        },
      },
    })

    if (error) {
      toast.error(
        error.message === 'User already registered'
          ? '이미 가입된 이메일입니다. 로그인해주세요.'
          : error.message
      )
      setSignupLoading(false)
      return
    }

    // 이메일 확인이 비활성화된 경우(자동 로그인) or 확인 필요 분기
    if (data.user && data.session) {
      // 이메일 확인 없이 바로 가입 완료 → 대시보드로
      toast.success('회원가입 완료! 대시보드로 이동합니다.')
      router.push('/dashboard')
      router.refresh()
    } else {
      // 이메일 확인 필요
      setSignupDone(true)
    }

    setSignupLoading(false)
  }

  // ── 비밀번호 강도 표시 ────────────────────────────────────────────────────────
  const getPwStrength = (pw: string) => {
    if (!pw) return { label: '', color: '', width: '0%' }
    const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length
    if (score <= 1) return { label: '약함', color: 'bg-red-400', width: '25%' }
    if (score === 2) return { label: '보통', color: 'bg-yellow-400', width: '50%' }
    if (score === 3) return { label: '강함', color: 'bg-blue-500', width: '75%' }
    return { label: '매우 강함', color: 'bg-green-500', width: '100%' }
  }
  const pwStrength = getPwStrength(signupPassword)

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
          {/* 탭 전환 */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors rounded-tl-xl ${
                tab === 'login'
                  ? 'text-white bg-white/5 border-b-2 border-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors rounded-tr-xl ${
                tab === 'signup'
                  ? 'text-white bg-white/5 border-b-2 border-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              회원가입
            </button>
          </div>

          <CardContent className="pt-6">

            {/* ────────────────── 로그인 탭 ────────────────── */}
            {tab === 'login' && (
              <div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300 text-sm">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="pl-9 bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300 text-sm">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="password"
                        type={showLoginPw ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="pl-9 pr-10 bg-slate-700/80 border-slate-600 text-white focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-5"
                    disabled={loginLoading}
                  >
                    {loginLoading ? '로그인 중...' : '로그인'}
                  </Button>
                </form>

                {/* 회원가입 유도 */}
                <p className="text-center text-slate-500 text-xs mt-4">
                  계정이 없으신가요?{' '}
                  <button onClick={() => setTab('signup')} className="text-blue-400 hover:underline font-medium">
                    회원가입하기
                  </button>
                </p>

                {/* 테스트 계정 */}
                <div className="mt-5 pt-4 border-t border-slate-700">
                  <p className="text-slate-500 text-xs text-center mb-3">데모 계정으로 체험하기</p>
                  <div className="space-y-2 text-xs">
                    <button
                      type="button"
                      onClick={() => { setLoginEmail('founder-test@kimpm.dev'); setLoginPassword('test1234!') }}
                      className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-left hover:bg-blue-500/20 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-blue-400 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                            대표 / 관리자 (테스트)
                          </div>
                          <div className="text-slate-500 mt-0.5">founder-test@kimpm.dev</div>
                        </div>
                        <span className="text-slate-600 text-xs group-hover:text-blue-400 transition-colors">클릭하여 입력 →</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginEmail('vendor-test@kimpm.dev'); setLoginPassword('test1234!') }}
                      className="w-full bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-left hover:bg-purple-500/20 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-purple-400 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                            외주사 (테스트)
                          </div>
                          <div className="text-slate-500 mt-0.5">vendor-test@kimpm.dev</div>
                        </div>
                        <span className="text-slate-600 text-xs group-hover:text-purple-400 transition-colors">클릭하여 입력 →</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ────────────────── 회원가입 탭 ────────────────── */}
            {tab === 'signup' && (
              <div>
                {signupDone ? (
                  /* 이메일 확인 안내 화면 */
                  <div className="text-center py-4 space-y-4">
                    <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">거의 다 왔어요!</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        <span className="text-blue-400 font-medium">{signupEmail}</span>로<br />
                        인증 메일을 발송했습니다.<br />
                        메일함을 확인하고 링크를 클릭하면 가입이 완료됩니다.
                      </p>
                    </div>
                    <button
                      onClick={() => { setSignupDone(false); setTab('login') }}
                      className="text-blue-400 text-sm hover:underline"
                    >
                      로그인 화면으로 돌아가기
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* 이름 */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-slate-300 text-sm">이름 (대표자명)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="홍길동"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                          className="pl-9 bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* 이메일 */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-slate-300 text-sm">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="email@example.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          className="pl-9 bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* 비밀번호 */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-slate-300 text-sm">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="signup-password"
                          type={showSignupPw ? 'text' : 'password'}
                          placeholder="8자 이상"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          minLength={8}
                          className="pl-9 pr-10 bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* 비밀번호 강도 바 */}
                      {signupPassword && (
                        <div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                            <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`} style={{ width: pwStrength.width }} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">보안 강도: <span className="text-slate-300">{pwStrength.label}</span></p>
                        </div>
                      )}
                    </div>

                    {/* 비밀번호 확인 */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-password-confirm" className="text-slate-300 text-sm">비밀번호 확인</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="signup-password-confirm"
                          type={showSignupPw ? 'text' : 'password'}
                          placeholder="비밀번호 재입력"
                          value={signupPasswordConfirm}
                          onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                          required
                          className={`pl-9 bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 ${
                            signupPasswordConfirm && signupPassword !== signupPasswordConfirm
                              ? 'border-red-500'
                              : signupPasswordConfirm && signupPassword === signupPasswordConfirm
                              ? 'border-green-500'
                              : ''
                          }`}
                        />
                        {signupPasswordConfirm && signupPassword === signupPasswordConfirm && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                        )}
                      </div>
                      {signupPasswordConfirm && signupPassword !== signupPasswordConfirm && (
                        <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다.</p>
                      )}
                    </div>

                    {/* 약관 동의 안내 */}
                    <p className="text-xs text-slate-500 leading-relaxed">
                      회원가입 시{' '}
                      <span className="text-slate-400 underline cursor-pointer">이용약관</span> 및{' '}
                      <span className="text-slate-400 underline cursor-pointer">개인정보처리방침</span>에
                      동의하는 것으로 간주됩니다.
                    </p>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-5"
                      disabled={signupLoading || (!!signupPasswordConfirm && signupPassword !== signupPasswordConfirm)}
                    >
                      {signupLoading ? '가입 중...' : '무료로 시작하기'}
                    </Button>
                  </form>
                )}

                {!signupDone && (
                  <p className="text-center text-slate-500 text-xs mt-4">
                    이미 계정이 있으신가요?{' '}
                    <button onClick={() => setTab('login')} className="text-blue-400 hover:underline font-medium">
                      로그인하기
                    </button>
                  </p>
                )}
              </div>
            )}
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
