import HistoryNav from '@/app/components/HistoryNav'
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
      <div className="mx-auto max-w-5xl space-y-6">
        <HistoryNav />

        <h1 className="text-3xl font-bold text-white">
          {job.title || 'Repair'} Photos
        </h1>

        <PhotosManager jobId={id} images={images || []} />
      </div>
    </main>
  )
}
