import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const maximumBytes = 5 * 1024 * 1024

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { user } = await requireStaff(); const { reference } = await params
    if (!/^SYN-[A-Z0-9]{8}$/.test(reference)) return NextResponse.json({ error: 'Invalid booking reference.' }, { status: 400 })
    const form = await request.formData(); const file = form.get('document'); const documentType = String(form.get('documentType') || 'identity_document')
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maximumBytes) return NextResponse.json({ error: 'Upload a JPG, PNG, or PDF up to 5 MB.' }, { status: 400 })
    const admin = createAdminClient(); const { data: booking, error } = await admin.from('bookings').select('id').eq('booking_reference', reference).single(); if (error || !booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin'; const path = `${booking.id}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await admin.storage.from('guest-documents').upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) throw uploadError
    const { error: recordError } = await admin.from('guest_documents').insert({ booking_id: booking.id, document_type: documentType, storage_path: path, verified_by: user.id, verified: false }); if (recordError) throw recordError
    await admin.from('audit_logs').insert({ user_id: user.id, action: 'guest_document_uploaded', entity_type: 'booking', entity_id: booking.id, metadata: { document_type: documentType } })
    return NextResponse.json({ message: 'Document uploaded securely.' })
  } catch { return NextResponse.json({ error: 'Document upload could not be completed.' }, { status: 503 }) }
}
