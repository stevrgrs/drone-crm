import Link from 'next/link'
import HistoryNav from '@/app/components/HistoryNav'
import { createClient } from '@/lib/supabase/server'

export default async function AppointmentsPage() {
  const supabase = await createClient()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .order('appointment_date', { ascending: true })

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <HistoryNav />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Pickups / Dropoffs</h1>
            <p className="mt-2 text-sm text-slate-400">Upcoming appointments</p>
          </div>

          <Link
            href="/appointments/new"
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add
          </Link>
        </div>

        <div className="space-y-2">
          {(appointments || []).length ? (
            appointments.map((appt) => (
              <div key={appt.id} className="rounded-xl border border-slate-800 bg-[#0b1220] p-3">
                <div className="font-semibold text-white">{appt.customer_name}</div>
                <div className="text-sm text-slate-400">{appt.phone || 'No phone'}</div>
                <div className="text-sm text-slate-300">{appt.drone || ''}</div>
                <div className="text-sm text-slate-400">
                  {appt.appointment_date} @ {appt.appointment_time}
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-400">No appointments yet</div>
          )}
        </div>
      </div>
    </main>
  )
}
