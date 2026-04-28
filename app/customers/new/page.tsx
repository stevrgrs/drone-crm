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
  diagnosis: string
  treatment: string
  estimate: string
  final_price: string
}

function makeEmptyJob(): NewJob {
  return {
    title: '',
    status: 'in progress',
    date_in: new Date().toISOString().split('T')[0],
    description: '',
    diagnosis: '',
    treatment: '',
    estimate: '',
    final_price: '',
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }

  return digits
}

function formatPhoneForDisplay(value: string) {
  const digits = normalizePhone(value).slice(0, 10)

  if (digits.length === 0) return ''
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function isValidPhone(value: string) {
  const digits = normalizePhone(value)
  return digits.length === 10
}

function cleanMoneyValue(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null
  return trimmed.replace(/[$,]/g, '')
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
    setJobs((current) => current.map((job, i) => (i === index ? { ...job, ...patch } : job)))
  }

  function removeJob(index: number) {
    setJobs((current) => current.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!fullName.trim()) {
      alert('Customer name is required')
      return
    }

    const cleanPhone = normalizePhone(phone)
    if (phone.trim() && !isValidPhone(phone)) {
      alert('Please enter a valid 10 digit phone number.')
      return
    }

    setSaving(true)
    try {
      const { data: createdCustomer, error: customerError } = await supabase
        .from('customers')
        .insert([{ full_name: fullName.trim(), phone: cleanPhone || null, email: email.trim(), notes: notes.trim() }])
        .select('*')
        .single()

      if (customerError) {
        alert(customerError.message)
        return
      }

      const jobsToCreate = jobs
        .filter((job) => job.title.trim() || job.description.trim() || job.diagnosis.trim() || job.treatment.trim())
        .map((job) => ({
          customer_id: createdCustomer.id,
          title: job.title.trim() || 'New Repair',
          status: job.status,
          date_in: job.date_in,
          description: job.description.trim(),
          diagnosis: job.diagnosis.trim() || null,
          treatment: job.treatment.trim() || null,
          estimate: cleanMoneyValue(job.estimate),
          final_price: cleanMoneyValue(job.final_price),
        }))

      if (jobsToCreate.length) {
        const { error: jobsError } = await supabase.from('service_jobs').insert(jobsToCreate)
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

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
            <input type="tel" value={phone} onChange={(e) => setPhone(formatPhoneForDisplay(e.target.value))} placeholder="(561) 555-5555" inputMode="tel" autoComplete="tel" className="rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="md:col-span-2 rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={5} className="md:col-span-2 rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-white" />
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Repairs</h2>
              <span className="text-sm text-slate-400">{jobs.length} jobs</span>
            </div>

            {jobs.map((job, index) => (
              <div key={index} className="mb-4 rounded-xl border border-slate-700 p-4">
                <input value={job.title} onChange={(e) => updateJob(index, { title: e.target.value })} placeholder="Repair" className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2" />
                <select value={job.status} onChange={(e) => updateJob(index, { status: e.target.value })} className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2 text-white">
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <input type="date" value={job.date_in} onChange={(e) => updateJob(index, { date_in: e.target.value })} className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2 text-white" style={{ colorScheme: 'dark' }} />
                <input value={job.estimate} onChange={(e) => updateJob(index, { estimate: e.target.value })} placeholder="Estimate" inputMode="decimal" className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2" />
                <input value={job.final_price} onChange={(e) => updateJob(index, { final_price: e.target.value })} placeholder="Final Price" inputMode="decimal" className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2" />
                <textarea value={job.description} onChange={(e) => updateJob(index, { description: e.target.value })} placeholder="Description" className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2" />
                <textarea value={job.diagnosis} onChange={(e) => updateJob(index, { diagnosis: e.target.value })} placeholder="Diagnosis" className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2" />
                <textarea value={job.treatment} onChange={(e) => updateJob(index, { treatment: e.target.value })} placeholder="Treatment" className="mb-2 w-full rounded-xl bg-[#030712] px-3 py-2" />
                <button onClick={() => removeJob(index)} className="text-red-400">Remove</button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={addJob} className="rounded-xl border px-4 py-2">+ Add Job</button>
            <button onClick={handleSave} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2">{saving ? 'Saving...' : 'Save Customer'}</button>
          </div>
        </div>
      </div>
    </main>
  )
}
