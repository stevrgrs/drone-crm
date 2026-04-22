'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

const STATUS_OPTIONS = ['urgent','in progress','completed','picked up']

export default function SearchResultsClient({ initialCards }: any) {
  const supabase = useMemo(() => createClient(), [])
  const [cards, setCards] = useState(initialCards)

  async function updateCustomer(id:any, patch:any){
    await supabase.from('customers').update(patch).eq('id',id)
    setCards(c=>c.map((x:any)=>x.id===id?{...x,...patch}:x))
  }

  async function updateJob(id:any, patch:any){
    await supabase.from('service_jobs').update(patch).eq('id',id)
    setCards(c=>c.map((card:any)=>({...card,jobs:card.jobs.map((j:any)=>j.id===id?{...j,...patch}:j)})))
  }

  async function addRepair(customerId:any){
    const today = new Date().toISOString().split('T')[0]
    const {data} = await supabase.from('service_jobs').insert([{
      customer_id:customerId,
      title:'New Repair',
      status:'in progress',
      date_in:today
    }]).select('*').single()

    setCards(c=>c.map((x:any)=>x.id===customerId?{...x,jobs:[data,...x.jobs]}:x))
  }

  async function deleteRepair(id:any){
    if(!confirm('Delete this repair?')) return
    await supabase.from('service_jobs').delete().eq('id',id)
    setCards(c=>c.map((card:any)=>({...card,jobs:card.jobs.filter((j:any)=>j.id!==id)})))
  }

  async function deleteCustomer(id:any){
    if(!confirm('Delete this customer and ALL data?')) return
    await supabase.from('service_jobs').delete().eq('customer_id',id)
    await supabase.from('customers').delete().eq('id',id)
    setCards(c=>c.filter((x:any)=>x.id!==id))
  }

  return (
    <div className="space-y-6">
      {cards.map((customer:any)=>(
        <div key={customer.id} className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5">

          <input
            defaultValue={customer.full_name||''}
            onBlur={e=>updateCustomer(customer.id,{full_name:e.target.value})}
            className="text-2xl bg-transparent border-b border-slate-600 w-full"
          />

          <div className="mt-4 flex justify-between items-center">
            <h3>Repairs</h3>
            <button onClick={()=>addRepair(customer.id)} className="bg-red-600 px-3 py-1 rounded">Add Repair</button>
          </div>

          <div className="space-y-3 mt-3">
            {customer.jobs.map((job:any)=>(
              <div key={job.id} className="border p-3 rounded">

                <input
                  defaultValue={job.title||''}
                  onBlur={e=>updateJob(job.id,{title:e.target.value})}
                  className="w-full bg-transparent border-b border-slate-600"
                />

                <select
                  defaultValue={job.status||'in progress'}
                  onChange={e=>updateJob(job.id,{status:e.target.value})}
                  className="mt-2 bg-[#030712] p-2 rounded"
                >
                  {STATUS_OPTIONS.map(s=>(<option key={s}>{s}</option>))}
                </select>

                <input
                  type="date"
                  defaultValue={job.date_in?.split('T')[0]}
                  onChange={e=>updateJob(job.id,{date_in:e.target.value})}
                  className="mt-2 bg-[#030712] p-2 rounded"
                />

                <div className="flex gap-2 mt-2">
                  <Link href={`/jobs/${job.id}/photos`} className="border px-3 py-1 rounded">Photos</Link>
                  <button onClick={()=>deleteRepair(job.id)} className="bg-red-700 px-3 py-1 rounded">Delete</button>
                </div>

              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={()=>deleteCustomer(customer.id)}
              className="bg-red-800 px-4 py-2 rounded"
            >
              Delete Customer
            </button>
          </div>

        </div>
      ))}
    </div>
  )
}
