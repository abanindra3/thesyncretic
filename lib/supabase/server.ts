import { createServerClient as createSsrServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { serverEnv } from '@/lib/env'

export async function createServerClient() {
  const env = serverEnv()
  const cookieStore = await cookies()
  return createSsrServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values: { name: string; value: string; options: Record<string, unknown> }[]) => { try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* Server Components cannot set cookies. */ } },
    },
  })
}

export async function requireStaff() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['owner', 'manager', 'staff'].includes(profile.role)) throw new Error('FORBIDDEN')
  return { supabase, user, role: profile.role as 'owner' | 'manager' | 'staff' }
}
