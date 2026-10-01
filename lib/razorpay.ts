import Razorpay from 'razorpay'
import { razorpayEnv } from '@/lib/env'

export function razorpayClient() {
  const env = razorpayEnv()
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
}
