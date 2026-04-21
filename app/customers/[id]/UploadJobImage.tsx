'use client'

import { useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Props = {
  jobId: string
}

export default function UploadJobImage({ jobId }: Props) {
  const [uploading, setUploading] = useState(false)

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      ),
    []
  )

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${jobId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('job-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error(uploadError)
        alert('Upload failed')
        return
      }

      const { data } = supabase.storage
        .from('job-images')
        .getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('job_images').insert({
        job_id: jobId,
        image_url: data.publicUrl,
      })

      if (insertError) {
        console.error(insertError)
        alert('Image uploaded, but saving the record failed')
        return
      }

      alert('Uploaded!')
      window.location.reload()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <label className="inline-flex cursor-pointer items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
        {uploading ? 'Uploading...' : 'Upload Photo'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="sr-only"
          disabled={uploading}
        />
      </label>

      <p className="text-sm text-slate-500">
        On phone you can use the camera or photo library. On desktop you can choose a file.
      </p>
    </div>
  )
}
