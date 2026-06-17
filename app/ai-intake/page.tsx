'use client'

import Link from 'next/link'
import { useState } from 'react'
import HistoryNav from '@/app/components/HistoryNav'

type IntakeDraft = {
  customer: {
    full_name: string | null
    phone: string | null
    email: string | null
    notes: string | null
  }
  job: {
    title: string | null
    status: string | null
    date_in: string | null
    description: string | null
    diagnosis: string | null
    treatment: string | null
    estimate: string | null
    final_price: string | null
  }
}

type DuplicateCustomer = {
  id: string
  full_name?: string | null
  phone?: string | null
  email?: string | null
}

const EMPTY_DRAFT: IntakeDraft = {
  customer: {
    full_name: '',
    phone: '',
    email: '',
    notes: '',
  },
  job: {
    title: '',
    status: 'in progress',
    date_in: new Date().toISOString().split('T')[0],
    description: '',
    diagnosis: '',
    treatment: '',
    estimate: '',
    final_price: '',
  },
}

function updateNested<T extends keyof IntakeDraft>(
  draft: IntakeDraft,
  section: T,
  key: keyof IntakeDraft[T],
  value: string
) {
  return {
    ...draft,
    [section]: {
      ...draft[section],
      [key]: value,
    },
  }
}

export default function AiIntakePage() {
  const [rawInput, setRawInput] = useState('')
  const [draft, setDraft] = useState<IntakeDraft | null>(null)
  const [duplicateCustomers, setDuplicateCustomers] = useState<DuplicateCustomer[]>([])
  const [existingCustomerId, setExistingCustomerId] = useState('')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<{ customerId: string; jobId: string } | null>(null)

  async function parseInput() {
    setError('')
    setSaved(null)
    setParsing(true)

    try {
      const response = await fetch('/api/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse',
          rawInput,
          timeZone: 'America/New_York',
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Parse failed')

      setDraft(payload.draft || EMPTY_DRAFT)
      setDuplicateCustomers(payload.duplicateCustomers || [])
      setExistingCustomerId('')
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  async function saveDraft() {
    if (!draft) return

    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          rawInput,
          draft,
          existingCustomerId: existingCustomerId || null,
          timeZone: 'America/New_York',
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Save failed')

      setSaved({ customerId: payload.customerId, jobId: payload.jobId })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <HistoryNav />

        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6">
          <h1 className="text-3xl font-bold text-white">AI Intake</h1>

          <div className="mt-6">
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              rows={7}
              placeholder="John Smith dropped off a DJI Mini 3 Pro today. Phone is 561-555-1212. Gimbal error. Needs estimate. Mark urgent."
              className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white placeholder:text-slate-500"
            />

            <button
              type="button"
              onClick={parseInput}
              disabled={parsing || !rawInput.trim()}
              className="mt-4 h-12 rounded-xl bg-red-600 px-5 font-semibold text-white disabled:opacity-60"
            >
              {parsing ? 'Parsing...' : 'Parse'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {draft && (
            <div className="mt-8 space-y-6 border-t border-slate-800 pt-6">
              {duplicateCustomers.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="mb-3 text-sm font-semibold text-amber-200">Possible duplicate customer</div>
                  <select
                    value={existingCustomerId}
                    onChange={(event) => setExistingCustomerId(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#030712] px-3 py-2 text-white"
                  >
                    <option value="">Create new customer</option>
                    {duplicateCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        Attach to {customer.full_name || 'Unnamed Customer'} {customer.phone ? `(${customer.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <section>
                <h2 className="text-xl font-semibold text-white">Customer</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input value={draft.customer.full_name || ''} onChange={(e) => setDraft(updateNested(draft, 'customer', 'full_name', e.target.value))} placeholder="Full Name" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
                  <input value={draft.customer.phone || ''} onChange={(e) => setDraft(updateNested(draft, 'customer', 'phone', e.target.value))} placeholder="Phone" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
                  <input value={draft.customer.email || ''} onChange={(e) => setDraft(updateNested(draft, 'customer', 'email', e.target.value))} placeholder="Email" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white md:col-span-2" />
                  <textarea value={draft.customer.notes || ''} onChange={(e) => setDraft(updateNested(draft, 'customer', 'notes', e.target.value))} placeholder="Notes" rows={3} className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white md:col-span-2" />
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white">Repair</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input value={draft.job.title || ''} onChange={(e) => setDraft(updateNested(draft, 'job', 'title', e.target.value))} placeholder="Drone / Title" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
                  <select value={draft.job.status || 'in progress'} onChange={(e) => setDraft(updateNested(draft, 'job', 'status', e.target.value))} className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white">
                    <option value="urgent">urgent</option>
                    <option value="in progress">in progress</option>
                    <option value="completed">completed</option>
                    <option value="picked up">picked up</option>
                  </select>
                  <input type="date" value={draft.job.date_in || ''} onChange={(e) => setDraft(updateNested(draft, 'job', 'date_in', e.target.value))} className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" style={{ colorScheme: 'dark' }} />
                  <input value={draft.job.estimate || ''} onChange={(e) => setDraft(updateNested(draft, 'job', 'estimate', e.target.value))} placeholder="Estimate" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
                  <input value={draft.job.final_price || ''} onChange={(e) => setDraft(updateNested(draft, 'job', 'final_price', e.target.value))} placeholder="Final Price" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
                  <textarea value={draft.job.description || ''} onChange={(e) => setDraft(updateNested(draft, 'job', 'description', e.target.value))} placeholder="Description / Problem" rows={3} className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white md:col-span-2" />
                  <textarea value={draft.job.diagnosis || ''} onChange={(e) => setDraft(updateNested(draft, 'job', 'diagnosis', e.target.value))} placeholder="Diagnosis" rows={3} className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white md:col-span-2" />
                  <textarea value={draft.job.treatment || ''} onChange={(e) => setDraft(updateNested(draft, 'job', 'treatment', e.target.value))} placeholder="Treatment" rows={3} className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white md:col-span-2" />
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving}
                  className="h-12 rounded-xl bg-red-600 px-5 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Confirm Save'}
                </button>

                {saved && (
                  <Link href={`/jobs/${saved.jobId}`} className="text-sm font-semibold text-red-300 hover:text-red-200">
                    Saved. Open repair
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
