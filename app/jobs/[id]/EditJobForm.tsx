'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

const STATUS_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'picked up', label: 'Picked Up' },
]

const TIMESTAMP_PATTERN = /^\d{2}\/\d{2}\/\d{4} @ \d{1,2}:\d{2} (AM|PM) - /i

function cleanMoneyValue(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null
  return trimmed.replace(/[$,]/g, '')
}

function getRepairNoteTimestamp() {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const yyyy = now.getFullYear()
  let hours = now.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} @ ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`
}

function timestampRepairNotes(value: string) {
  const timestamp = getRepairNoteTimestamp()

  return value
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      if (TIMESTAMP_PATTERN.test(trimmed)) return trimmed
      return `${timestamp} - ${trimmed}`
    })
    .join('\n')
    .trim()
}

function CollapsibleTextSection({ title, value, onChange, placeholder, defaultOpen = false }: any) {
  return (
    <details open={defaultOpen} className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 md:col-span-2">
      <summary className="cursor-pointer list-none text-lg font-semibold text-white">
        <div className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm text-slate-500">Tap to expand</span>
        </div>
      </summary>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-4 w-full rounded-xl border border-slate-700 bg-[#030712] p-3 text-white"
        rows={5}
      />
    </details>
  )
}

export default function EditJobForm({ job, customer }: { job: any; customer?: any }) {
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState(job.title || '')
  const [description, setDescription] = useState(job.description || '')
  const [diagnosis, setDiagnosis] = useState(job.diagnosis || '')
  const [treatment, setTreatment] = useState(job.treatment || '')
  const [status, setStatus] = useState(job.status || 'in progress')
  const [estimate, setEstimate] = useState(job.estimate == null ? '' : String(job.estimate))
  const [finalPrice, setFinalPrice] = useState(job.final_price == null ? '' : String(job.final_price))
  const [dateIn, setDateIn] = useState((job.date_in || '').split('T')[0])
  const [pickupDate, setPickupDate] = useState((job.pickup_date || '').split('T')[0])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const timestampedRepairNotes = diagnosis.trim() ? timestampRepairNotes(diagnosis) : null

      const { error } = await supabase
        .from('service_jobs')
        .update({
          title: title.trim(),
          description: description.trim(),
          diagnosis: timestampedRepairNotes,
          treatment: treatment.trim() || null,
          status,
          estimate: cleanMoneyValue(estimate),
          final_price: cleanMoneyValue(finalPrice),
          date_in: dateIn || null,
          pickup_date: status === 'picked up' ? pickupDate || null : null,
        })
        .eq('id', job.id)

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
      <div className="mb-4 flex justify-between">
        <div>
          <h2 className="text-xl text-white">Edit Repair</h2>
        </div>
        <button onClick={handleSave} className="bg-red-600 px-4 py-2 rounded text-white">Save</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input value={title} onChange={(e)=>setTitle(e.target.value)} className="p-3 bg-[#030712] text-white" />

        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="p-3 bg-[#030712] text-white">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <input type="date" value={dateIn} onChange={(e)=>setDateIn(e.target.value)} className="p-3 bg-[#030712] text-white" />

        {status === 'picked up' && (
          <input
            type="date"
            value={pickupDate}
            onChange={(e)=>setPickupDate(e.target.value)}
            className="p-3 bg-[#030712] text-white"
          />
        )}

        <CollapsibleTextSection title="Description" value={description} onChange={setDescription} placeholder="" defaultOpen />
        <CollapsibleTextSection title="Repair Notes" value={diagnosis} onChange={setDiagnosis} placeholder="" />
        <CollapsibleTextSection title="What Was Fixed" value={treatment} onChange={setTreatment} placeholder="" />
      </div>
    </div>
  )
}
