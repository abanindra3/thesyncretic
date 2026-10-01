'use client'

import { useState, type FormEvent } from 'react'

export default function ManagerLoginPage() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    const response = await fetch('/api/auth/manager-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const data = await response.json(); if (response.ok) window.location.assign('/manager'); else { setMessage(data.error || 'Unable to sign in.'); setBusy(false) }
  }
  return <main className="grid min-h-screen place-items-center bg-[#f7f4ee] p-5 text-[#292821]"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-[#fffdf8] p-8 shadow-xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b1884b]">The Syncretic</p><h1 className="mt-3 font-serif text-4xl">Manager sign in</h1><p className="mt-3 text-sm leading-6 text-[#6d695e]">Use your manager username and password.</p><label className="mt-7 block text-xs font-semibold uppercase tracking-[.12em]">Username<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded7ca] bg-transparent p-3 text-sm" /></label><label className="mt-4 block text-xs font-semibold uppercase tracking-[.12em]">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded7ca] bg-transparent p-3 text-sm" /></label><button disabled={busy} className="mt-5 w-full rounded-xl bg-[#2e342d] px-5 py-3.5 text-xs font-semibold uppercase tracking-[.16em] text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>{message && <p role="status" className="mt-4 rounded-lg bg-[#f0ece4] p-3 text-sm">{message}</p>}</form></main>
}
