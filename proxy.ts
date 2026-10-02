import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // The sign-in screen must remain reachable so a staff member can request an OTP.
  if (request.nextUrl.pathname === '/manager/login' || request.nextUrl.pathname === '/my-bookings/login') return NextResponse.next()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return NextResponse.redirect(new URL('/manager/login?error=configuration_required', request.url))
  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => { cookies.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(request.nextUrl.pathname.startsWith('/my-bookings') ? '/my-bookings/login' : '/manager/login', request.url))
  return response
}

export const config = { matcher: ['/manager/:path*', '/my-bookings/:path*'] }
