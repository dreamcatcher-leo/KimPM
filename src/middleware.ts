import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // API 라우트는 통과
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // Static assets 통과
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return supabaseResponse
  }

  // Auth 라우트 처리
  if (pathname.startsWith('/auth/')) {
    // 이미 로그인된 경우 role 기반 리디렉션
    if (user && pathname === '/auth/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      const role = profile?.role || 'founder'
      if (role === 'vendor') {
        return NextResponse.redirect(new URL('/vendor/home', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // 미로그인 → 로그인 페이지로
  if (!user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 로그인된 경우 role 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'founder'

  // /vendor/* 경로: vendor 역할만 접근 가능
  // (단, /vendor/[token] 하위 레거시 경로는 토큰 기반이므로 별도 허용)
  if (pathname.startsWith('/vendor/')) {
    // /vendor/home 또는 /vendor/[token] (레거시) 접근
    const isTokenPath = pathname.match(/^\/vendor\/[^/]+(?:\/|$)/) && !pathname.startsWith('/vendor/home')
    
    if (isTokenPath) {
      // 레거시 토큰 URL: vendor 역할이거나 로그인 상태면 통과
      return supabaseResponse
    }
    
    // /vendor/home: vendor 역할만
    if (role !== 'vendor') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // /projects/*, /dashboard: founder/admin 역할만
  if (pathname.startsWith('/projects/') || pathname === '/dashboard' || pathname === '/') {
    if (role === 'vendor') {
      return NextResponse.redirect(new URL('/vendor/home', request.url))
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
