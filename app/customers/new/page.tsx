'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import HistoryNav from '@/app/components/HistoryNav'

const STATUS_OPTIONS = ['urgent', 'in progress', 'completed', 'picked up']

type NewJob = {
  title: string
  status: string
  date_in: string
  description: string
  estimate: string
  final_price: string
}

function makeEmptyJob(): NewJob {
  return {
    title: '',
    status: 'in progress',
    date_in: new Date().toISOString().split('T')[0],
    description: '',
    estimate: '',
    final_price: '',
  }
}

export default function NewCustomerPage() {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [jobs, setJobs] = useState<NewJob[]>([])
  const [saving, setSaving] = useState(false)

  function addJob() {
    setJobs((current) => [...current, makeEmptyJob()])
  }

  function updateJob(index: number, patch: Partial<NewJob>) {
    setJobs((current) =>
      current.map((job, i) => (i === index ? { ...job, ...patch } : job))
    )
  }

  function removeJob(index: number) {
    setJobs((current) => current.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!fullName.trim()) {
      alert('Customer name is required')
      return
    }

    setSaving(true)
    try {
      const { data: createdCustomer, error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            full_name: fullName.trim(),
            name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            notes: notes.trim(),
          },
        ])
        .select('*')
        .single()

      if (customerError) {
        alert(customerError.message)
        return
      }

      const jobsToCreate = jobs
        .filter((job) => job.title.trim() || job.description.trim())
        .map((job) => ({
          customer_id: createdCustomer.id,
          title: job.title.trim() || 'New Repair',
          status: job.status,
          date_in: job.date_in || new Date().toISOString().split('T')[0],
          description: job.description.trim(),
          estimate: job.estimate.trim() || null,
          final_price: job.final_price.trim() || null,
        }))

      if (jobsToCreate.length) {
        const { error: jobsError } = await supabase
          .from('service_jobs')
          .insert(jobsToCreate)

        if (jobsError) {
          alert(jobsError.message)
          return
        }
      }

      router.push('/')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <HistoryNav />

        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6">
          <h1 className="text-3xl font-bold text-white">Add Customer</h1>
          <p className="mt-2 text-slate-400">Enter only the details for the new customer.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="md:col-span-2 rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={5}
              className="md:col-span-2 rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
            />
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">Repairs</h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                {jobs.length} job{jobs.length === 1 ? '' : 's'}
              </span>
            </div>

            {jobs.length ? (
              <div className="space-y-4">
                {jobs.map((job, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-800 bg-[#09111f] p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        value={job.title}
                        onChange={(e) => updateJob(index, { title: e.target.value })}
                        placeholder="Drone / Repair Title"
                        className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
                      />

                      <select
                        value={job.status}
                        onChange={(e) => updateJob(index, { status: e.target.value })}
                        className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        value={job.date_in}
                        onChange={(e) => updateJob(index, { date_in: e.target.value })}
                        className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
                      />

                      <input
                        value={job.estimate}
                        onChange={(e) => updateJob(index, { estimate: e.target.value })}
                        placeholder="Estimate"
                        className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
                      />

                      <input
                        value={job.final_price}
                        onChange={(e) => updateJob(index, { final_price: e.target.value })}
                        placeholder="Final Price"
                        className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
                      />

                      <div className="md:col-span-2">
                        <textarea
                          value={job.description}
                          onChange={(e) => updateJob(index, { description: e.target.value })}
                          placeholder="Repair Description"
                          rows={4}
                          className="w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeJob(index)}
                        className="rounded-xl bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900"
                      >
                        Remove Job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-4 text-slate-400">
                No repairs added yet.
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <button
              type="button"
              onClick={addJob}
              className="rounded-xl border border-slate-600 px-5 py-3 font-semibold text-white hover:bg-slate-900"
            >
              + Add Job
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
