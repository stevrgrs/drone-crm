'use client'

import { useRouter } from 'next/navigation'

export default function HistoryNav() {
  const router = useRouter()

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => router.back()}
        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
      >
        ← Back
      </button>
    </div>
  )
}
