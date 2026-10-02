import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/supabase/server'
import { ManagerDashboard } from './manager-dashboard'

export const dynamic = 'force-dynamic'

export default async function ManagerPage() {
  try {
    const { supabase } = await requireStaff()
    const { data: bookings } = await supabase.from('bookings').select('booking_reference, check_in, check_out, total_amount, payment_status, status, source, guests(full_name, phone), booking_rooms(rooms(room_number, category))').order('created_at', { ascending: false }).limit(50)
    return <ManagerDashboard initialBookings={(bookings || []) as any[]} />
  } catch { redirect('/manager/login') }
}
