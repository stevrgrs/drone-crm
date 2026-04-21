import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-sm text-slate-500">
              Manage and view all customer records
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-100"
          >
            Back
          </Link>
        </div>

        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {data?.length ? (
                data.map((c: any) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.full_name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3">{c.email}</td>

                    <td className="p-3 flex gap-2">
                      <Link
                        href={`/customers/${c.id}`}
                        className="bg-sky-600 text-white px-3 py-1 rounded-md text-xs hover:bg-sky-700"
                      >
                        Open
                      </Link>

                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="border px-3 py-1 rounded-md text-xs hover:bg-slate-100"
                        >
                          Call
                        </a>
                      )}

                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="border px-3 py-1 rounded-md text-xs hover:bg-slate-100"
                        >
                          Email
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No customers yet
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
