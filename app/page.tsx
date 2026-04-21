import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Cardinal Drones
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            Drone CRM
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Track customers, repair jobs, notes, and photo evidence from your
            phone or computer.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/customers"
              className="inline-flex items-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Open Customers
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}