import { z } from 'zod'

export const bookingInput = z.object({
  guestName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+0-9][0-9 -]{7,19}$/),
  // A verified email creates the guest's account and gives them access to
  // their receipt and booking history. Phone is also required above.
  email: z.email(),
  roomId: z.uuid(),
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  adults: z.coerce.number().int().min(1).max(10),
  children: z.coerce.number().int().min(0).max(10).default(0),
  specialRequests: z.string().trim().max(1000).optional(),
  paymentPolicy: z.enum(['full_advance', 'partial_advance', 'pay_at_hotel']).default('full_advance'),
})

export const razorpayVerification = z.object({
  bookingReference: z.string().regex(/^SYN-[A-Z0-9]{8}$/),
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
})
