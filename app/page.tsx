import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, '')
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
                    return (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 shadow-lg shadow-black/10"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-2xl font-bold text-white">{customer?.full_name || 'Unknown Customer'}</h3>
                              {job.status && (
                                <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-300">
                                  {job.status}
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-base text-slate-300">{job.title || 'Untitled Repair'}</p>

                            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                              <span>{customer?.phone || 'No phone'}</span>
                              {job.estimate != null && <span>Estimate: ${job.estimate}</span>}
                              {job.final_price != null && <span>Final: ${job.final_price}</span>}
                            </div>

                            {job.description && (
                              <p className="mt-4 max-w-3xl text-sm text-slate-400">{job.description}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
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
