import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">

        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-bold">Cardinal Drones CRM</h1>
          <p className="mt-3 text-slate-600">
            Manage customers, repairs, and job photos quickly from any device.
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/customers"
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Open Customers
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">Customers</h3>
            <p className="text-sm text-slate-600 mt-1">Store contact info and notes</p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">Jobs</h3>
            <p className="text-sm text-slate-600 mt-1">Track repairs and pricing</p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">Photos</h3>
            <p className="text-sm text-slate-600 mt-1">Attach evidence to jobs</p>
          </div>
        </div>

      </div>
    </main>
  )
}
