import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
              CRM
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Customers
            </h1>
          </div>

          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back Home
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Notes
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data?.length ? (
                data.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-semibold text-sky-700 hover:text-sky-800 hover:underline"
                      >
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{c.phone}</td>
                    <td className="px-4 py-4 text-slate-700">{c.email}</td>
                    <td className="px-4 py-4 text-slate-600">{c.notes}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No customers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}