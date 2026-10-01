import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const credentials = z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(256) })

export async function POST(request: NextRequest) {
  const body = credentials.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Enter your username and password.' }, { status: 400 })
  const username = process.env.MANAGER_USERNAME || 'jayanta'
  const email = process.env.MANAGER_EMAIL || 'thesyncretic123@gmail.com'
  if (body.data.username.toLowerCase() !== username.toLowerCase()) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Manager sign-in is not configured.' }, { status: 503 })
  const response = NextResponse.json({ ok: true })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.data.password })
  if (error || !data.user) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
  return response
}
