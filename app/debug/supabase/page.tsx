import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function getProjectRef(url?: string) {
  if (!url) return 'missing'

  try {
    const hostname = new URL(url).hostname
    return hostname.split('.')[0] || hostname
  } catch {
    return 'invalid-url'
  }
}

export default async function SupabaseDebugPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = getProjectRef(supabaseUrl)
  const expectedPreviewRef = 'kevwtgueujqvimvhceiz'
  const hasPublishableKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  let jobs: any[] | null = null
  let errorMessage: string | null = null
  let customerNames: string[] = []

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('service_jobs')
      .select('id,title,status,customer_id,date_in,picked_up_at')
      .eq('status', 'completed')
      .order('date_in', { ascending: true })

    jobs = data || []
    errorMessage = error?.message || null

    const customerIds = Array.from(new Set((jobs || []).map((job) => job.customer_id).filter(Boolean)))

    if (customerIds.length) {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id,full_name')
        .in('id', customerIds)

      if (customersError) {
        errorMessage = `${errorMessage ? `${errorMessage}; ` : ''}Customers query: ${customersError.message}`
      }

      customerNames = (customers || []).map((customer) => customer.full_name).filter(Boolean)
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/completed" className="inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">
          ← Back to completed
        </Link>

        <div>
          <h1 className="text-3xl font-bold">Supabase Preview Debug</h1>
          <p className="mt-2 text-sm text-slate-400">
            Temporary PR-only page. It does not display secret keys.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#09111f] p-4">
          <div>
            <div className="text-sm text-slate-400">Supabase project ref in this deployment</div>
            <div className="font-mono text-lg text-white">{projectRef}</div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Expected preview project ref</div>
            <div className="font-mono text-lg text-white">{expectedPreviewRef}</div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Matches preview project?</div>
            <div className={projectRef === expectedPreviewRef ? 'text-green-400' : 'text-red-400'}>
              {projectRef === expectedPreviewRef ? 'YES' : 'NO'}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Publishable/anon key present?</div>
            <div className={hasPublishableKey ? 'text-green-400' : 'text-red-400'}>{hasPublishableKey ? 'YES' : 'NO'}</div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Completed job count returned by app</div>
            <div className="font-mono text-lg text-white">{jobs ? jobs.length : 'query failed'}</div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Supabase error</div>
            <div className={errorMessage ? 'font-mono text-red-400' : 'text-green-400'}>{errorMessage || 'none'}</div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#09111f] p-4">
          <h2 className="text-xl font-semibold">Completed jobs returned</h2>
          {jobs?.length ? (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-800 bg-[#0b1220] p-3">
                  <div className="font-semibold">{job.title || 'Untitled'}</div>
                  <div className="text-sm text-slate-400">status: {job.status}</div>
                  <div className="text-sm text-slate-400">date_in: {job.date_in || 'none'}</div>
                  <div className="text-sm text-slate-400">picked_up_at: {job.picked_up_at || 'null'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-3 text-slate-400">No completed jobs returned.</div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#09111f] p-4">
          <h2 className="text-xl font-semibold">Customer names returned</h2>
          {customerNames.length ? (
            <ul className="list-inside list-disc text-slate-300">
              {customerNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-3 text-slate-400">No customer names returned.</div>
          )}
        </section>
      </div>
    </main>
  )
}
