import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MyBookings() {
  try {
    const supabase = await createServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/my-bookings/login')
    const { data: guest } = await supabase.from('guests').select('id, full_name, email, phone').eq('auth_user_id', user.id).single(); if (!guest) redirect('/my-bookings/login')
    const { data: bookings } = await supabase.from('bookings').select('booking_reference, check_in, check_out, total_amount, amount_paid, balance_due, payment_status, status, booking_rooms(rooms(room_number, category))').eq('guest_id', guest.id).order('created_at', { ascending: false })
    return <main className="min-h-screen bg-[#f7f4ee] p-5 text-[#292821] lg:p-10"><header className="mx-auto flex max-w-5xl items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b1884b]">The Syncretic · Guest account</p><h1 className="mt-3 font-serif text-4xl">Hello, {guest.full_name}</h1><p className="mt-2 text-sm text-[#6d695e]">{guest.email || user.email} · {guest.phone}</p></div><Link href="/" className="text-xs font-semibold uppercase tracking-[.14em]">Back to website</Link></header><section className="mx-auto mt-8 max-w-5xl"><h2 className="font-serif text-3xl">My bookings</h2><div className="mt-5 grid gap-4">{bookings?.map((booking: any) => <article key={booking.booking_reference} className="rounded-2xl bg-[#fffdf8] p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#b1884b]">{booking.booking_reference}</p><h3 className="mt-2 font-serif text-2xl">{booking.booking_rooms?.[0]?.rooms?.[0]?.category || 'Room'} · Room {booking.booking_rooms?.[0]?.rooms?.[0]?.room_number || '—'}</h3><p className="mt-2 text-sm text-[#6d695e]">{booking.check_in} → {booking.check_out}</p></div><div className="sm:text-right"><p className="font-serif text-2xl">₹{booking.total_amount}</p><p className="mt-1 text-sm capitalize text-[#6d695e]">{booking.status.replace('_', ' ')} · {booking.payment_status.replace('_', ' ')}</p><Link href={`/my-bookings/${booking.booking_reference}`} className="mt-4 inline-block rounded-lg bg-[#2e342d] px-4 py-3 text-xs font-semibold uppercase tracking-[.13em] text-white">View receipt</Link></div></div></article>)}{!bookings?.length && <p className="rounded-2xl bg-[#fffdf8] p-8 text-sm text-[#6d695e]">No bookings are linked to this account yet.</p>}</div></section></main>
  } catch { redirect('/my-bookings/login') }
}
