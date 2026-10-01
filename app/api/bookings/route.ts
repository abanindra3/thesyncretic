import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prices = { 'Double Room': 1400, 'Superior Room': 1600 } as const

export async function GET() {
  const result = await pool.query('SELECT id, booking_code, guest_name, guest_phone, guest_email, room_type, check_in, check_out, guests, amount, payment_method, payment_status, status, document_url, source, created_at FROM public.hotel_bookings ORDER BY created_at DESC')
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { guestName, phone, email, roomType, checkIn, checkOut, guests = 1, paymentMethod = 'Pay at hotel', documentUrl = null, source = 'website' } = body
  if (!guestName || !phone || !roomType || !checkIn || !checkOut || !(roomType in prices)) return NextResponse.json({ error: 'Please complete all booking details.' }, { status: 400 })
  if (new Date(checkOut) <= new Date(checkIn)) return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
  const availability = await pool.query("SELECT COUNT(*)::int AS count FROM public.hotel_bookings WHERE room_type = $1 AND status IN ('pending','confirmed','checked_in') AND check_in < $3 AND check_out > $2", [roomType, checkIn, checkOut])
  const capacity = roomType === 'Double Room' ? 7 : 7
  if (availability.rows[0].count >= capacity) return NextResponse.json({ error: 'No rooms are available for those dates.' }, { status: 409 })
  const bookingCode = `SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const paymentStatus = paymentMethod === 'Pay at hotel' ? 'pay_at_hotel' : 'pending'
  const result = await pool.query('INSERT INTO public.hotel_bookings (booking_code, guest_name, guest_phone, guest_email, room_type, check_in, check_out, guests, amount, payment_method, payment_status, status, document_url, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING booking_code, amount, room_type, check_in, check_out, payment_method, payment_status, status', [bookingCode, guestName, phone, email || null, roomType, checkIn, checkOut, Number(guests), prices[roomType as keyof typeof prices], paymentMethod, paymentStatus, paymentMethod === 'Pay at hotel' ? 'confirmed' : 'pending', documentUrl, source])
  return NextResponse.json({ booking: result.rows[0], paymentRequired: paymentMethod !== 'Pay at hotel', message: paymentMethod === 'Pay at hotel' ? 'Booking confirmed.' : 'Room held. Complete payment to confirm.' }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const allowed = ['pending', 'paid', 'failed', 'pay_at_hotel']
  if (!body.bookingCode || !allowed.includes(body.paymentStatus)) return NextResponse.json({ error: 'Invalid payment update.' }, { status: 400 })
  const result = await pool.query("UPDATE public.hotel_bookings SET payment_status = $1, status = CASE WHEN $1 = 'paid' THEN 'confirmed' ELSE status END WHERE booking_code = $2 RETURNING booking_code, payment_status, status", [body.paymentStatus, body.bookingCode])
  if (!result.rowCount) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  return NextResponse.json({ booking: result.rows[0] })
}
