import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, '')
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

function getDaysInShop(job: any) {
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

export default async function Home({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const query = (searchParams?.q || '').trim()
  const term = escapeLike(query)

  const supabase = await createClient()

  let customerCards: any[] = []

  if (term) {
    const { data: matchedCustomers } = await supabase
      .from('customers')
      .select('*')
      .or(
        `full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,notes.ilike.%${term}%`
      )
      .limit(20)

    const directCustomers = matchedCustomers || []
    const directCustomerIds = directCustomers.map((c) => c.id).filter(Boolean)

    const { data: matchedJobsByText } = await supabase
      .from('service_jobs')
      .select('*')
      .or(`title.ilike.%${term}%,description.ilike.%${term}%,status.ilike.%${term}%`)
      .limit(50)

    const textJobs = matchedJobsByText || []
    const textJobCustomerIds = textJobs.map((job) => job.customer_id).filter(Boolean)

    const allCustomerIds = Array.from(new Set([...directCustomerIds, ...textJobCustomerIds]))

    const { data: relatedCustomers } = allCustomerIds.length
      ? await supabase.from('customers').select('*').in('id', allCustomerIds)
      : { data: [] as any[] }

    const allCustomers = relatedCustomers || []

    const jobsByCustomer = new Map<string, any[]>()

    if (directCustomerIds.length) {
      const { data: allJobsForDirectCustomers } = await supabase
        .from('service_jobs')
        .select('*')
        .in('customer_id', directCustomerIds)
        .order('created_at', { ascending: false })

      for (const job of allJobsForDirectCustomers || []) {
        const list = jobsByCustomer.get(job.customer_id) || []
        if (!list.some((existing) => existing.id === job.id)) {
          list.push(job)
        }
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

    customerCards = allCustomers
      .map((customer) => ({
        ...customer,
        jobs: (jobsByCustomer.get(customer.id) || []).sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime()
          const bTime = new Date(b.created_at || 0).getTime()
          return bTime - aTime
        }),
        directMatch: directCustomerIds.includes(customer.id),
      }))
      .sort((a, b) => {
        if (a.directMatch && !b.directMatch) return -1
        if (!a.directMatch && b.directMatch) return 1
        return (a.full_name || '').localeCompare(b.full_name || '')
      })
  }

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-red-400">
              Cardinal Drones
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Search CRM</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Search by customer name, phone, email, notes, job title, description, or status.
            </p>
          </div>

          <Link
            href="/customers"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Customers
          </Link>
        </div>

        <form method="GET" className="mb-8">
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-3 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search customer, phone, drone issue, notes, status..."
                className="h-14 flex-1 rounded-xl border border-slate-700 bg-[#030712] px-5 text-lg text-white outline-none placeholder:text-slate-500 focus:border-red-500"
              />
              <button
                type="submit"
                className="h-14 rounded-xl bg-red-600 px-6 text-base font-semibold text-white hover:bg-red-700"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {!term ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6">
              <h2 className="text-xl font-semibold">Search customers</h2>
              <p className="mt-2 text-sm text-slate-400">
                Find people by full name, partial name, phone number, email, or notes.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6">
              <h2 className="text-xl font-semibold">Repairs inside the same card</h2>
              <p className="mt-2 text-sm text-slate-400">
                Search results group each customer with their repairs underneath.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6">
              <h2 className="text-xl font-semibold">Dedicated photos page</h2>
              <p className="mt-2 text-sm text-slate-400">
                Photos open on a separate gallery page so the results stay clean.
              </p>
            </div>
          </div>
        ) : customerCards.length ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Results</h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                {customerCards.length} customer{customerCards.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-6">
              {customerCards.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-[24px] border border-slate-800 bg-[#0b1220] p-5 shadow-2xl shadow-black/20"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-3xl font-bold text-white">
                          {customer.full_name || 'Unnamed Customer'}
                        </h3>
                        {customer.directMatch && (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-300">
                            Match
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                        <span>{customer.phone || 'No phone'}</span>
                        <span>{customer.email || 'No email'}</span>
                      </div>

                      {customer.notes && (
                        <p className="mt-4 max-w-4xl text-sm text-slate-400">{customer.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Open
                      </Link>
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
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-slate-300">
                        {customer.jobs.length} job{customer.jobs.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {customer.jobs.length ? (
                      <div className="space-y-3">
                        {customer.jobs.map((job: any) => {
                          const daysInShop = getDaysInShop(job)

                          return (
                            <div
                              key={job.id}
                              className="rounded-2xl border border-slate-800 bg-[#09111f] px-4 py-4"
                            >
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="text-xl font-semibold text-white">
                                      {job.title || 'Untitled Repair'}
                                    </h5>

                                    {job.status && (
                                      <span className="rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
                                        {job.status}
                                      </span>
                                    )}

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-medium ${getDaysBadgeClass(
                                        daysInShop
                                      )}`}
                                    >
                                      {daysInShop === null
                                        ? 'No date'
                                        : `${daysInShop} day${daysInShop === 1 ? '' : 's'} in shop`}
                                    </span>
                                  </div>

                                  <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-400 md:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                      <span className="text-slate-500">Date In:</span>{' '}
                                      {formatDate(job.date_in || job.created_at)}
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Estimate:</span>{' '}
                                      {formatCurrency(job.estimate)}
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Actual:</span>{' '}
                                      {formatCurrency(job.final_price)}
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Phone:</span>{' '}
                                      {customer.phone || '—'}
                                    </div>
                                  </div>

                                  {job.description && (
                                    <p className="mt-3 text-sm text-slate-400">{job.description}</p>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 xl:justify-end">
                                  <Link
                                    href={`/jobs/${job.id}/photos`}
                                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900"
                                  >
                                    Photos
                                  </Link>
                                  {customer.phone && (
                                    <a
                                      href={`tel:${customer.phone}`}
                                      className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900"
                                    >
                                      Call
                                    </a>
                                  )}
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
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 text-slate-400">
            No results for “{query}”.
          </div>
        )}
      </div>
    </main>
  )
}
