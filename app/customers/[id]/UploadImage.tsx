'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function UploadImage({ customerId }: { customerId: string }) {
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
      const filePath = `${customerId}/${Date.now()}_${safeName}`

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
        .from('customer_images')
        .insert([
          {
            customer_id: customerId,
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
    <form onSubmit={handleUpload}>
      <label htmlFor="customer-image-file">Choose Image</label>
      <br />
      <input
        id="customer-image-file"
        type="file"
        name="file"
        accept="image/*"
        required
      />
      <br />
      <button type="submit" disabled={uploading} style={{ marginTop: 8 }}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  )
}