'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function UploadJobImage({ jobId }: { jobId: string }) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const form = e.currentTarget
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null
    const file = fileInput?.files?.[0]

    if (!file) {
      alert('Please choose a file.')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `jobs/${jobId}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('customer-images')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        })

      if (uploadError) {
        alert(uploadError.message)
        return
      }

      const { data } = supabase.storage
        .from('customer-images')
        .getPublicUrl(filePath)

      const { error: insertError } = await supabase
        .from('job_images')
        .insert([
          {
            job_id: jobId,
            image_url: data.publicUrl,
          },
        ])

      if (insertError) {
        alert(insertError.message)
        return
      }

      window.location.reload()
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-3">
      <div>
        <label
          htmlFor="job-image-file"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Choose image
        </label>
        <input
          id="job-image-file"
          type="file"
          name="file"
          accept="image/*"
          required
          className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? 'Uploading...' : 'Upload Job Image'}
      </button>
    </form>
  )
}