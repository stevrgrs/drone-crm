import Link from 'next/link'
import HistoryNav from '@/app/components/HistoryNav'
import { createClient } from '@/lib/supabase/server'

function formatPhoneForDisplay(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '')
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits

  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`
  }

  return value || 'No phone number'
}

function phoneHref(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  return `tel:${digits}`
}

function formatDate(value?: string | null) {
  if (!value) return 'No date in'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date in'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function CompletedJobsPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('status', 'completed')
    .order('date_in', { ascending: true })

  const customerIds = Array.from(new Set((jobs || []).map((job) => job.customer_id).filter(Boolean)))

  const { data: customers } = customerIds.length
    ? await supabase.from('customers').select('*').in('id', customerIds)
    : { data: [] as any[] }

  const customerById = new Map((customers || []).map((customer) => [customer.id, customer]))

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <HistoryNav />

        <div>
          <h1 className="text-3xl font-bold text-white">Completed Jobs</h1>
          <p className="mt-2 text-sm text-slate-400">
            Click a job to mark it Completed, In Progress, or Picked Up and record pickup time.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">Ready for pickup / status update</span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
              {(jobs || []).length} job{(jobs || []).length === 1 ? '' : 's'}
            </span>
          </div>

          {(jobs || []).length ? (
            <div className="space-y-2">
              {(jobs || []).map((job) => {
                const customer = customerById.get(job.customer_id)
                const href = phoneHref(customer?.phone)

                return (
                  <div key={job.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0b1220] p-3">
                    <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-white">{customer?.full_name || 'Unnamed Customer'}</div>
                      <div className="truncate text-sm text-slate-400">{formatPhoneForDisplay(customer?.phone)}</div>
                      <div className="truncate text-sm text-slate-300">{job.title || 'Repair'}</div>
                      <div className="mt-1 text-xs text-slate-500">Date in: {formatDate(job.date_in)}</div>
                    </Link>

                    {href ? (
                      <a
                        href={href}
                        className="shrink-0 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Call
                      </a>
                    ) : (
                      <span className="shrink-0 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-500">No #</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-4 text-slate-400">
              No completed jobs waiting for pickup.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
