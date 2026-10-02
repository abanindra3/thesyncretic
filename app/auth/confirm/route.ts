import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const next = url.searchParams.get('next') || '/manager'
  // Supabase email OTP links use `magiclink`; `email` is retained for
  // compatibility with existing links issued by earlier configurations.
  if (tokenHash && (type === 'email' || type === 'magiclink' || type === 'signup')) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && next.startsWith('/my-bookings')) await createAdminClient().from('guests').update({ auth_user_id: user.id }).ilike('email', user.email)
      return NextResponse.redirect(new URL(next, url.origin))
    }
  }
  return NextResponse.redirect(new URL('/manager/login?error=invalid_link', url.origin))
}
