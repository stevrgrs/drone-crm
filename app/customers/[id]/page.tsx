import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import EditCustomerForm from './EditCustomerForm'
import AddRepairButton from './AddRepairButton'

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const id = params.id

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) {
    return <div>Customer not found.</div>
  }

  const { data: jobs } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('customer_id', id)

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="text-slate-400 hover:text-white">← Back to Search</Link>

        <EditCustomerForm customer={customer} />

        <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Repairs</h2>
            <AddRepairButton customerId={customer.id} />
          </div>

          <div className="mt-4 space-y-2">
            {jobs?.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}/photos`}
                className="block rounded-xl border border-slate-700 p-3 hover:bg-slate-900"
              >
                {job.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
