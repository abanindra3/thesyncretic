import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ManagerPage() {
  try {
    const { supabase } = await requireStaff()
    const { data: bookings } = await supabase.from('bookings').select('booking_reference, check_in, check_out, total_amount, payment_status, status, guests(full_name, phone)').order('created_at', { ascending: false }).limit(50)
    return <main className="min-h-screen bg-[#f7f4ee] p-6 text-[#292821] lg:p-12"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b1884b]">The Syncretic · manager workspace</p><h1 className="mt-3 font-serif text-4xl">Booking register</h1><p className="mt-3 text-sm text-[#6d695e]">Authenticated staff-only view. Create and manage bookings through the secured API.</p><div className="mt-8 overflow-x-auto rounded-2xl bg-[#fffdf8] shadow-sm"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-[.12em] text-[#777164]"><tr><th className="p-4">Reference</th><th className="p-4">Guest</th><th className="p-4">Stay</th><th className="p-4">Amount</th><th className="p-4">Status</th></tr></thead><tbody>{bookings?.map((booking: any) => <tr key={booking.booking_reference} className="border-b last:border-0"><td className="p-4 font-medium">{booking.booking_reference}</td><td className="p-4">{booking.guests?.[0]?.full_name}</td><td className="p-4">{booking.check_in} — {booking.check_out}</td><td className="p-4">₹{booking.total_amount}</td><td className="p-4">{booking.status} · {booking.payment_status}</td></tr>)}</tbody></table>{!bookings?.length && <p className="p-8 text-sm text-[#6d695e]">No bookings yet.</p>}</div></main>
  } catch { redirect('/manager/login') }
}
