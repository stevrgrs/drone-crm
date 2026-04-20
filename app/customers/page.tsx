import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main style={{ padding: 20 }}>
      <h1>Customers</h1>

      <table style={{ width: '100%', marginTop: 20 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Phone</th>
            <th style={{ textAlign: 'left' }}>Email</th>
            <th style={{ textAlign: 'left' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((c: any) => (
            <tr key={c.id}>
              <td>
                <Link href={`/customers/${c.id}`}>{c.full_name}</Link>
              </td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td>{c.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}