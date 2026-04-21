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
  if (days === null) return 'bg-slate-800 text-slate-300'
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

  let customers: any[] = []
  let jobs: any[] = []
  const customerMap = new Map<string, any>()

  if (term) {
    const { data: customerResults } = await supabase
      .from('customers')
      .select('*')
      .or(
        `full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,notes.ilike.%${term}%`
      )
      .limit(20)

    customers = customerResults || []

    const { data: jobResults } = await supabase
      .from('service_jobs')
      .select('*')
      .or(`title.ilike.%${term}%,description.ilike.%${term}%,status.ilike.%${term}%`)
      .limit(20)

    jobs = jobResults || []

    const customerIds = Array.from(
      new Set([
        ...customers.map((c) => c.id),
        ...jobs.map((job) => job.customer_id).filter(Boolean),
      ])
    )

    if (customerIds.length) {
      const { data: relatedCustomers } = await supabase
        .from('customers')
        .select('*')
        .in('id', customerIds)

      for (const customer of relatedCustomers || []) {
        customerMap.set(customer.id, customer)
      }
    }
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
              <h2 className="text-xl font-semibold">Search repairs</h2>
              <p className="mt-2 text-sm text-slate-400">
                Find jobs by title, issue description, or status without digging through tables.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6">
              <h2 className="text-xl font-semibold">Open photos fast</h2>
              <p className="mt-2 text-sm text-slate-400">
                Every job result includes a Photos button so cards stay clean and uncluttered.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold">Customers</h2>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                  {customers.length} result{customers.length === 1 ? '' : 's'}
                </span>
              </div>

              {customers.length ? (
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 shadow-lg shadow-black/10"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-2xl font-bold text-white">{customer.full_name || 'Unnamed Customer'}</h3>
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                            <span>{customer.phone || 'No phone'}</span>
                            <span>{customer.email || 'No email'}</span>
                          </div>
                          {customer.notes && (
                            <p className="mt-4 max-w-3xl text-sm text-slate-400">{customer.notes}</p>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 text-slate-400">
                  No customer results for “{query}”.
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold">Repairs</h2>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                  {jobs.length} result{jobs.length === 1 ? '' : 's'}
                </span>
              </div>

              {jobs.length ? (
                <div className="space-y-4">
                  {jobs.map((job) => {
                    const customer = customerMap.get(job.customer_id)
                    const daysInShop = getDaysInShop(job)
                    return (
                      <div
                        key={job.id}
                        className="rounded-[22px] border border-slate-800 bg-[#09111f] p-5 shadow-lg shadow-black/20"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <h3 className="text-3xl font-bold text-white">
                                  {customer?.full_name || 'Unknown Customer'}
                                </h3>
                                <div className="mt-2 text-base text-red-400">
                                  {customer?.phone || 'No phone'}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                {job.status && (
                                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-300 border border-amber-500/20">
                                    {job.status}
                                  </span>
                                )}
                                <span
                                  className={`rounded-full px-3 py-1 text-sm font-medium ${getDaysBadgeClass(
                                    daysInShop
                                  )}`}
                                >
                                  {daysInShop === null ? 'No date' : `${daysInShop} day${daysInShop === 1 ? '' : 's'} in shop`}
                                </span>
                              </div>
                            </div>

                            <div className="mt-6 grid gap-5 md:grid-cols-2">
                              <div>
                                <p className="text-sm uppercase tracking-wide text-slate-500">Drone</p>
                                <p className="mt-1 text-2xl font-semibold text-white">
                                  {job.title || 'Untitled Repair'}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm uppercase tracking-wide text-slate-500">Date In</p>
                                <p className="mt-1 text-2xl font-semibold text-white">
                                  {formatDate(job.date_in || job.created_at)}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm uppercase tracking-wide text-slate-500">Estimate</p>
                                <p className="mt-1 text-2xl font-semibold text-white">
                                  {formatCurrency(job.estimate)}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm uppercase tracking-wide text-slate-500">Actual Cost</p>
                                <p className="mt-1 text-2xl font-semibold text-white">
                                  {formatCurrency(job.final_price)}
                                </p>
                              </div>
                            </div>

                            {job.description && (
                              <div className="mt-5 border-t border-slate-800 pt-4 text-lg text-slate-400">
                                {job.description}
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2 lg:w-[220px] lg:justify-end">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                              Open
                            </Link>
                            <Link
                              href={`/jobs/${job.id}`}
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
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 text-slate-400">
                  No repair results for “{query}”.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
