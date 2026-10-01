import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { razorpayClient } from '@/lib/razorpay'

export const runtime = 'nodejs'

const inputSchema = z.object({ bookingReference: z.string().regex(/^SYN-[A-Z0-9]{8}$/) })

export async function POST(request: Request) {
  try {
    const { bookingReference } = inputSchema.parse(await request.json())
    const supabase = createAdminClient()
    const { data: booking, error } = await supabase.from('bookings').select('id, total_amount, amount_paid, status, hold_expires_at').eq('booking_reference', bookingReference).single()
    if (error || !booking) return NextResponse.json({ error: 'Booking hold not found.' }, { status: 404 })
    if (booking.status !== 'hold' || new Date(booking.hold_expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'This booking hold has expired. Please check availability again.' }, { status: 410 })
    const payable = Number(booking.total_amount) - Number(booking.amount_paid)
    const { data: existing } = await supabase.from('payments').select('gateway_order_id, amount').eq('booking_id', booking.id).eq('status', 'pending').not('gateway_order_id', 'is', null).maybeSingle()
    if (existing?.gateway_order_id) return NextResponse.json({ orderId: existing.gateway_order_id, amount: Math.round(Number(existing.amount) * 100), currency: 'INR', keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID })
    const order = await razorpayClient().orders.create({ amount: Math.round(payable * 100), currency: 'INR', receipt: bookingReference, notes: { booking_reference: bookingReference } })
    const { error: paymentError } = await supabase.from('payments').insert({ booking_id: booking.id, amount: payable, method: 'razorpay', gateway_order_id: order.id, status: 'pending' })
    if (paymentError) throw paymentError
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid booking reference.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to initialise Razorpay. Confirm the server environment variables are set.' }, { status: 503 })
  }
}
