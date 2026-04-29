'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

type PhotoStage = 'Before' | 'In Progress' | 'After'

type JobImage = {
  id: string
  image_url: string
  details?: string | null
  caption?: string | null
}

const PHOTO_STAGES: PhotoStage[] = ['Before', 'In Progress', 'After']

function getStoragePathFromPublicUrl(url: string) {
  const marker = '/storage/v1/object/public/customer-images/'
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}

function getPhotoStage(image: JobImage): PhotoStage {
  if (image.caption === 'Before' || image.caption === 'In Progress' || image.caption === 'After') {
    return image.caption
  }
  return 'In Progress'
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-white">
      <path d="M9 4c-.6 0-1.1.3-1.4.8L6.7 6H5c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-1.7l-.9-1.2c-.3-.5-.8-.8-1.4-.8H9zm3 4.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" />
      <circle cx="12" cy="13" r="2.5" fill="#dc2626" />
    </svg>
  )
}

export default function PhotosManager({
  jobId,
  images,
}: {
  jobId: string
  images: JobImage[]
}) {
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
          .insert([{ job_id: jobId, image_url: data.publicUrl, caption: uploadStage }])

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

  async function handleChangeStage(image: JobImage, nextStage: PhotoStage) {
    const { error } = await supabase
      .from('job_images')
      .update({ caption: nextStage })
      .eq('id', image.id)

    if (error) {
      alert(error.message)
      return
    }

    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Photos</h2>
            <p className="mt-2 text-sm text-slate-400">
              Add photos as Before, In Progress, or After shots so the repair record stays organized.
            </p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
            {images.length} image{images.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-4">
          {PHOTO_STAGES.map((stage) => {
            const stageImages = images.filter((image) => getPhotoStage(image) === stage)
            const isOpen = openStages[stage]

            return (
              <section key={stage} className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenStages((current) => ({ ...current, [stage]: !current[stage] }))}
                    className="min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">{stage}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {stageImages.length}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{isOpen ? 'Tap to collapse' : 'Tap to expand'}</div>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => chooseCamera(stage)}
                      disabled={uploading}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-600 shadow-md hover:bg-red-700 disabled:opacity-60"
                      aria-label={`Take ${stage} photo`}
                      title={`Take ${stage} photo`}
                    >
                      <CameraIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => chooseLibrary(stage)}
                      disabled={uploading}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 text-lg text-white hover:bg-slate-900 disabled:opacity-60"
                      aria-label={`Choose ${stage} photo`}
                      title={`Choose ${stage} photo`}
                    >
                      ⋯
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4">
                    {stageImages.length ? (
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {stageImages.map((image) => (
                          <div key={image.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-[#09111f]">
                            <button type="button" onClick={() => setSelected(image)} className="block w-full">
                              <img src={image.image_url} alt={`${stage} repair photo`} className="h-44 w-full object-cover" />
                            </button>
                            <div className="space-y-2 p-3">
                              <select
                                value={getPhotoStage(image)}
                                onChange={(e) => handleChangeStage(image, e.target.value as PhotoStage)}
                                className="w-full rounded-xl border border-slate-700 bg-[#030712] px-3 py-2 text-sm text-white"
                              >
                                {PHOTO_STAGES.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setSelected(image)} className="flex-1 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900">
                                  View
                                </button>
                                <button type="button" onClick={() => handleDelete(image)} disabled={deletingId === image.id} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                                  {deletingId === image.id ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-[#09111f] p-4 text-sm text-slate-400">
                        No {stage.toLowerCase()} photos yet.
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleAddPhotos} className="hidden" />
        <input ref={libraryInputRef} type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" />
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 p-4">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center py-8">
            <div className="w-full rounded-2xl border border-slate-800 bg-[#09111f] p-4 shadow-2xl shadow-black/40">
              <div className="flex justify-end">
                <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">
                  Close
                </button>
              </div>

              <img src={selected.image_url} alt="Enlarged repair photo" className="mx-auto mt-2 max-h-[70vh] max-w-full rounded-xl" />

              <div className="mt-4 rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
                <div className="mb-3 text-sm text-slate-400">Stage: {getPhotoStage(selected)}</div>
                <label className="block text-sm font-medium text-white">Caption / Details</label>
                <textarea
                  value={detailsDraft}
                  onChange={(e) => setDetailsDraft(e.target.value)}
                  rows={4}
                  placeholder="Add notes about what this photo shows..."
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-[#030712] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-red-500"
                />
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={handleSaveDetails} disabled={savingDetails} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
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
