'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

type Customer = {
  id: string
  full_name?: string | null
  name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }

  return digits
}

function formatPhoneForDisplay(value: string) {
  const digits = normalizePhone(value).slice(0, 10)

  if (digits.length === 0) return ''
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function isValidPhone(value: string) {
  const digits = normalizePhone(value)
  return digits.length === 10
}

export default function EditCustomerForm({ customer }: { customer: Customer }) {
  const supabase = useMemo(() => createClient(), [])
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(customer.full_name || customer.name || '')
  const [phone, setPhone] = useState(formatPhoneForDisplay(customer.phone || ''))
  const [email, setEmail] = useState(customer.email || '')
  const [notes, setNotes] = useState(customer.notes || '')

  async function handleSave() {
    const cleanPhone = normalizePhone(phone)

    if (phone.trim() && !isValidPhone(phone)) {
      alert('Please enter a valid 10 digit phone number.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        full_name: fullName.trim(),
        phone: cleanPhone || null,
        email: email.trim(),
        notes: notes.trim(),
      }

      const { error } = await supabase.from('customers').update(payload).eq('id', customer.id)
      if (error) {
        alert(error.message)
        return
      }

      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">Edit Customer</h2>
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Customer'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-white">Customer Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-white">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(formatPhoneForDisplay(e.target.value))} placeholder="(561) 555-5555" inputMode="tel" autoComplete="tel" className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-white">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500" />
        </div>
      </div>
    </div>
  )
}
