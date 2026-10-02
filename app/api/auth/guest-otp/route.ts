import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const payload = z.object({ email: z.email() }).safeParse(await request.json().catch(() => null))
  if (!payload.success) return NextResponse.json({ error: 'Enter the email used for your booking.' }, { status: 400 })
  try {
    const admin = createAdminClient()
    const { data: guest } = await admin.from('guests').select('id').ilike('email', payload.data.email).maybeSingle()
    if (!guest) return NextResponse.json({ error: 'We could not find a booking with that email.' }, { status: 404 })
    const supabase = await createServerClient()
    const origin = new URL(request.url).origin
    const { error } = await supabase.auth.signInWithOtp({ email: payload.data.email, options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/confirm?next=/my-bookings` } })
    if (error) throw error
    return NextResponse.json({ message: 'Check your email to verify your account and view your bookings.' })
  } catch { return NextResponse.json({ error: 'Guest sign-in is not configured.' }, { status: 503 }) }
}
