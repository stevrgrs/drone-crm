'use client'

import { useMemo, useState } from 'react'
import UploadJobImage from '../UploadJobImage'
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
  const [selected, setSelected] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
        <h2 className="text-xl font-semibold text-white">Add Photo</h2>
        <p className="mt-2 text-sm text-slate-400">
          Upload from your phone camera, photo library, or computer.
        </p>
        <div className="mt-4">
          <UploadJobImage jobId={jobId} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Photos</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
            {images.length} image{images.length === 1 ? '' : 's'}
          </span>
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
