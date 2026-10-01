import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { razorpayEnv } from '@/lib/env'

export const runtime = 'nodejs'

type RazorpayWebhook = { payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; method?: string; created_at?: number } } } }

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')
  if (!signature) return NextResponse.json({ error: 'Missing Razorpay signature.' }, { status: 400 })
  const expected = createHmac('sha256', razorpayEnv().RAZORPAY_KEY_SECRET).update(rawBody).digest('hex')
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return NextResponse.json({ error: 'Invalid Razorpay signature.' }, { status: 400 })
  const event = JSON.parse(rawBody) as RazorpayWebhook
  const payment = event.payload?.payment?.entity
  if (!payment?.id || !payment.order_id) return NextResponse.json({ received: true })
  const supabase = createAdminClient()
  const { data: savedPayment } = await supabase.from('payments').select('id, booking_id, amount').eq('gateway_order_id', payment.order_id).maybeSingle()
  if (!savedPayment) return NextResponse.json({ received: true })
  const { error } = await supabase.from('payments').update({ gateway_transaction_id: payment.id, method: payment.method || 'razorpay', status: 'paid', paid_at: new Date((payment.created_at || Math.floor(Date.now() / 1000)) * 1000).toISOString() }).eq('id', savedPayment.id).is('gateway_transaction_id', null)
  if (error && error.code !== '23505') return NextResponse.json({ error: 'Unable to record payment.' }, { status: 500 })
  await supabase.from('bookings').update({ status: 'confirmed', payment_status: 'paid', amount_paid: savedPayment.amount, hold_expires_at: null }).eq('id', savedPayment.booking_id).in('status', ['hold', 'pending'])
  return NextResponse.json({ received: true })
}
