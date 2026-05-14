export default function AiSearchTestPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <img src="/CDlogo.png" alt="Cardinal Drones CRM" className="w-full max-w-xs" />
        </div>

        <form className="mb-5">
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
            <input
              type="text"
              name="prompt"
              placeholder="Ask about customers, jobs, invoices, or notes..."
              className="mb-3 h-14 w-full rounded-xl bg-[#030712] px-4 text-base text-white placeholder:text-slate-500"
            />

            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-red-600 text-lg font-semibold text-white"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
