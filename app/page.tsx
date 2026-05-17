import Link from 'next/link'
import { searchCrm } from '@/lib/crm/search'
import SearchResultsClient from './SearchResultsClient'

export default async function Home({ searchParams }: { searchParams?: { q?: string; debug?: string } }) {
  const query = (searchParams?.q || '').trim()
  const showDebug = searchParams?.debug === '1'

  const searchResult = query
    ? await searchCrm(query, { timeZone: 'America/New_York' })
    : null

  const customerCards = searchResult?.cards || []
  const debug = searchResult?.debug || null

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-md">

        <div className="mb-6 flex justify-center">
          <img src="/CDlogo.png" alt="Cardinal Drones CRM" className="w-full max-w-xs" />
        </div>

        <form method="GET" className="mb-5">
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search..."
              className="mb-3 h-14 w-full rounded-xl bg-[#030712] px-4 text-base text-white placeholder:text-slate-500"
            />

            {showDebug && <input type="hidden" name="debug" value="1" />}

            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-red-600 text-lg font-semibold text-white"
            >
              Search
            </button>
          </div>
        </form>

        {query && (
          <div className="mb-6">
            <SearchResultsClient initialCards={customerCards} />
          </div>
        )}

        {query && showDebug && debug && (
          <details className="mb-6 rounded-2xl border border-slate-800 bg-[#0b1220] p-4 text-xs text-slate-300">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Search debug
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </details>
        )}

        <div className="mb-6 flex flex-col gap-3">
          <Link
            href="/customers/new"
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-600 text-white"
          >
            + Add Customer
          </Link>

          <Link
            href="/invoices"
            className="flex h-14 items-center justify-center rounded-2xl border border-red-600 bg-[#0b1220] text-red-400"
          >
            Invoices
          </Link>

          <Link
            href="/completed"
            className="flex h-14 items-center justify-center rounded-2xl border border-red-600 text-red-400"
          >
            Show Completed List
          </Link>

          <Link
            href="/appointments"
            className="flex h-14 items-center justify-center rounded-2xl border border-red-600 text-red-400"
          >
            Pickups / Dropoffs
          </Link>

          <a
            href="/api/export-backup"
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-600 text-white"
          >
            Export Backup
          </a>
        </div>
      </div>
    </main>
  )
}
