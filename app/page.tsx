import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SearchResultsClient from './SearchResultsClient'

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, '')
}

export default async function Home({ searchParams }: { searchParams?: { q?: string } }) {
  const query = (searchParams?.q || '').trim()
  const term = escapeLike(query)

  const supabase = await createClient()

  let customerCards: any[] = []

  if (term) {
    const { data: matchedCustomers } = await supabase
      .from('customers')
      .select('*')
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,notes.ilike.%${term}%`)
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

    customerCards = allCustomers.map((customer) => ({
      ...customer,
      jobs: jobsByCustomer.get(customer.id) || [],
      directMatch: directCustomerIds.includes(customer.id),
    }))
  }

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-6 text-white">
      <div className="mx-auto max-w-md">

        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Cardinal Drones CRM" className="w-full max-w-xs" />
        </div>

        <form method="GET" className="mb-5">
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search..."
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

        <div className="mb-6 flex flex-col gap-3">
          <Link
            href="/customers/new"
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-600 text-white"
          >
            + Add Customer
          </Link>

          <a
            href="/api/export-backup"
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-600 text-white"
          >
            Export Backup
          </a>
        </div>

        {term && <SearchResultsClient initialCards={customerCards} />}
      </div>
    </main>
  )
}
