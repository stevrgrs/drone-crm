'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Props = {
  jobId: string
}

export default function UploadJobImage({ jobId }: Props) {
  const supabase = createClientComponentClient()
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const fileName = `${jobId}/${Date.now()}-${file.name}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(fileName, file)

    if (uploadError) {
      alert('Upload failed')
      console.error(uploadError)
      setUploading(false)
      return
    }

    // Get public URL
    const { data } = supabase.storage
      .from('job-images')
      .getPublicUrl(fileName)

    const imageUrl = data.publicUrl

    // Save to DB
    await supabase.from('job_images').insert({
      job_id: jobId,
      image_url: imageUrl,
    })

    setUploading(false)
    alert('Uploaded!')
    location.reload()
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        className="block w-full text-sm"
      />

      {uploading && (
        <p className="text-sm text-slate-500">Uploading...</p>
      )}
    </div>
  )
}