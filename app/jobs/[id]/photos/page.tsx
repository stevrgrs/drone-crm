import Link from 'next/link'
import PhotosManager from './PhotosManager'
import { createClient } from '@/lib/supabase/server'

export default async function JobPhotosPage({ params }: { params: { id: string } }) {
  const id = params.id
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
    return <main style={{ padding: 20 }}>Job not found.</main>
  }

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Search
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-white">
          {job.title || 'Repair'} Photos
        </h1>

        <p className="mt-2 text-slate-400">
          Manage photos for this repair. Click any image to view it full size.
        </p>

        <div className="mt-8">
          <PhotosManager jobId={id} images={images || []} />
        </div>
      </div>
    </main>
  )
}
