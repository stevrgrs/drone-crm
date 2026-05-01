import HistoryNav from '@/app/components/HistoryNav'

export default function AppointmentsPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <HistoryNav />

        <div>
          <h1 className="text-3xl font-bold text-white">Pickups / Dropoffs</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter upcoming customer pickup or dropoff appointments.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#09111f] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Customer Name</label>
              <input className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="Customer name" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</label>
              <input type="tel" inputMode="tel" className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="(561) 555-5555" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Appointment Type</label>
              <select className="w-full rounded-xl bg-[#030712] p-3 text-white">
                <option>Dropoff</option>
                <option>Pickup</option>
                <option>Estimate / Check</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Date</label>
              <input type="date" className="w-full rounded-xl bg-[#030712] p-3 text-white" style={{ colorScheme: 'dark' }} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Time</label>
              <input type="time" className="w-full rounded-xl bg-[#030712] p-3 text-white" style={{ colorScheme: 'dark' }} />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Drone / Item</label>
              <input className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="DJI Phantom 3" />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</label>
              <textarea rows={5} className="w-full rounded-xl bg-[#030712] p-3 text-white" placeholder="What are they bringing in? What needs to be checked?" />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">
              Save Appointment
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
