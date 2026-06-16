import Link from 'next/link'
import { searchCrm } from '@/lib/crm/search'
import SearchResultsClient from './SearchResultsClient'

const exampleQueries = [
  'Which customers still have drones to be done?',
  'Show drones that came in today',
  'Completed jobs still waiting for pickup',
  'All entries from last week',
]

function buildSearchHref(example: string, showDebug: boolean) {
  const params = new URLSearchParams({ q: example })
  if (showDebug) params.set('debug', '1')
  return `/?${params.toString()}`
}

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

        <section className="mb-5 rounded-3xl border border-red-900/50 bg-[#0b1220] p-4 shadow-2xl shadow-red-950/20">
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
              AI CRM Search
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Ask the shop database
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Type normal questions about customers, drones, dates, repair status, pickups, or job notes.
            </p>
          </div>

          <form method="GET">
            <label htmlFor="crm-ai-search" className="sr-only">
              AI CRM Search
            </label>
            <textarea
              id="crm-ai-search"
              name="q"
              defaultValue={query}
              rows={3}
              placeholder="Example: Which customers still have drones to be done?"
              className="mb-3 w-full resize-none rounded-2xl border border-slate-700 bg-[#030712] px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-red-500"
            />

            {showDebug && <input type="hidden" name="debug" value="1" />}

            <button
              type="submit"
              className="h-14 w-full rounded-2xl bg-red-600 text-lg font-semibold text-white hover:bg-red-500"
            >
              Ask AI Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {exampleQueries.map((example) => (
              <Link
                key={example}
                href={buildSearchHref(example, showDebug)}
                className="rounded-full border border-slate-700 bg-black/30 px-3 py-2 text-xs text-slate-300 hover:border-red-500 hover:text-white"
              >
                {example}
              </Link>
            ))}
          </div>
        </section>

        {query && (
          <div className="mb-3 rounded-2xl border border-slate-800 bg-[#050914] px-4 py-3 text-sm text-slate-300">
            <span className="text-slate-500">Showing results for:</span>{' '}
            <span className="font-semibold text-white">{query}</span>
          </div>
        )}

        {query && (
          <div className="mb-6">
            {customerCards.length > 0 ? (
              <SearchResultsClient initialCards={customerCards} />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5 text-sm text-slate-300">
                No matching customers or jobs found. Try a name, phone number, drone model, repair issue, or a date phrase like “came in today.”
              </div>
            )}
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
