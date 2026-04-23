import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        full_name: '',
        phone: '',
        email: '',
        notes: '',
      },
    ])
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data })
}
