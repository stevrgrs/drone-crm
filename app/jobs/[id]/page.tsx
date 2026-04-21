'use client'

import Link from 'next/link'
import UploadJobImage from './UploadJobImage'
import { createClient } from '@/lib/supabase/server'
import { useState } from 'react'

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
    return <main style={{ padding: 20 }}>Job not found.</main>
  }

  return (
    <main style={{ padding: 20 }}>
      <Link href={`/customers/${job.customer_id}`}>← Back to Customer</Link>

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

function ImageGallery({ images }: { images: any[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      {/* Grid */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {images.map((img: any) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Job upload"
            onClick={() => setSelected(img.image_url)}
            style={{
              width: 150,
              height: 150,
              objectFit: 'cover',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* Fullscreen overlay */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <img
            src={selected}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: 8,
            }}
          />
        </div>
      )}
    </>
  )
}