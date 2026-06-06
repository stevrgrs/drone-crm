'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

const STATUS_OPTIONS = [
  { value: 'in progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'picked up', label: 'Picked Up' },
]

function cleanMoneyValue(value: string) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '').trim()
  return cleaned === '' ? null : Number(cleaned)
}

function normalizeStatus(value: string) {
  const normalized = String(value || '').trim().toLowerCase()
  return STATUS_OPTIONS.some((option) => option.value === normalized) ? normalized : 'in progress'
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function dateTimeLocalToIso(value: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function currentDateTimeLocalValue() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown save error'
}

export default function EditJobForm({ job, customer }: { job: any; customer?: any }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState(job.title || '')
  const [description, setDescription] = useState(job.description || '')
  const [status, setStatus] = useState(normalizeStatus(job.status || 'in progress'))
  const [estimate, setEstimate] = useState(job.estimate ?? '')
  const [finalPrice, setFinalPrice] = useState(job.final_price ?? '')
  const [dateIn, setDateIn] = useState((job.date_in || '').split('T')[0])
  const [pickedUpAt, setPickedUpAt] = useState(toDateTimeLocalValue(job.picked_up_at))
  const [saving, setSaving] = useState(false)

  function handleStatusChange(nextStatus: string) {
    const normalizedStatus = normalizeStatus(nextStatus)
    setStatus(normalizedStatus)

    if (normalizedStatus === 'picked up' && !pickedUpAt) {
      setPickedUpAt(currentDateTimeLocalValue())
    }
  }

  async function handleSave() {
    if (saving) return

    setSaving(true)
    try {
      const normalizedStatus = normalizeStatus(status)
      const estimateValue = cleanMoneyValue(estimate)
      const finalPriceValue = cleanMoneyValue(finalPrice)
      const pickedUpAtValue = normalizedStatus === 'picked up' ? dateTimeLocalToIso(pickedUpAt) : null

      if (estimateValue !== null && Number.isNaN(estimateValue)) {
        alert('Estimate must be a valid number or left blank.')
        return
      }

      if (finalPriceValue !== null && Number.isNaN(finalPriceValue)) {
        alert('Final Price must be a valid number or left blank.')
        return
      }

      if (normalizedStatus === 'picked up' && !pickedUpAtValue) {
        alert('Pickup date/time is required when status is Picked Up.')
        return
      }

      const { error } = await supabase
        .from('service_jobs')
        .update({
          title: title.trim() || 'New Repair',
          description: description.trim() || null,
          status: normalizedStatus,
          estimate: estimateValue,
          final_price: finalPriceValue,
          date_in: dateIn || null,
          picked_up_at: pickedUpAtValue,
        })
        .eq('id', job.id)

      if (error) {
        alert(`Save failed: ${error.message}`)
        return
      }

      router.refresh()
      window.setTimeout(() => {
        setSaving(false)
      }, 300)
    } catch (error) {
      const message = errorMessage(error)
      alert(
        message === 'Load failed'
          ? 'Save failed: the network request did not complete. Check signal/Wi-Fi, wait a few seconds, and tap Save again.'
          : `Save failed: ${message}`
      )
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
            className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
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
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
        />

        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Date In</span>
          <input
            type="date"
            value={dateIn}
            onChange={(e) => setDateIn(e.target.value)}
            className="w-full p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
            style={{ colorScheme: 'dark' }}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Picked Up Date / Time</span>
          <input
            type="datetime-local"
            value={pickedUpAt}
            onChange={(e) => setPickedUpAt(e.target.value)}
            disabled={status !== 'picked up'}
            className="w-full p-3 rounded-xl bg-[#030712] border border-slate-700 text-white disabled:opacity-50"
            style={{ colorScheme: 'dark' }}
          />
        </label>

        <input
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          placeholder="Estimate"
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
        />

        <input
          value={finalPrice}
          onChange={(e) => setFinalPrice(e.target.value)}
          placeholder="Final Price"
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white md:col-span-2"
          rows={5}
        />
      </div>
    </div>
  )
}
