import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { razorpayVerification } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { razorpayEnv } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const input = razorpayVerification.parse(await request.json())
    const expected = createHmac('sha256', razorpayEnv().RAZORPAY_KEY_SECRET).update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`).digest('hex')
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpay_signature))) return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
    const supabase = createAdminClient()
    const { data: payment, error } = await supabase.from('payments').select('id, booking_id, amount, gateway_order_id, bookings!inner(booking_reference, status)').eq('gateway_order_id', input.razorpay_order_id).single()
    if (error || !payment || payment.bookings[0]?.booking_reference !== input.bookingReference) return NextResponse.json({ error: 'Payment order does not match this booking.' }, { status: 404 })
    const { error: updatePaymentError } = await supabase.from('payments').update({ gateway_transaction_id: input.razorpay_payment_id, status: 'paid', paid_at: new Date().toISOString() }).eq('id', payment.id).is('gateway_transaction_id', null)
    if (updatePaymentError) throw updatePaymentError
    const { error: updateBookingError } = await supabase.from('bookings').update({ status: 'confirmed', payment_status: 'paid', amount_paid: payment.amount, hold_expires_at: null }).eq('id', payment.booking_id).in('status', ['hold', 'pending'])
    if (updateBookingError) throw updateBookingError
    return NextResponse.json({ bookingReference: input.bookingReference, status: 'confirmed' })
  } catch {
    return NextResponse.json({ error: 'Payment verification could not be completed.' }, { status: 400 })
  }
}
