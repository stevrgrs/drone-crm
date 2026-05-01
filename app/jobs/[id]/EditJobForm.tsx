'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

const STATUS_OPTIONS = [
  { value: 'in progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</label>
}

export default function EditJobForm({ job, customer }: { job: any; customer?: any }) {
  const supabase = useMemo(() => createClient(), [])

  const initialStatus = job.status === 'picked up' ? 'completed' : (job.status || 'in progress')

  const [title, setTitle] = useState(job.title || '')
  const [description, setDescription] = useState(job.description || '')
  const [diagnosis, setDiagnosis] = useState(job.diagnosis || '')
  const [treatment, setTreatment] = useState(job.treatment || '')
  const [status, setStatus] = useState(initialStatus)
  const [estimate, setEstimate] = useState(job.estimate == null ? '' : String(job.estimate))
  const [finalPrice, setFinalPrice] = useState(job.final_price == null ? '' : String(job.final_price))
  const [dateIn, setDateIn] = useState((job.date_in || '').split('T')[0])
  const [pickupDate, setPickupDate] = useState((job.pickup_date || '').split('T')[0])
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Saved')

  const valuesRef = useRef({ title, description, diagnosis, treatment, status, estimate, finalPrice, dateIn, pickupDate })
  const lastSavedRef = useRef('')
  const isSavingRef = useRef(false)

  useEffect(() => {
    valuesRef.current = { title, description, diagnosis, treatment, status, estimate, finalPrice, dateIn, pickupDate }
    setSaveStatus('Unsaved changes')
  }, [title, description, diagnosis, treatment, status, estimate, finalPrice, dateIn, pickupDate])

  const saveRepair = useCallback(async ({ reload = false, quiet = false } = {}) => {
    if (isSavingRef.current) return

    const current = valuesRef.current
    const timestampedRepairNotes = current.diagnosis.trim() ? timestampRepairNotes(current.diagnosis) : null

    const payload = {
      title: current.title.trim(),
      description: current.description.trim(),
      diagnosis: timestampedRepairNotes,
      treatment: current.treatment.trim() || null,
      status: current.status,
      estimate: cleanMoneyValue(current.estimate),
      final_price: cleanMoneyValue(current.finalPrice),
      date_in: current.dateIn || null,
    }

    const signature = JSON.stringify({ ...payload, pickupDate: current.pickupDate })
    if (signature === lastSavedRef.current) return

    isSavingRef.current = true
    setSaving(true)
    if (!quiet) setSaveStatus('Saving...')

    try {
      const { error } = await supabase.from('service_jobs').update(payload).eq('id', job.id)

      if (error) {
        if (!quiet) alert(error.message)
        setSaveStatus('Save failed')
        return
      }

      lastSavedRef.current = signature
      if (timestampedRepairNotes && timestampedRepairNotes !== current.diagnosis) {
        setDiagnosis(timestampedRepairNotes)
      }
      setSaveStatus('Saved')
      if (reload) window.location.reload()
    } finally {
      isSavingRef.current = false
      setSaving(false)
    }
  }, [job.id, supabase])

  async function handleSave() {
    await saveRepair({ reload: true, quiet: false })
  }

  useEffect(() => {
    function autoSave() {
      saveRepair({ quiet: true })
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') autoSave()
    }
    window.addEventListener('blur', autoSave)
    window.addEventListener('pagehide', autoSave)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      autoSave()
      window.removeEventListener('blur', autoSave)
      window.removeEventListener('pagehide', autoSave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [saveRepair])

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
      <div className="mb-4 flex justify-between gap-3">
        <div>
          <h2 className="text-xl text-white">Edit Repair</h2>
          <p className="mt-1 text-xs text-slate-500">{saveStatus}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-60">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FieldLabel>Drone / Repair Title</FieldLabel>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white" />
        </div>

        <div>
          <FieldLabel>Repair Status</FieldLabel>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <FieldLabel>Drop-off Date</FieldLabel>
          <input type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} className="w-full rounded-xl bg-[#030712] p-3 text-white" style={{ colorScheme: 'dark' }} />
        </div>

        <div>
          <FieldLabel>Pickup Date</FieldLabel>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="w-full rounded-xl bg-[#030712] p-3 text-white"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <input value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="Estimate" inputMode="decimal" className="rounded-xl bg-[#030712] p-3 text-white" />
        <input value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} placeholder="Final Price" inputMode="decimal" className="rounded-xl bg-[#030712] p-3 text-white" />

        <CollapsibleTextSection title="Description" value={description} onChange={setDescription} placeholder="" defaultOpen />
        <CollapsibleTextSection title="Repair Notes" value={diagnosis} onChange={setDiagnosis} placeholder="" />
        <CollapsibleTextSection title="What Was Fixed" value={treatment} onChange={setTreatment} placeholder="" />
      </div>
    </div>
  )
}
