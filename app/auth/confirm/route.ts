import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const next = url.searchParams.get('next') || '/manager'
  if (tokenHash && type === 'email') {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && next.startsWith('/my-bookings')) await createAdminClient().from('guests').update({ auth_user_id: user.id }).ilike('email', user.email)
      return NextResponse.redirect(new URL(next, url.origin))
    }
  }
  return NextResponse.redirect(new URL('/manager/login?error=invalid_link', url.origin))
}
