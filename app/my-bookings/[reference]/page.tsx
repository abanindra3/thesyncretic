import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ReceiptPrintButton } from './print-button'

export const dynamic = 'force-dynamic'

export default async function Receipt({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  try {
    const supabase = await createServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/my-bookings/login')
    const { data: booking } = await supabase.from('bookings').select('booking_reference, check_in, check_out, adults, children, total_amount, amount_paid, balance_due, payment_status, status, guests!inner(auth_user_id, full_name, email, phone), booking_rooms(rate_per_night, rooms(room_number, category))').eq('booking_reference', reference).eq('guests.auth_user_id', user.id).single()
    if (!booking) notFound()
    const guest = Array.isArray(booking.guests) ? booking.guests[0] : booking.guests
    return <main className="min-h-screen bg-[#f7f4ee] p-5 text-[#292821] lg:p-12"><article className="mx-auto max-w-2xl rounded-2xl bg-[#fffdf8] p-8 shadow-xl print:shadow-none"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b1884b]">The Syncretic Guest House</p><div className="mt-5 flex justify-between gap-4"><div><h1 className="font-serif text-4xl">Booking receipt</h1><p className="mt-2 text-sm text-[#6d695e]">Reference: {booking.booking_reference}</p></div><ReceiptPrintButton /></div><dl className="mt-8 grid gap-5 border-y border-[#e5ded1] py-6 text-sm sm:grid-cols-2"><div><dt className="text-xs uppercase text-[#8b8274]">Guest</dt><dd className="mt-1 font-medium">{guest?.full_name}</dd><dd>{guest?.email || guest?.phone}</dd></div><div><dt className="text-xs uppercase text-[#8b8274]">Stay</dt><dd className="mt-1 font-medium">{booking.check_in} → {booking.check_out}</dd><dd>{booking.adults} adult(s), {booking.children} child(ren)</dd></div><div><dt className="text-xs uppercase text-[#8b8274]">Room</dt><dd className="mt-1 font-medium">{booking.booking_rooms?.[0]?.rooms?.[0]?.category}</dd><dd>Room {booking.booking_rooms?.[0]?.rooms?.[0]?.room_number}</dd></div><div><dt className="text-xs uppercase text-[#8b8274]">Booking status</dt><dd className="mt-1 font-medium capitalize">{booking.status.replace('_', ' ')}</dd><dd className="capitalize">{booking.payment_status.replace('_', ' ')}</dd></div></dl><div className="mt-8 space-y-3 text-sm"><div className="flex justify-between"><span>Booking total</span><strong>₹{booking.total_amount}</strong></div><div className="flex justify-between"><span>Paid</span><span>₹{booking.amount_paid}</span></div><div className="flex justify-between border-t border-[#e5ded1] pt-3 text-lg"><strong>Balance due</strong><strong>₹{booking.balance_due}</strong></div></div></article></main>
  } catch { redirect('/my-bookings/login') }
}
