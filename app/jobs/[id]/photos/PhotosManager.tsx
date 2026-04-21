'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

type JobImage = {
  id: string
  image_url: string
}

function getStoragePathFromPublicUrl(url: string) {
  const marker = '/storage/v1/object/public/customer-images/'
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}

export default function PhotosManager({
  jobId,
  images,
}: {
  jobId: string
  images: JobImage[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    try {
      for (const file of files) {
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
          .insert([{ job_id: jobId, image_url: data.publicUrl }])

        if (insertError) {
          alert(insertError.message)
          return
        }
      }

      window.location.reload()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(image: JobImage) {
    const confirmed = window.confirm('Remove this photo?')
    if (!confirmed) return

    setDeletingId(image.id)
    try {
      const storagePath = getStoragePathFromPublicUrl(image.image_url)
      if (storagePath) {
        await supabase.storage.from('customer-images').remove([storagePath])
      }

      const { error } = await supabase.from('job_images').delete().eq('id', image.id)
      if (error) {
        alert(error.message)
        return
      }

      window.location.reload()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Photos</h2>
            <p className="mt-2 text-sm text-slate-400">
              Click any photo to enlarge it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
              {images.length} image{images.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {uploading ? 'Adding...' : 'Add Photos'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleAddPhotos}
              className="hidden"
            />
          </div>
        </div>

        {images.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220]"
              >
                <button
                  type="button"
                  onClick={() => setSelected(image.image_url)}
                  className="block w-full"
                >
                  <img
                    src={image.image_url}
                    alt="Repair photo"
                    className="h-44 w-full object-cover"
                  />
                </button>
                <div className="flex gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setSelected(image.image_url)}
                    className="flex-1 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(image)}
                    disabled={deletingId === image.id}
                    className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deletingId === image.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 text-slate-400">
            No photos yet.
          </div>
        )}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <img
            src={selected}
            alt="Enlarged repair photo"
            className="max-h-[90vh] max-w-[95vw] rounded-xl"
          />
        </div>
      )}
    </div>
  )
}
