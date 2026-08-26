import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && (path.startsWith('/admin') || path.startsWith('/user') || path.startsWith('/dashboard'))) {
    // Redirect to login if user is not authenticated
    const url = request.nextUrl.clone()
    url.pathname = '/' // Redirect to home/login
    return NextResponse.redirect(url)
  }

  if (user) {
    // If authenticated, get role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'user';

    // Protect admin routes
    if (path.startsWith('/admin') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/user'
      return NextResponse.redirect(url)
    }

    // Auto-redirect from home to dedicated space
    if (path === '/') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin' : '/user'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
