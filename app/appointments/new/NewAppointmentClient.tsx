'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HistoryNav from '@/app/components/HistoryNav'
import { createClient } from '@/lib/supabase/browser'

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits
}

function formatPhone(value: string) {
  const digits = normalizePhone(value).slice(0, 10)
  if (!digits) return ''
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export default function NewAppointmentClient() {
  const router = useRouter()
  const supabase = createClient()

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState('Dropoff')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [drone, setDrone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!customerName.trim()) {
      alert('Customer name is required')
      return
    }
    if (!date || !time) {
      alert('Date and time are required')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('appointments').insert([{
        customer_name: customerName.trim(),
        phone: normalizePhone(phone) || null,
        appointment_type: type,
        appointment_date: date,
        appointment_time: time,
        drone: drone.trim() || null,
        notes: notes.trim() || null,
      }])

      if (error) {
        alert(error.message)
        return
      }

      router.push('/appointments')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <HistoryNav />

        <div>
          <h1 className="text-3xl font-bold text-white">Add Pickup / Dropoff</h1>
          <p className="mt-2 text-sm text-slate-400">Schedule a customer appointment.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Customer Name</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="Customer name" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</label>
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="(561) 555-5555" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Appointment Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white">
                <option>Dropoff</option>
                <option>Pickup</option>
                <option>Estimate / Check</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white" style={{ colorScheme: 'dark' }} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white" style={{ colorScheme: 'dark' }} />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Drone / Item</label>
              <input value={drone} onChange={(e) => setDrone(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="DJI Phantom 3" />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="What are they bringing in? What needs to be checked?" />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Appointment'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
