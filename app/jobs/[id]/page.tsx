import Link from 'next/link'
import UploadJobImage from './UploadJobImage'
import ImageGallery from './ImageGallery'
import { createClient } from '@/lib/supabase/server'

export default async function JobDetailPage({
  params,
}: {
  params: { id: string }
}) {
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
      <Link href={`/customers/${job.customer_id}`}>
        ← Back to Customer
      </Link>

      <h1 style={{ marginTop: 20 }}>{job.title}</h1>

      <p><strong>Description:</strong> {job.description}</p>
      <p><strong>Status:</strong> {job.status}</p>
      <p><strong>Estimate:</strong> {job.estimate}</p>
      <p><strong>Final Price:</strong> {job.final_price}</p>

      <h2 style={{ marginTop: 30 }}>Upload Job Image</h2>
      <UploadJobImage jobId={id} />

      <h2 style={{ marginTop: 30 }}>Job Images</h2>

      <ImageGallery images={images || []} />
    </main>
  )
}