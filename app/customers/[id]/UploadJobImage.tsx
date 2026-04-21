'use client'

type UploadJobImageProps = {
  jobId: string
}

export default function UploadJobImage({ jobId }: UploadJobImageProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-700">Image upload placeholder</p>
      <p className="mt-1 text-sm text-slate-500">
        Upload UI for job <span className="font-mono">{jobId}</span> will go here.
      </p>
    </div>
  )
}
