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

const STATUS_OPTIONS = ['urgent', 'in progress', 'completed', 'picked up']

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return `$${amount.toFixed(2)}`
}

function getDaysInShop(job: Job) {
  const source = job.created_at || null
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

function TextField({
  defaultValue,
  onSave,
  className,
  placeholder,
}: {
  defaultValue: string
  onSave: (value: string) => Promise<void>
  className: string
  placeholder?: string
}) {
  const [value, setValue] = useState(defaultValue)

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      placeholder={placeholder}
      className={className}
    />
  )
}

function TextAreaField({
  defaultValue,
  onSave,
  className,
  placeholder,
}: {
  defaultValue: string
  onSave: (value: string) => Promise<void>
  className: string
  placeholder?: string
}) {
  const [value, setValue] = useState(defaultValue)

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      placeholder={placeholder}
      rows={3}
      className={className}
    />
  )
}

export default function SearchResultsClient({ initialCards }: { initialCards: CustomerCard[] }) {
  const supabase = useMemo(() => createClient(), [])
  const [cards, setCards] = useState<CustomerCard[]>(initialCards)
  const [busyCustomerId, setBusyCustomerId] = useState<string | null>(null)
  const [busyJobId, setBusyJobId] = useState<string | null>(null)

  async function updateCustomer(id: string, patch: Partial<CustomerCard>) {
    const { error } = await supabase
      .from('customers')
      .update({ ...patch, name: patch.full_name ?? patch.name })
      .eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    setCards((current: CustomerCard[]) =>
      current.map((card: CustomerCard) =>
        card.id === id ? { ...card, ...patch, name: patch.full_name ?? patch.name ?? card.name } : card
      )
    )
  }

  async function updateJob(id: string, patch: Partial<Job>) {
    const { error } = await supabase.from('service_jobs').update(patch).eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    setCards((current: CustomerCard[]) =>
      current.map((card: CustomerCard) => ({
        ...card,
        jobs: card.jobs.map((job: Job) => (job.id === id ? { ...job, ...patch } : job)),
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
            status: 'in progress',
            description: '',
          },
        ])
        .select('*')
        .single()

      if (error) {
        alert(error.message)
        return
      }

      setCards((current: CustomerCard[]) =>
        current.map((card: CustomerCard) =>
          card.id === customerId ? { ...card, jobs: [data as Job, ...card.jobs] } : card
        )
      )
    } finally {
      setBusyCustomerId(null)
    }
  }

  async function deleteRepair(id: string) {
    if (!window.confirm('Delete this repair?')) return
    setBusyJobId(id)
    try {
      const { error } = await supabase.from('service_jobs').delete().eq('id', id)
      if (error) {
        alert(error.message)
        return
      }
      setCards((current: CustomerCard[]) =>
        current.map((card: CustomerCard) => ({
          ...card,
          jobs: card.jobs.filter((job: Job) => job.id !== id),
        }))
      )
    } finally {
      setBusyJobId(null)
    }
  }

  async function deleteCustomer(id: string) {
    if (!window.confirm('Delete this customer and all repair data?')) return
    setBusyCustomerId(id)
    try {
      const { error: jobError } = await supabase.from('service_jobs').delete().eq('customer_id', id)
      if (jobError) {
        alert(jobError.message)
        return
      }
      const { error: customerError } = await supabase.from('customers').delete().eq('id', id)
      if (customerError) {
        alert(customerError.message)
        return
      }
      setCards((current: CustomerCard[]) => current.filter((card: CustomerCard) => card.id !== id))
    } finally {
      setBusyCustomerId(null)
    }
  }

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 text-slate-400">
        No results found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-white">Results</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
          {cards.length} customer{cards.length === 1 ? '' : 's'}
        </span>
      </div>

      {cards.map((customer: CustomerCard) => (
        <div
          key={customer.id}
          className="rounded-[24px] border border-slate-800 bg-[#0b1220] p-5 shadow-2xl shadow-black/20"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <TextField
                  defaultValue={customer.full_name || customer.name || ''}
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
                <TextField
                  defaultValue={customer.phone || ''}
                  onSave={(next) => updateCustomer(customer.id, { phone: next })}
                  className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                  placeholder="Phone"
                />
                <TextField
                  defaultValue={customer.email || ''}
                  onSave={(next) => updateCustomer(customer.id, { email: next })}
                  className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                  placeholder="Email"
                />
              </div>

              <TextAreaField
                defaultValue={customer.notes || ''}
                onSave={(next) => updateCustomer(customer.id, { notes: next })}
                className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-300 outline-none focus:border-red-500"
                placeholder="Customer notes"
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
                {customer.jobs.map((job: Job) => {
                  const daysInShop = getDaysInShop(job)
                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-slate-800 bg-[#09111f] px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <TextField
                              defaultValue={job.title || ''}
                              onSave={(next) => updateJob(job.id, { title: next })}
                              className="min-w-[220px] rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-xl font-semibold text-white outline-none focus:border-red-500"
                              placeholder="Drone / Repair title"
                            />

                            <select
                              value={job.status || 'in progress'}
                              onChange={(e) => updateJob(job.id, { status: e.target.value })}
                              className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-amber-200 outline-none focus:border-red-500"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getDaysBadgeClass(daysInShop)}`}
                            >
                              {daysInShop === null
                                ? 'No date'
                                : `${daysInShop} day${daysInShop === 1 ? '' : 's'} in shop`}
                            </span>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Created</div>
                              <div className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200">
                                {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Estimate</div>
                              <TextField
                                defaultValue={job.estimate == null ? '' : String(job.estimate)}
                                onSave={(next) => updateJob(job.id, { estimate: next })}
                                className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                                placeholder="Estimate"
                              />
                            </div>
                            <div>
                              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Actual</div>
                              <TextField
                                defaultValue={job.final_price == null ? '' : String(job.final_price)}
                                onSave={(next) => updateJob(job.id, { final_price: next })}
                                className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-200 outline-none focus:border-red-500"
                                placeholder="Final price"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Actions</div>
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

                          <TextAreaField
                            defaultValue={job.description || ''}
                            onSave={(next) => updateJob(job.id, { description: next })}
                            className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-slate-300 outline-none focus:border-red-500"
                            placeholder="Repair description"
                          />

                          <div className="text-sm text-slate-400">
                            Current estimate: {formatCurrency(job.estimate)} · Current actual: {formatCurrency(job.final_price)}
                          </div>
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

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => deleteCustomer(customer.id)}
              disabled={busyCustomerId === customer.id}
              className="rounded-xl bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-60"
            >
              {busyCustomerId === customer.id ? 'Deleting...' : 'Delete Customer'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
