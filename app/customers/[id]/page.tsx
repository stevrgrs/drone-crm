import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const id = params.id

  // Get customer
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) {
    return <div>Customer not found.</div>
  }

  // Get jobs for this customer
  const { data: jobs } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('customer_id', id)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{customer.name}</h1>

      <p className="text-gray-600 mb-4">
        {customer.phone} {customer.email && `| ${customer.email}`}
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Jobs</h2>

      {jobs?.length === 0 && <p>No jobs yet.</p>}

      <div className="space-y-2">
        {jobs?.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="block rounded-lg border p-3 hover:bg-gray-100"
          >
            Open Job {job.id}
          </Link>
        ))}
      </div>
    </div>
  )
}