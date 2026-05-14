import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Job = {
  id: string
  customer_id: string
  title?: string | null
  status?: string | null
  date_in?: string | null
  created_at?: string | null
  description?: string | null
  diagnosis?: string | null
  treatment?: string | null
}

type CustomerRecord = {
  id: string
  full_name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}

type Customer = CustomerRecord & {
  jobs: Job[]
  directMatch: boolean
}

type Appointment = {
  id: string
  customer_name?: string | null
  phone?: string | null
  appointment_type?: string | null
  appointment_date?: string | null
  appointment_time?: string | null
  drone?: string | null
  notes?: string | null
}

type SearchResults = {
  customers: Customer[]
  appointments: Appointment[]
}

type SearchPlan = {
  terms: string[]
  usedOpenAI: boolean
  error?: string
}

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'all',
  'and',
  'any',
  'are',
  'can',
  'customer',
  'customers',
  'did',
  'does',
  'drone',
  'drones',
  'find',
  'for',
  'from',
  'get',
  'give',
  'greg',
  'has',
  'have',
  'how',
  'info',
  'information',
  'is',
  'job',
  'jobs',
  'look',
  'me',
  'need',
  'needs',
  'show',
  'that',
  'the',
  'their',
  'them',
  'there',
  'this',
  'to',
  'up',
  'was',
  'what',
  'when',
  'where',
  'which',
  'who',
  'with',
])

function cleanSearch(value: string) {
  return value.replace(/[%_,]/g, '').trim().slice(0, 120)
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits
}

function formatPhone(value?: string | null) {
  const digits = normalizePhone(value || '').slice(0, 10)
  if (!digits) return ''
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function jobAge(job: Job) {
  const source = job.date_in || job.created_at
  if (!source) return null
  const start = new Date(source)
  if (Number.isNaN(start.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function statusClass(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'urgent':
      return 'border-red-500/30 bg-red-500/15 text-red-300'
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    case 'picked up':
      return 'border-slate-600 bg-slate-700 text-slate-200'
    default:
      return 'border-amber-500/30 bg-amber-500/15 text-amber-300'
  }
}

function uniqueTerms(values: string[]) {
  const seen = new Set<string>()
  const terms: string[] = []

  for (const value of values) {
    const term = cleanSearch(value)
    const key = term.toLowerCase()
    if (term.length >= 2 && !seen.has(key)) {
      seen.add(key)
      terms.push(term)
    }
  }

  return terms.slice(0, 8)
}

function fallbackSearchTerms(question: string) {
  const compactQuestion = cleanSearch(question)
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9@.+\-\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))

  const digitTerm = normalizePhone(question)

  return uniqueTerms([
    compactQuestion.length <= 48 ? compactQuestion : '',
    digitTerm.length >= 4 ? digitTerm : '',
    ...words,
  ])
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text

  const parts: string[] = []
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text)
      }
    }
  }

  return parts.join('\n').trim()
}

