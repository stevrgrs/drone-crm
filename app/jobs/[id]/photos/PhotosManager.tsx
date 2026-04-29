'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

type PhotoStage = 'Before' | 'In Progress' | 'After'

type JobImage = {
  id: string
  image_url: string
  details?: string | null
}

const PHOTO_STAGES: PhotoStage[] = ['Before', 'In Progress', 'After']
const STAGE_SLUGS: Record<PhotoStage, string> = {
  Before: 'before',
  'In Progress': 'in-progress',
  After: 'after',
}

function getStoragePathFromPublicUrl(url: string) {
  const marker = '/storage/v1/object/public/customer-images/'
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}

function getPhotoStage(image: JobImage): PhotoStage {
  const path = getStoragePathFromPublicUrl(image.image_url) || ''
  if (path.includes('/before/')) return 'Before'
  if (path.includes('/after/')) return 'After'
  return 'In Progress'
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
      <path d="M9 4c-.6 0-1.1.3-1.4.8L6.7 6H5c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-1.7l-.9-1.2c-.3-.5-.8-.8-1.4-.8H9zm3 4.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
    </svg>
  )
}

export default function PhotosManager({ jobId, images }: { jobId: string; images: JobImage[] }) {
  const supabase = useMemo(() => createClient(), [])
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const libraryInputRef = useRef<HTMLInputElement | null>(null)
  const [selected, setSelected] = useState<JobImage | null>(null)
  const [detailsDraft, setDetailsDraft] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<PhotoStage>('Before')
  const [openStages, setOpenStages] = useState<Record<PhotoStage, boolean>>({
    Before: true,
    'In Progress': true,
    After: true,
  })

  useEffect(() => {
    if (!selected) {
      setDetailsDraft('')
      return
    }
    setDetailsDraft(selected.details || '')
  }, [selected])

  function chooseCamera(stage: PhotoStage) {
    setUploadStage(stage)
    cameraInputRef.current?.click()
  }

  function chooseLibrary(stage: PhotoStage) {
    setUploadStage(stage)
    libraryInputRef.current?.click()
  }

  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const stageSlug = STAGE_SLUGS[uploadStage]
        const filePath = `jobs/${jobId}/${stageSlug}/${Date.now()}_${safeName}`

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

        const { data } = supabase.storage.from('customer-images').getPublicUrl(filePath)

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
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (libraryInputRef.current) libraryInputRef.current.value = ''
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
        <div className="space-y-4">
          {PHOTO_STAGES.map((stage) => {
            const stageImages = images.filter((image) => getPhotoStage(image) === stage)

            return (
              <section key={stage} className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">{stage}</span>

                  <div className="flex gap-2">
                    <button onClick={() => chooseCamera(stage)} className="h-11 w-11 rounded-full bg-red-600 flex items-center justify-center">
                      <CameraIcon />
                    </button>

                    <button onClick={() => chooseLibrary(stage)} className="h-10 w-10 rounded-xl border border-slate-600 text-white">
                      ⋯
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  {stageImages.map((image) => (
                    <div key={image.id} className="rounded-xl overflow-hidden border border-slate-800">
                      <img src={image.image_url} className="w-full h-40 object-cover" />

                      <div className="flex gap-2 p-2">
                        <button onClick={() => setSelected(image)} className="flex-1 border rounded-xl py-1 text-white">
                          View
                        </button>

                        <button
                          onClick={() => handleDelete(image)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-600"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleAddPhotos} className="hidden" />
        <input ref={libraryInputRef} type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" />
      </div>
    </div>
  )
}
