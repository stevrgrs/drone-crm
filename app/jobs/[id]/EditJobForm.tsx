'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function EditJobForm({ job }: { job: any }) {
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState(job.title || '')
  const [description, setDescription] = useState(job.description || '')
  const [status, setStatus] = useState(job.status || '')
  const [estimate, setEstimate] = useState(job.estimate || '')
  const [finalPrice, setFinalPrice] = useState(job.final_price || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('service_jobs')
        .update({
          title,
          description,
          status,
          estimate,
          final_price: finalPrice,
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Edit Repair</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid gap-4">
        <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Drone / Title" className="p-3 rounded-xl bg-[#030712] border border-slate-700" />
        <input value={status} onChange={(e)=>setStatus(e.target.value)} placeholder="Status" className="p-3 rounded-xl bg-[#030712] border border-slate-700" />
        <input value={estimate} onChange={(e)=>setEstimate(e.target.value)} placeholder="Estimate" className="p-3 rounded-xl bg-[#030712] border border-slate-700" />
        <input value={finalPrice} onChange={(e)=>setFinalPrice(e.target.value)} placeholder="Final Price" className="p-3 rounded-xl bg-[#030712] border border-slate-700" />
        <textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Description" className="p-3 rounded-xl bg-[#030712] border border-slate-700" />
      </div>
    </div>
  )
}