async function askOpenAI(instructions: string, input: string, maxOutputTokens = 500) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI is not connected yet. Add OPENAI_API_KEY to this Vercel environment.')
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed with status ${response.status}`)
  }

  const text = extractResponseText(payload)
  if (!text) throw new Error('OpenAI returned an empty answer.')

  return text
}

function parseJsonObject(text: string) {
  const trimmed = text.trim()
  const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) return null

  try {
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

async function buildSearchPlan(question: string): Promise<SearchPlan> {
  const fallback = fallbackSearchTerms(question)

  try {
    const text = await askOpenAI(
      'You convert a Cardinal Drones CRM question into database search terms. Return only JSON in this shape: {"search_terms":["term"]}. Include names, phone digits, drone models, statuses, dates, and important repair words. Keep terms short and useful for text search. Do not answer the question.',
      `Question: ${question}`,
      180
    )

    const parsed = parseJsonObject(text)
    const aiTerms = Array.isArray(parsed?.search_terms) ? parsed.search_terms.map(String) : []

    return {
      terms: uniqueTerms([...aiTerms, ...fallback]),
      usedOpenAI: true,
    }
  } catch (error) {
    return {
      terms: fallback,
      usedOpenAI: false,
      error: error instanceof Error ? error.message : 'OpenAI search planning failed.',
    }
  }
}

async function searchCustomersJobsAndAppointments(terms: string[]): Promise<SearchResults> {
  if (!terms.length) return { customers: [], appointments: [] }

  const supabase = await createClient()
  const customerMap = new Map<string, CustomerRecord>()
  const directCustomerIds = new Set<string>()
  const jobMap = new Map<string, Job>()
  const jobCustomerIds = new Set<string>()
  const appointmentMap = new Map<string, Appointment>()

  for (const term of terms) {
    const variants = uniqueTerms([term, normalizePhone(term).length >= 4 ? normalizePhone(term) : ''])

    for (const variant of variants) {
      const { data: matchedCustomers } = await supabase
        .from('customers')
        .select('*')
        .or(`full_name.ilike.%${variant}%,phone.ilike.%${variant}%,email.ilike.%${variant}%,notes.ilike.%${variant}%`)
        .limit(20)

      for (const customer of matchedCustomers || []) {
        customerMap.set(customer.id, customer)
        directCustomerIds.add(customer.id)
      }

      const { data: matchedJobsByText } = await supabase
        .from('service_jobs')
        .select('*')
        .or(`title.ilike.%${variant}%,description.ilike.%${variant}%,diagnosis.ilike.%${variant}%,treatment.ilike.%${variant}%,status.ilike.%${variant}%`)
        .limit(50)

      for (const job of matchedJobsByText || []) {
        jobMap.set(job.id, job)
        if (job.customer_id) jobCustomerIds.add(job.customer_id)
      }

      const { data: matchedAppointments } = await supabase
        .from('appointments')
        .select('*')
        .or(`customer_name.ilike.%${variant}%,phone.ilike.%${variant}%,appointment_type.ilike.%${variant}%,drone.ilike.%${variant}%,notes.ilike.%${variant}%`)
        .limit(30)

      for (const appointment of matchedAppointments || []) {
        appointmentMap.set(appointment.id, appointment)
      }
    }
  }

  const allCustomerIds = Array.from(new Set([...directCustomerIds, ...jobCustomerIds]))

  if (allCustomerIds.length) {
    const { data: relatedCustomers } = await supabase
      .from('customers')
      .select('*')
      .in('id', allCustomerIds)

    for (const customer of relatedCustomers || []) {
      customerMap.set(customer.id, customer)
    }
  }

  if (directCustomerIds.size) {
    const { data: allJobsForDirectCustomers } = await supabase
      .from('service_jobs')
      .select('*')
      .in('customer_id', Array.from(directCustomerIds))

    for (const job of allJobsForDirectCustomers || []) {
      jobMap.set(job.id, job)
    }
  }

  const jobsByCustomer = new Map<string, Job[]>()
  for (const job of jobMap.values()) {
    const list = jobsByCustomer.get(job.customer_id) || []
    list.push(job)
    jobsByCustomer.set(job.customer_id, list)
  }

  const customers = allCustomerIds
    .map((id) => customerMap.get(id))
    .filter((customer): customer is CustomerRecord => Boolean(customer))
    .map((customer) => ({
      ...customer,
      jobs: (jobsByCustomer.get(customer.id) || []).sort((a, b) => {
        const aDate = new Date(a.date_in || a.created_at || 0).getTime()
        const bDate = new Date(b.date_in || b.created_at || 0).getTime()
        return bDate - aDate
      }),
      directMatch: directCustomerIds.has(customer.id),
    }))

  return {
    customers,
    appointments: Array.from(appointmentMap.values()),
  }
}

function buildOpenAIContext(results: SearchResults, terms: string[]) {
  return {
    search_terms: terms,
    customers: results.customers.slice(0, 25).map((customer) => ({
      name: customer.full_name,
      phone: formatPhone(customer.phone),
      email: customer.email,
      notes: customer.notes,
      jobs: customer.jobs.slice(0, 10).map((job) => ({
        title: job.title,
        status: job.status,
        date_in: job.date_in,
        created_at: job.created_at,
        description: job.description,
        diagnosis: job.diagnosis,
        treatment: job.treatment,
      })),
    })),
    appointments: results.appointments.slice(0, 25).map((appointment) => ({
      customer_name: appointment.customer_name,
      phone: formatPhone(appointment.phone),
      type: appointment.appointment_type,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      drone: appointment.drone,
      notes: appointment.notes,
    })),
  }
}

async function answerQuestion(question: string, results: SearchResults, plan: SearchPlan) {
  try {
    const context = buildOpenAIContext(results, plan.terms)
    return await askOpenAI(
      'You are the Cardinal Drones CRM assistant for Greg. Answer using only the CRM_CONTEXT provided. Be concise and practical. Include names, phone numbers, job status, dates, appointment details, and notes when they help. If the context does not contain the answer, say what was not found and suggest a more specific search. Never invent customer, job, appointment, or invoice details. This is read-only.',
      `Greg asked:\n${question}\n\nCRM_CONTEXT:\n${JSON.stringify(context, null, 2)}`,
      700
    )
  } catch (error) {
    return plan.error || (error instanceof Error ? error.message : 'OpenAI could not answer this question.')
  }
}

export default async function AiSearchTestPage({ searchParams }: { searchParams?: { prompt?: string } }) {
  const rawPrompt = searchParams?.prompt || ''
  const question = rawPrompt.trim()
  const plan = question ? await buildSearchPlan(question) : { terms: [], usedOpenAI: false }
  const results = question ? await searchCustomersJobsAndAppointments(plan.terms) : { customers: [], appointments: [] }
  const aiAnswer = question ? await answerQuestion(question, results, plan) : ''
  const resultCount =
    results.customers.reduce((count, customer) => count + Math.max(customer.jobs.length, 1), 0) +
    results.appointments.length

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
              defaultValue={rawPrompt}
              placeholder="Ask about customers, jobs, invoices, or notes..."
              className="mb-3 h-14 w-full rounded-xl bg-[#030712] px-4 text-base text-white placeholder:text-slate-500"
            />

            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-red-600 text-lg font-semibold text-white"
            >
              Ask
            </button>
          </div>
        </form>

        {question && (
          <section className="space-y-4">
            <article className="rounded-2xl border border-red-900/50 bg-[#14090d] px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">AI Answer</h2>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400">
                  {plan.usedOpenAI ? 'OpenAI' : 'Fallback'}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-base leading-7 text-white">{aiAnswer}</p>
              {plan.terms.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">Searched: {plan.terms.join(', ')}</p>
              )}
            </article>

            <p className="text-sm text-slate-400">
              {resultCount
                ? `${resultCount} read-only CRM result${resultCount === 1 ? '' : 's'} found`
                : 'No read-only CRM records matched the search terms.'}
            </p>

            {results.customers.map((customer) => {
              const rows = customer.jobs.length ? customer.jobs : [null]
              return rows.map((job) => {
                const days = job ? jobAge(job) : null
                return (
                  <article key={job?.id || customer.id} className="rounded-2xl border border-slate-800 bg-[#0b1220] px-5 py-4">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-bold text-white">{customer.full_name || 'Unnamed Customer'}</h2>
                        <p className="text-sm text-slate-400">{formatPhone(customer.phone) || customer.email || 'No phone or email'}</p>
                        <p className="mt-2 text-sm text-slate-300">{job?.title || 'No repair entered yet'}</p>
                        {job?.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{job.description}</p>}
                        {!job && customer.notes && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{customer.notes}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {job?.status && (
                          <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(job.status)}`}>
                            {job.status}
                          </span>
                        )}
                        {days !== null && <span className="rounded bg-slate-700 px-2 py-1 text-xs">{days}d</span>}
                      </div>
                    </div>
                  </article>
                )
              })
            })}

            {results.appointments.map((appointment) => (
              <article key={appointment.id} className="rounded-2xl border border-slate-800 bg-[#0b1220] px-5 py-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{appointment.customer_name || 'Unnamed Appointment'}</h2>
                    <p className="text-sm text-slate-400">{formatPhone(appointment.phone) || 'No phone'}</p>
                    <p className="mt-2 text-sm text-slate-300">{appointment.appointment_type || 'Appointment'}: {appointment.drone || 'No drone listed'}</p>
                    {appointment.notes && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{appointment.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-400">
                    <div>{appointment.appointment_date || 'No date'}</div>
                    <div>{appointment.appointment_time || ''}</div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
