import Link from 'next/link'
import CrmDemoClient from './CrmDemoClient'

const crmLinks = [
  { href: '/customers/new', label: '+ Add Customer' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/completed', label: 'Completed List' },
  { href: '/appointments', label: 'Pickups / Dropoffs' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-center">
          <img src="/CDlogo.png" alt="Cardinal Drones CRM" className="w-full max-w-xs" />
        </div>

        <CrmDemoClient />

        <nav className="mt-6 grid gap-3 sm:grid-cols-2">
          {crmLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex h-12 items-center justify-center rounded-2xl border border-slate-700 bg-[#0b1220] px-4 text-sm font-semibold text-slate-100 hover:border-red-500 hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          <a
            href="/api/export-backup"
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-700 bg-[#0b1220] px-4 text-sm font-semibold text-slate-100 hover:border-red-500 hover:text-white sm:col-span-2"
          >
            Export Backup
          </a>
        </nav>
      </div>
    </main>
  )
}
