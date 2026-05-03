'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

const STATUS_OPTIONS = [
  { value: 'in progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

function cleanMoneyValue(value: string) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '').trim()
  return cleaned === '' ? null : Number(cleaned)
}

export default function EditJobForm({ job, customer }: { job: any; customer?: any }) {
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState(job.title || '')
  const [description, setDescription] = useState(job.description || '')
  const [status, setStatus] = useState(job.status || 'in progress')
  const [estimate, setEstimate] = useState(job.estimate ?? '')
  const [finalPrice, setFinalPrice] = useState(job.final_price ?? '')
  const [dateIn, setDateIn] = useState((job.date_in || '').split('T')[0])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const estimateValue = cleanMoneyValue(estimate)
      const finalPriceValue = cleanMoneyValue(finalPrice)

      if (estimateValue !== null && Number.isNaN(estimateValue)) {
        alert('Estimate must be a valid number or left blank.')
        return
      }

      if (finalPriceValue !== null && Number.isNaN(finalPriceValue)) {
        alert('Final Price must be a valid number or left blank.')
        return
      }

      const { error } = await supabase
        .from('service_jobs')
        .update({
          title,
          description,
          status,
          estimate: estimateValue,
          final_price: finalPriceValue,
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
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={dateIn}
          onChange={(e) => setDateIn(e.target.value)}
          className="p-3 rounded-xl bg-[#030712] border border-slate-700 text-white"
          style={{ colorScheme: 'dark' }}
        />

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
