import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const querySchema = z.object({ checkIn: z.iso.date(), checkOut: z.iso.date(), adults: z.coerce.number().int().min(1).max(10) })

export async function GET(request: Request) {
  try {
    const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    if (input.checkOut <= input.checkIn) return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
    const supabase = createAdminClient()
    const { data: rooms, error } = await supabase.from('rooms').select('id, room_number, category, description, capacity, bed_configuration, amenities, base_price').eq('active', true).gte('capacity', input.adults).order('base_price')
    if (error) throw error
    const { data: activeRooms, error: activeError } = await supabase.from('booking_rooms').select('room_id, bookings!inner(check_in, check_out, status)').lt('bookings.check_in', input.checkOut).gt('bookings.check_out', input.checkIn).not('bookings.status', 'in', '(cancelled,expired)')
    if (activeError) throw activeError
    const unavailable = new Set(activeRooms?.map((row) => row.room_id))
    return NextResponse.json({ rooms: rooms?.filter((room) => !unavailable.has(room.id)) || [] })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Choose valid dates and guest count.' }, { status: 400 })
    return NextResponse.json({ error: 'Availability service is not configured.' }, { status: 503 })
  }
}
