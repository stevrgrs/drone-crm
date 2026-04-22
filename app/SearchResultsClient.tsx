'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

type Job = {
  id: string
  customer_id: string
  title?: string | null
  description?: string | null
  status?: string | null
  estimate?: number | string | null
  final_price?: number | string | null
  date_in?: string | null
  created_at?: string | null
}

type CustomerCard = {
  id: string
  full_name?: string | null
  name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  directMatch?: boolean
  jobs: Job[]
}

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return `$${amount.toFixed(2)}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US')
}

function getDaysInShop(job: Job) {
  const source = job.date_in || job.created_at || null
  if (!source) return null
  const start = new Date(source)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function getDaysBadgeClass(days: number | null) {
  if (days === null) return 'bg-slate-800 text-slate-300 border border-slate-700'
  if (days >= 30) return 'bg-red-500/15 text-red-300 border border-red-500/30'
  if (days >= 14) return 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
  return 'bg-slate-800 text-slate-300 border border-slate-700'
}

function EditableField({
  value,
  onSave,
  className,
  placeholder,
  multiline = false,
}: {
  value: string
  onSave: (next: string) => Promise<void>
  className: string
  placeholder?: string
  multiline?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    if (draft === value) return
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  if (multiline) {
    return (
      <div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
          rows={3}
        />
        {saving && <div className="mt-1 text-xs text-slate-500">Saving...</div>}
      </div>
    )
  }

  return (
    <div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
      />
      {saving && <div className="mt-1 text-xs text-slate-500">Saving...</div>}
    </div>
  )
}

export default function SearchResultsClient({
  initialCards,
}: {
  initialCards: CustomerCard[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [cards, setCards] = useState(initialCards)
  const [busyCustomerId, setBusyCustomerId] = useState<string | null>(null)
  const [busyJobId, setBusyJobId] = useState<string | null>(null)

  async function updateCustomer(customerId: string, patch: Partial<CustomerCard>) {
    const { error } = await supabase
      .from('customers')
      .update({
        ...patch,
        name: patch.full_name ?? patch.name,
      })
      .eq('id', customerId)

    if (error) {
      alert(error.message)
      throw error
    }

    setCards((current) =>
      current.map((card) =>
        card.id === customerId ? { ...card, ...patch, name: patch.full_name ?? patch.name ?? card.name } : card
      )
    )
  }

  async function updateJob(jobId: string, patch: Partial<Job>) {
    const { error } = await supabase.from('service_jobs').update(patch).eq('id', jobId)
    if (error) {
      alert(error.message)
      throw error
    }

    setCards((current) =>
      current.map((card) => ({
        ...card,
        jobs: card.jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
      }))
    )
  }

  async function addRepair(customerId: string) {
    setBusyCustomerId(customerId)
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .insert([
          {
            customer_id: customerId,
            title: 'New Repair',
            status: 'New',
            description: '',
          },
        ])
        .select('*')
        .single()

      if (error) {
        alert(error.message)
        return
      }

      setCards((current) =>
        current.map((card) =>
          card.id === customerId ? { ...card, jobs: [data, ...card.jobs] } : card
        )
      )
    } finally {
      setBusyCustomerId(null)
    }
  }

  async function deleteRepair(jobId: string) {
    const confirmed = window.confirm('Delete this repair?')
    if (!confirmed) return

    setBusyJobId(jobId)
    try {
      const { error } = await supabase.from('service_jobs').delete().eq('id', jobId)
      if (error) {
        alert(error.message)
        return
      }

      setCards((current) =>
        current.map((card) => ({
          ...card,
          jobs: card.jobs.filter((job) => job.id !== jobId),
        }))
      )
    } finally {
      setBusyJobId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Results</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
          {cards.length} customer{cards.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-6">
        {cards.map((customer) => (
          <div
            key={customer.id}
            className="rounded-[24px] border border-slate-800 bg-[#0b1220] p-5 shadow-2xl shadow-black/20"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <EditableField
                    value={customer.full_name || customer.name || ''}
                    onSave={(next) => updateCustomer(customer.id, { full_name: next, name: next })}
                    className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-3xl font-bold text-white outline-none focus:border-red-500"
                    placeholder="Customer name"
                  />
                  {customer.directMatch && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-300">
                      Match
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField
                    value={customer.phone || ''}
                    onSave={(next) => updateCustomer(customer.id, { phone: next })}
                    className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                    placeholder="Phone"
                  />
                  <EditableField
                    value={customer.email || ''}
                    onSave={(next) => updateCustomer(customer.id, { email: next })}
                    className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                    placeholder="Email"
                  />
                </div>

                <EditableField
                  value={customer.notes || ''}
                  onSave={(next) => updateCustomer(customer.id, { notes: next })}
                  className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-300 outline-none focus:border-red-500"
                  placeholder="Customer notes"
                  multiline
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900"
                  >
                    Call
                  </a>
                )}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900"
                  >
                    Email
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800 pt-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h4 className="text-lg font-semibold text-white">Repairs</h4>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-slate-300">
                    {customer.jobs.length} job{customer.jobs.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => addRepair(customer.id)}
                    disabled={busyCustomerId === customer.id}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {busyCustomerId === customer.id ? 'Adding...' : 'Add Repair'}
                  </button>
                </div>
              </div>

              {customer.jobs.length ? (
                <div className="space-y-3">
                  {customer.jobs.map((job) => {
                    const daysInShop = getDaysInShop(job)
                    return (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-slate-800 bg-[#09111f] px-4 py-4"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <EditableField
                                value={job.title || ''}
                                onSave={(next) => updateJob(job.id, { title: next })}
                                className="min-w-[220px] rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-xl font-semibold text-white outline-none focus:border-red-500"
                                placeholder="Drone / Repair title"
                              />

                              <EditableField
                                value={job.status || ''}
                                onSave={(next) => updateJob(job.id, { status: next })}
                                className="min-w-[140px] rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-amber-200 outline-none focus:border-red-500"
                                placeholder="Status"
                              />

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${getDaysBadgeClass(daysInShop)}`}
                              >
                                {daysInShop === null
                                  ? 'No date'
                                  : `${daysInShop} day${daysInShop === 1 ? '' : 's'} in shop`}
                              </span>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <div>
                                <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Date In</div>
                                <div className="rounded-xl border border-slate-800 bg-[#0b1220] px-4 py-3 text-sm text-slate-300">
                                  {formatDate(job.date_in || job.created_at)}
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Estimate</div>
                                <EditableField
                                  value={job.estimate == null ? '' : String(job.estimate)}
                                  onSave={(next) => updateJob(job.id, { estimate: next })}
                                  className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                                  placeholder="Estimate"
                                />
                              </div>
                              <div>
                                <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Actual</div>
                                <EditableField
                                  value={job.final_price == null ? '' : String(job.final_price)}
                                  onSave={(next) => updateJob(job.id, { final_price: next })}
                                  className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                                  placeholder="Final price"
                                />
                              </div>
                              <div>
                                <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Call</div>
                                <div className="flex gap-2">
                                  <Link
                                    href={`/jobs/${job.id}/photos`}
                                    className="rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-100 hover:bg-slate-900"
                                  >
                                    Photos
                                  </Link>
                                  {customer.phone && (
                                    <a
                                      href={`tel:${customer.phone}`}
                                      className="rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-100 hover:bg-slate-900"
                                    >
                                      Call
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            <EditableField
                              value={job.description || ''}
                              onSave={(next) => updateJob(job.id, { description: next })}
                              className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-300 outline-none focus:border-red-500"
                              placeholder="Repair description"
                              multiline
                            />
                          </div>

                          <div className="flex shrink-0 xl:justify-end">
                            <button
                              type="button"
                              onClick={() => deleteRepair(job.id)}
                              disabled={busyJobId === job.id}
                              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                            >
                              {busyJobId === job.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-4 text-slate-400">
                  No repairs found for this customer.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
