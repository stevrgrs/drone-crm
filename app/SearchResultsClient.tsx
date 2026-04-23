'use client'

import Link from 'next/link'

type Job = {
  id: string
  customer_id: string
  title?: string | null
  status?: string | null
  date_in?: string | null
  created_at?: string | null
}

type CustomerCard = {
  id: string
  full_name?: string | null
  phone?: string | null
  jobs: Job[]
}

type SearchRow = {
  c: CustomerCard
  j: Job | null
}

function getDaysInShop(job: Job) {
  const source = job.date_in || job.created_at || null
  if (!source) return null
  const start = new Date(source)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function getStatusBadgeClass(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'urgent':
      return 'bg-red-500/15 text-red-300 border border-red-500/30'
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
    case 'picked up':
      return 'bg-slate-700 text-slate-200 border border-slate-600'
    default:
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
  }
}

export default function SearchResultsClient({ initialCards }: { initialCards: CustomerCard[] }) {
  const rows: SearchRow[] = initialCards.flatMap((c): SearchRow[] =>
    c.jobs.length ? c.jobs.map((j): SearchRow => ({ c, j })) : [{ c, j: null }]
  )

  return (
    <div className="space-y-4">
      {rows.map(({ c, j }) => {
        const days = j ? getDaysInShop(j) : null

        return (
          <Link
            key={j?.id || c.id}
            href={`/customers/${c.id}`}
            className="block rounded-2xl border border-slate-800 bg-[#0b1220] px-5 py-4 hover:bg-[#10192b]"
          >
            <div className="flex justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-xl font-bold text-white">{c.full_name || 'Unnamed Customer'}</div>
                <div className="text-sm text-slate-400">{c.phone || 'No phone number'}</div>
                <div className="text-sm text-slate-300">{j?.title || 'No repair entered yet'}</div>
              </div>
              <div className="flex items-center gap-2">
                {j?.status && (
                  <span className={`rounded-full px-2 py-1 text-xs ${getStatusBadgeClass(j.status)}`}>
                    {j.status}
                  </span>
                )}
                {days !== null && <span className="rounded bg-slate-700 px-2 py-1 text-xs">{days}d</span>}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
