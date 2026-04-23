import Link from 'next/link'
import EditJobForm from './EditJobForm'
import { createClient } from '@/lib/supabase/server'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const id = params.id
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (!job) {
    return <main style={{ padding: 20 }}>Job not found.</main>
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', job.customer_id)
    .single()

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="text-slate-400 hover:text-white">← Back to Search</Link>

        <EditJobForm job={job} customer={customer} />
      </div>
    </main>
  )
}
