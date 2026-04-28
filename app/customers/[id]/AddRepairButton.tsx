'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function AddRepairButton({ customerId }: { customerId: string }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [saving, setSaving] = useState(false)

  async function handleAddRepair() {
    if (saving) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .insert([
          {
            customer_id: customerId,
            title: 'New Repair',
            status: 'in progress',
            date_in: new Date().toISOString().split('T')[0],
          },
        ])
        .select('id')
        .single()

      if (error) {
        alert(error.message)
        return
      }

      router.push(`/jobs/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleAddRepair}
      disabled={saving}
      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
    >
      {saving ? 'Adding...' : '+ Add Repair'}
    </button>
  )
}
