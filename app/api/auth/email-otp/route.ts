import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const schema = z.object({ email: z.email(), redirectTo: z.string().optional() })

export async function POST(request: Request) {
  let email: string
  let redirectTo: string | undefined
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    email = parsed.data.email
    redirectTo = parsed.data.redirectTo
  } catch {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  try {
    const supabase = await createServerClient()
    const origin = new URL(request.url).origin
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo || `${origin}/manager` } })
    if (error) return NextResponse.json({ error: 'We could not send a sign-in email. Ask an owner to create your staff account.' }, { status: 400 })
    return NextResponse.json({ message: 'Check your email for the secure sign-in link.' })
  } catch {
    return NextResponse.json({ error: 'Email sign-in is not configured. Check the Supabase URL and keys in Vercel.' }, { status: 503 })
  }
}
