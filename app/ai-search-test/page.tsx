import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Job = {
  id: string
  customer_id: string
  title?: string | null
  status?: string | null
  date_in?: string | null
  created_at?: string | null
  description?: string | null
  diagnosis?: string | null
  treatment?: string | null
}

type Customer = {
  id: string
  full_name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  jobs: Job[]
  directMatch: boolean
}

function cleanSearch(value: string) {
  return value.replace(/[%_,]/g, '').trim().slice(0, 120)
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits
}

function formatPhone(value?: string | null) {
  const digits = normalizePhone(value || '').slice(0, 10)
  if (!digits) return ''
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function jobAge(job: Job) {
  const source = job.date_in || job.created_at
  if (!source) return null
  const start = new Date(source)
  if (Number.isNaN(start.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function statusClass(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'urgent':
      return 'border-red-500/30 bg-red-500/15 text-red-300'
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    case 'picked up':
      return 'border-slate-600 bg-slate-700 text-slate-200'
    default:
      return 'border-amber-500/30 bg-amber-500/15 text-amber-300'
  }
}

async function searchCustomersAndJobs(term: string): Promise<Customer[]> {
  if (!term) return []

  const supabase = await createClient()

  const { data: matchedCustomers } = await supabase
    .from('customers')
    .select('*')
    .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,notes.ilike.%${term}%`)
    .limit(20)

  const directCustomers = matchedCustomers || []
  const directCustomerIds = directCustomers.map((customer) => customer.id).filter(Boolean)

  const { data: matchedJobsByText } = await supabase
    .from('service_jobs')
    .select('*')
    .or(`title.ilike.%${term}%,description.ilike.%${term}%,diagnosis.ilike.%${term}%,treatment.ilike.%${term}%,status.ilike.%${term}%`)
    .limit(50)

  const textJobs = matchedJobsByText || []
  const textJobCustomerIds = textJobs.map((job) => job.customer_id).filter(Boolean)
  const allCustomerIds = Array.from(new Set([...directCustomerIds, ...textJobCustomerIds]))

  const { data: relatedCustomers } = allCustomerIds.length
    ? await supabase.from('customers').select('*').in('id', allCustomerIds)
    : { data: [] as Customer[] }

  const jobsByCustomer = new Map<string, Job[]>()

  if (directCustomerIds.length) {
    const { data: allJobsForDirectCustomers } = await supabase
      .from('service_jobs')
      .select('*')
      .in('customer_id', directCustomerIds)

    for (const job of allJobsForDirectCustomers || []) {
      const list = jobsByCustomer.get(job.customer_id) || []
      list.push(job)
      jobsByCustomer.set(job.customer_id, list)
    }
  }

  for (const job of textJobs) {
    const list = jobsByCustomer.get(job.customer_id) || []
    if (!list.some((existing) => existing.id === job.id)) {
      list.push(job)
    }
    jobsByCustomer.set(job.customer_id, list)
  }

  return (relatedCustomers || []).map((customer) => ({
    ...customer,
    jobs: jobsByCustomer.get(customer.id) || [],
    directMatch: directCustomerIds.includes(customer.id),
  }))
}

export default async function AiSearchTestPage({ searchParams }: { searchParams?: { prompt?: string } }) {
  const rawPrompt = searchParams?.prompt || ''
  const term = cleanSearch(rawPrompt)
  const customers = await searchCustomersAndJobs(term)
  const resultCount = customers.reduce((count, customer) => count + Math.max(customer.jobs.length, 1), 0)

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <img src="/CDlogo.png" alt="Cardinal Drones CRM" className="w-full max-w-xs" />
        </div>

        <form className="mb-5">
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
            <input
              type="text"
              name="prompt"
              defaultValue={rawPrompt}
              placeholder="Ask about customers, jobs, invoices, or notes..."
              className="mb-3 h-14 w-full rounded-xl bg-[#030712] px-4 text-base text-white placeholder:text-slate-500"
            />

            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-red-600 text-lg font-semibold text-white"
            >
              Search
            </button>
          </div>
        </form>

        {term && (
          <section className="space-y-4">
            <p className="text-sm text-slate-400">
              {resultCount ? `${resultCount} read-only result${resultCount === 1 ? '' : 's'} for "${term}"` : `No read-only results for "${term}"`}
            </p>

            {customers.map((customer) => {
              const rows = customer.jobs.length ? customer.jobs : [null]
              return rows.map((job) => {
                const days = job ? jobAge(job) : null
                return (
                  <article key={job?.id || customer.id} className="rounded-2xl border border-slate-800 bg-[#0b1220] px-5 py-4">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-bold text-white">{customer.full_name || 'Unnamed Customer'}</h2>
                        <p className="text-sm text-slate-400">{formatPhone(customer.phone) || customer.email || 'No phone or email'}</p>
                        <p className="mt-2 text-sm text-slate-300">{job?.title || 'No repair entered yet'}</p>
                        {job?.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{job.description}</p>}
                        {!job && customer.notes && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{customer.notes}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {job?.status && (
                          <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(job.status)}`}>
                            {job.status}
                          </span>
                        )}
                        {days !== null && <span className="rounded bg-slate-700 px-2 py-1 text-xs">{days}d</span>}
                      </div>
                    </div>
                  </article>
                )
              })
            })}
          </section>
        )}
      </div>
    </main>
  )
}
