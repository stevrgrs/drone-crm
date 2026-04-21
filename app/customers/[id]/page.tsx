import Link from 'next/link'
import UploadJobImage from './UploadJobImage'
import { createClient } from '@/lib/supabase/server'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: job } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('id', id)
    .single()

  const { data: images } = await supabase
    .from('job_images')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: false })

  if (!job) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8">
        Job not found.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">

      <div className="mb-6 rounded-2xl bg-red-600 p-6 text-3xl font-bold text-white">
        TAILWIND TEST
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href={`/customers/${job.customer_id}`}
            className="text-sm font-medium text-sky-700 hover:underline"
          >
            ← Back to Customer
          </Link>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {job.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              {job.status}
            </span>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Job Details</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Description</p>
              <p className="mt-1 text-slate-800">{job.description || '—'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Estimate</p>
              <p className="mt-1 text-slate-800">{job.estimate ?? '—'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Final Price</p>
              <p className="mt-1 text-slate-800">{job.final_price ?? '—'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Upload Job Image</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add photos specifically tied to this repair job.
          </p>
          <div className="mt-4">
            <UploadJobImage jobId={id} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Job Images</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {images?.length || 0} total
            </span>
          </div>

          {images?.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {images.map((img: any) => (
                <a
                  key={img.id}
                  href={img.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={img.image_url}
                    alt="Job upload"
                    className="h-44 w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No job images yet.</p>
          )}
        </section>
      </div>
    </main>
  )
}