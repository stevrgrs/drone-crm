'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function AddCustomerButton() {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSave() {
    if (!fullName.trim()) {
      alert('Customer name is required.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        full_name: fullName.trim(),
        name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
      }

      const { error } = await supabase.from('customers').insert([payload])
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
    <div className="w-full">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          + Add Customer
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Customer name"
              className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />
            <div className="hidden md:block" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={4}
              className="md:col-span-2 rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
