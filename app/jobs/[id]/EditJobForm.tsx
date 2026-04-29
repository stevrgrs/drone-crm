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

function CollapsibleTextSection({
  title,
  value,
  onChange,
  placeholder,
  defaultOpen = false,
}: {
  title: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  defaultOpen?: boolean
}) {
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
        className="mt-4 w-full rounded-xl border border-slate-700 bg-[#030712] p-3 text-white placeholder:text-slate-500"
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
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Edit Repair</h2>
          {customer?.full_name && <p className="mt-1 text-slate-400">{customer.full_name}</p>}
          {customer?.phone && <p className="text-slate-400">{customer.phone}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/jobs/${job.id}/photos`}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900"
          >
            Photos
          </Link>
          {customer?.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900"
            >
              Call
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Drone / Title"
          className="rounded-xl border border-slate-700 bg-[#030712] p-3 text-white"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-700 bg-[#030712] p-3 text-white"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={dateIn}
          onChange={(e) => setDateIn(e.target.value)}
          className="rounded-xl border border-slate-700 bg-[#030712] p-3 text-white"
          style={{ colorScheme: 'dark' }}
        />

        <input
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="Estimate"
          inputMode="decimal"
          className="rounded-xl border border-slate-700 bg-[#030712] p-3 text-white"
        />

        <input
          value={finalPrice}
          onChange={(e) => setFinalPrice(e.target.value)}
          placeholder="Final Price"
          inputMode="decimal"
          className="rounded-xl border border-slate-700 bg-[#030712] p-3 text-white"
        />

        <CollapsibleTextSection
          title="Description"
          value={description}
          onChange={setDescription}
          placeholder="General repair description..."
          defaultOpen
        />

        <CollapsibleTextSection
          title="Repair Notes"
          value={diagnosis}
          onChange={setDiagnosis}
          placeholder="Add repair notes, diagnosis, findings, or observations..."
        />

        <CollapsibleTextSection
          title="What Was Fixed"
          value={treatment}
          onChange={setTreatment}
          placeholder="List what was fixed, replaced, adjusted, or completed..."
        />
      </div>
    </div>
  )
}
