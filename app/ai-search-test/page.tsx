import VoicePromptForm from './VoicePromptForm'
import { searchCrm, type CustomerCard, type JobCard } from '@/lib/crm/search'

export const dynamic = 'force-dynamic'

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
  customers: CustomerCard[]
  appointments: Appointment[]
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

function jobAge(job: JobCard) {
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

function cleanAnswerText(value: string) {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*\*\s+/gm, '- ')
    .trim()
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
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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

function buildOpenAIContext(results: SearchResults) {
  return {
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

function fallbackAnswer(question: string, results: SearchResults) {
  const lines: string[] = []

  if (!results.customers.length && !results.appointments.length) {
    return 'I did not find matching CRM records for that search.'
  }

  lines.push('Matching CRM records:')

  for (const customer of results.customers) {
    if (!customer.jobs.length) {
      lines.push('', customer.full_name || 'Unnamed Customer')
      if (customer.phone) lines.push(formatPhone(customer.phone))
      if (customer.notes) lines.push(`Notes: ${customer.notes}`)
      continue
    }

    for (const job of customer.jobs) {
      lines.push('', customer.full_name || 'Unnamed Customer')
      lines.push(job.title || 'No repair title')
      if (job.status) lines.push(`Status: ${job.status}`)
      if (job.date_in) lines.push(`Date in: ${job.date_in}`)
      if (job.description) lines.push(`Notes: ${job.description}`)
    }
  }

  for (const appointment of results.appointments) {
    lines.push('', appointment.customer_name || 'Unnamed Appointment')
    lines.push(`${appointment.appointment_type || 'Appointment'}: ${appointment.drone || 'No drone listed'}`)
    if (appointment.appointment_date) lines.push(`Date: ${appointment.appointment_date}`)
    if (appointment.appointment_time) lines.push(`Time: ${appointment.appointment_time}`)
    if (appointment.notes) lines.push(`Notes: ${appointment.notes}`)
  }

  return lines.join('\n')
}

async function answerQuestion(question: string, results: SearchResults) {
  try {
    const context = buildOpenAIContext(results)
    const answer = await askOpenAI(
      'You are the Cardinal Drones CRM assistant for Greg. Answer using only the CRM_CONTEXT provided. The CRM_CONTEXT has already been filtered by the database. Do not add records that are not in the context. Be concise and practical. Use plain text only. Include names, phone numbers, job status, dates, appointment details, and notes when they help. If the context is empty, say no matching CRM records were found. Never invent customer, job, appointment, or invoice details. This is read-only.',
      `Greg asked:\n${question}\n\nCRM_CONTEXT:\n${JSON.stringify(context, null, 2)}`,
      700
    )

    return { text: cleanAnswerText(answer), usedOpenAI: true }
  } catch {
    return { text: cleanAnswerText(fallbackAnswer(question, results)), usedOpenAI: false }
  }
}

export default async function AiSearchTestPage({ searchParams }: { searchParams?: { prompt?: string; debug?: string } }) {
  const rawPrompt = searchParams?.prompt || ''
  const question = rawPrompt.trim()
  const showDebug = searchParams?.debug === '1'
  const crmSearch = question ? await searchCrm(question, { timeZone: 'America/New_York' }) : null
  const results: SearchResults = {
    customers: crmSearch?.cards || [],
    appointments: [],
  }
  const answer = question ? await answerQuestion(question, results) : { text: '', usedOpenAI: false }
  const resultCount = results.customers.reduce((count, customer) => count + Math.max(customer.jobs.length, 1), 0)

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <img src="/CDlogo.png" alt="Cardinal Drones CRM" className="w-full max-w-xs" />
        </div>

        <VoicePromptForm defaultValue={rawPrompt} />

        {question && (
          <section className="space-y-4">
            <article className="rounded-2xl border border-red-900/50 bg-[#14090d] px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">AI Answer</h2>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400">
                  {answer.usedOpenAI ? 'OpenAI' : 'Fallback'}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-base leading-7 text-white">{answer.text}</p>
              {crmSearch?.debug && (
                <p className="mt-3 text-xs text-slate-500">
                  Search plan: {crmSearch.debug.jobMatches} jobs, {crmSearch.debug.customerMatches} customers
                </p>
              )}
            </article>

            {showDebug && crmSearch?.debug && (
              <details className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 text-xs text-slate-300">
                <summary className="cursor-pointer text-sm font-semibold text-white">Search debug</summary>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(crmSearch.debug, null, 2)}
                </pre>
              </details>
            )}

            <p className="text-sm text-slate-400">
              {resultCount
                ? `${resultCount} read-only CRM result${resultCount === 1 ? '' : 's'} found`
                : 'No read-only CRM records matched the search.'}
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
          </section>
        )}
      </div>
    </main>
  )
}
