'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import HistoryNav from '@/app/components/HistoryNav'

export default function NewCustomerPage() {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!fullName.trim()) {
      alert('Customer name is required')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('customers').insert([
        {
          full_name: fullName.trim(),
          name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      router.push('/')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <HistoryNav />

        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6">
          <h1 className="text-3xl font-bold text-white">Add Customer</h1>
          <p className="mt-2 text-slate-400">Enter only the details for the new customer.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
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
              className="md:col-span-2 rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={5}
              className="md:col-span-2 rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
