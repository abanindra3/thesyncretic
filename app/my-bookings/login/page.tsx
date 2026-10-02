'use client'
import { useState, type FormEvent } from 'react'

export default function GuestLogin() {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); const response = await fetch('/api/auth/guest-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const data = await response.json(); setMessage(data.message || data.error); setBusy(false) }
  return <main className="grid min-h-screen place-items-center bg-[#f7f4ee] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-[#fffdf8] p-8 shadow-xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b1884b]">The Syncretic</p><h1 className="mt-3 font-serif text-4xl">Your bookings</h1><p className="mt-3 text-sm leading-6 text-[#6d695e]">Verify the email used for your booking to create or access your account.</p><label className="mt-7 block text-xs font-semibold uppercase tracking-[.12em]">Booking email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#ded7ca] bg-transparent p-3 text-sm" /></label><button disabled={busy} className="mt-5 w-full rounded-xl bg-[#2e342d] px-5 py-3.5 text-xs font-semibold uppercase tracking-[.16em] text-white">{busy ? 'Sending…' : 'Verify email'}</button>{message && <p className="mt-4 rounded-lg bg-[#f0ece4] p-3 text-sm">{message}</p>}</form></main>
}
