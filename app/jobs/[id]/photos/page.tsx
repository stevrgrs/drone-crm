import Link from 'next/link'
import ImageGallery from '../ImageGallery'
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
    <main style={{ padding: 20 }}>
      <Link href={`/jobs/${id}`}>← Back to Job</Link>
      <h1 style={{ marginTop: 20 }}>{job.title} Photos</h1>
      <p style={{ color: '#666', marginTop: 8 }}>
        Click any image to enlarge it.
      </p>

      <div style={{ marginTop: 24 }}>
        <ImageGallery images={images || []} />
      </div>
    </main>
  )
}
