import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <h1>Drone CRM</h1>

      <div style={{ marginTop: 20 }}>
        <Link href="/customers">Go to Customers</Link>
      </div>
    </main>
  )
}