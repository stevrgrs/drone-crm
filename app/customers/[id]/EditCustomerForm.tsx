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

export default function EditCustomerForm({ customer }: { customer: Customer }) {
  const supabase = useMemo(() => createClient(), [])
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(customer.full_name || customer.name || '')
  const [phone, setPhone] = useState(customer.phone || '')
  const [email, setEmail] = useState(customer.email || '')
  const [notes, setNotes] = useState(customer.notes || '')

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        full_name: fullName,
        name: fullName,
        phone,
        email,
        notes,
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
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Customer'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-white">Customer Name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
          />
        </div>
      </div>
    </div>
  )
}
