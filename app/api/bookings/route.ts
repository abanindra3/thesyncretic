import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/supabase/server'
import { bookingInput } from '@/lib/validation'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: 'Please check the booking details.', fields: error.flatten().fieldErrors }, { status: 400 })
  if (error instanceof Error && error.message === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 })
  if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'You are not allowed to perform that action.' }, { status: 403 })
  return NextResponse.json({ error: 'Booking service is not configured or is temporarily unavailable.' }, { status: 503 })
}

export async function GET() {
  try {
    const { supabase } = await requireStaff()
    const { data, error } = await supabase
      .from('bookings')
      .select('booking_reference, check_in, check_out, total_amount, amount_paid, payment_status, status, source, guests(full_name, phone), booking_rooms(rooms(room_number, category))')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) { return errorResponse(error) }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = bookingInput.parse(body)
    const requestedSource = body.source
    const isManagerBooking = requestedSource === 'manager' || requestedSource === 'walk_in'
    let createdBy: string | null = null
    if (isManagerBooking) {
      const staff = await requireStaff()
      createdBy = staff.user.id
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('create_booking_hold', {
      p_guest_name: input.guestName, p_phone: input.phone, p_email: input.email || '', p_room_id: input.roomId,
      p_check_in: input.checkIn, p_check_out: input.checkOut, p_adults: input.adults, p_children: input.children,
      p_special_requests: input.specialRequests || null, p_source: isManagerBooking ? requestedSource : 'website',
      p_payment_policy: input.paymentPolicy, p_created_by: createdBy,
    })
    if (error) {
      if (error.message.includes('ROOM_UNAVAILABLE')) return NextResponse.json({ error: 'That room is no longer available for these dates.' }, { status: 409 })
      throw error
    }
    const booking = data?.[0]
    if (!booking) throw new Error('Booking hold was not returned.')
    return NextResponse.json({ booking, message: booking.booking_status === 'confirmed' ? 'Booking confirmed. Payment is due at the property.' : 'Your room is held for 15 minutes. Payment is required to confirm it.' }, { status: 201 })
  } catch (error) { return errorResponse(error) }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireStaff()
    const body = await request.json()
    const reference = typeof body.bookingReference === 'string' ? body.bookingReference : ''
    const status = typeof body.status === 'string' ? body.status : ''
    if (!/^SYN-[A-Z0-9]{8}$/.test(reference) || !['confirmed', 'checked_in', 'checked_out', 'cancelled'].includes(status)) return NextResponse.json({ error: 'Invalid booking update.' }, { status: 400 })
    const { data, error } = await supabase.from('bookings').update({ status, ...(status === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}) }).eq('booking_reference', reference).select('id, booking_reference, status').single()
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: user.id, action: `booking_${status}`, entity_type: 'booking', entity_id: data.id, metadata: { booking_reference: reference } })
    return NextResponse.json({ booking: data })
  } catch (error) { return errorResponse(error) }
}
