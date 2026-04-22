'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

type JobImage = {
  id: string
  image_url: string
  details?: string | null
  caption?: string | null
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
  const [selected, setSelected] = useState<JobImage | null>(null)
  const [detailsDraft, setDetailsDraft] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!selected) {
      setDetailsDraft('')
      return
    }
    setDetailsDraft(selected.details || selected.caption || '')
  }, [selected])

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

  async function handleSaveDetails() {
    if (!selected) return

    setSavingDetails(true)
    try {
      const { error } = await supabase
        .from('job_images')
        .update({ details: detailsDraft })
        .eq('id', selected.id)

      if (error) {
        alert(error.message)
        return
      }

      setSelected({ ...selected, details: detailsDraft })
      window.location.reload()
    } finally {
      setSavingDetails(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Photos</h2>
            <p className="mt-2 text-sm text-slate-400">
              Click any photo to enlarge it. You can add details under the enlarged photo.
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
                  onClick={() => setSelected(image)}
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
                    onClick={() => setSelected(image)}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 p-4">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center py-8">
            <div className="w-full rounded-2xl border border-slate-800 bg-[#09111f] p-4 shadow-2xl shadow-black/40">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
                >
                  Close
                </button>
              </div>

              <img
                src={selected.image_url}
                alt="Enlarged repair photo"
                className="mx-auto mt-2 max-h-[70vh] max-w-full rounded-xl"
              />

              <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
                <label className="block text-sm font-medium text-white">Caption / Details</label>
                <textarea
                  value={detailsDraft}
                  onChange={(e) => setDetailsDraft(e.target.value)}
                  rows={4}
                  placeholder="Add notes about what this photo shows..."
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-red-500"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {savingDetails ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
