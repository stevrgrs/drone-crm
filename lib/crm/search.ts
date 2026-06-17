import { createClient } from '@/lib/supabase/server'
import { completeJson, isOpenAIConfigured } from '@/lib/crm/openai'

type CrmSearchFilters = {
  customer_name?: string | null
  phone?: string | null
  job_text?: string | null
  status?: string | null
  created_at_start?: string | null
  created_at_end?: string | null
  date_in_start?: string | null
  date_in_end?: string | null
}

type CrmSearchPlan = {
  intent: 'search_crm'
  filters: CrmSearchFilters
  sort: 'newest' | 'oldest'
}

type AiSearchPlan = {
  intent: 'answer_crm_question'
  summary: string
  search_terms: string[]
  status_terms: string[]
  date_field: 'date_in' | 'created_at' | 'none'
  date_start: string | null
  date_end: string | null
  needs_unfinished_jobs: boolean
  needs_completed_waiting_pickup: boolean
  sort: 'newest' | 'oldest'
}

type AiAnswer = {
  answer: string
  matching_customer_ids: string[]
  matching_job_ids: string[]
}

export type JobCard = {
  id: string
  customer_id: string
  title?: string | null
  description?: string | null
  diagnosis?: string | null
  treatment?: string | null
  status?: string | null
  date_in?: string | null
  created_at?: string | null
  estimate?: number | string | null
  final_price?: number | string | null
}

export type CustomerCard = {
  id: string
  full_name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  jobs: JobCard[]
  directMatch?: boolean
}

export type CrmSearchDebug = {
  rawQuery: string
  source: 'ai' | 'structured'
  plan: CrmSearchPlan | null
  aiPlan?: AiSearchPlan | null
  answer?: string | null
  customerMatches: number
  jobMatches: number
  returnedCards: number
  errors: string[]
}

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, '')
}

function normalizePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

function normalizeDroneText(value: string) {
  return value
    .toLowerCase()
    .replace(/mini\s*3'?s?/g, 'mini 3')
    .replace(/dji\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function formatDateParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  }).formatToParts(date)

  const tz = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT'
  const match = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) return 0

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2] || 0)
  const minutes = Number(match[3] || 0)
  return sign * (hours * 60 + minutes)
}

function zonedDateTimeToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const guessedUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const offset = getOffsetMinutes(guessedUtc, timeZone)
  return new Date(guessedUtc.getTime() - offset * 60 * 1000).toISOString()
}

function getZonedTodayParts(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

function addDays(parts: { year: number; month: number; day: number }, days: number) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

function startOfWeekMonday(parts: { year: number; month: number; day: number }) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0))
  const jsDay = d.getUTCDay()
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1
  return addDays(parts, -daysSinceMonday)
}

function shouldUseDateIn(rawQuery: string) {
  const q = rawQuery.toLowerCase()
  return /\b(came in|come in|date in|dropped off|drop off|brought in|received|intake)\b/.test(q)
}

function buildStructuredPlan(rawQuery: string, timeZone: string): CrmSearchPlan {
  const q = rawQuery.toLowerCase()
  const today = getZonedTodayParts(timeZone)
  const filters: CrmSearchFilters = {}
  const useDateIn = shouldUseDateIn(rawQuery)
  let cleanedText = rawQuery

  const setRange = (startParts: { year: number; month: number; day: number }, endParts: { year: number; month: number; day: number }) => {
    if (useDateIn) {
      filters.date_in_start = formatDateParts(startParts)
      filters.date_in_end = formatDateParts(endParts)
    } else {
      filters.created_at_start = zonedDateTimeToUtcIso(startParts.year, startParts.month, startParts.day, 0, 0, 0, timeZone)
      filters.created_at_end = zonedDateTimeToUtcIso(endParts.year, endParts.month, endParts.day, 0, 0, 0, timeZone)
    }
  }

  if (q.includes('yesterday')) {
    const yesterday = addDays(today, -1)
    setRange(yesterday, today)
    cleanedText = cleanedText.replace(/yesterday/gi, '')
  } else if (q.includes('today')) {
    setRange(today, addDays(today, 1))
    cleanedText = cleanedText.replace(/today/gi, '')
  } else if (q.includes('last week')) {
    const thisWeekStart = startOfWeekMonday(today)
    const lastWeekStart = addDays(thisWeekStart, -7)
    setRange(lastWeekStart, thisWeekStart)
    cleanedText = cleanedText.replace(/last week/gi, '')
  } else if (q.includes('this week')) {
    const thisWeekStart = startOfWeekMonday(today)
    const nextWeekStart = addDays(thisWeekStart, 7)
    setRange(thisWeekStart, nextWeekStart)
    cleanedText = cleanedText.replace(/this week/gi, '')
  }

  const statuses = ['urgent', 'completed', 'picked up', 'in progress', 'pending']
  const status = statuses.find((value) => q.includes(value))
  if (status) {
    filters.status = status
    cleanedText = cleanedText.replace(new RegExp(status, 'gi'), '')
  } else if (/\b(to be done|not done|unfinished|still have|waiting on parts)\b/.test(q)) {
    filters.status = 'in progress'
  }

  const phoneDigits = rawQuery.replace(/\D/g, '')
  if (phoneDigits.length >= 7) filters.phone = phoneDigits

  const filler = /\b(show|me|find|search|jobs|job|customers|customer|drones|drone|model|that|came|come|in|from|with|the|a|an|for|all|list|what|which|were|was|does|have|how|many|still|to|be|done|during|dropped|off|brought|received|intake)\b/gi
  const remainingText = cleanedText.replace(filler, ' ').replace(/\s+/g, ' ').trim()

  if (remainingText) {
    filters.job_text = remainingText
    filters.customer_name = remainingText
  }

  return {
    intent: 'search_crm',
    filters,
    sort: q.includes('oldest') ? 'oldest' : 'newest',
  }
}

function uniqueById<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values())
}

function hasJobFilters(filters: CrmSearchFilters) {
  return Boolean(filters.status || filters.created_at_start || filters.created_at_end || filters.date_in_start || filters.date_in_end)
}

function applyJobFilters<T>(query: T, filters: CrmSearchFilters): T {
  let nextQuery: any = query
  if (filters.status) nextQuery = nextQuery.ilike('status', `%${escapeLike(filters.status)}%`)
  if (filters.created_at_start) nextQuery = nextQuery.gte('created_at', filters.created_at_start)
  if (filters.created_at_end) nextQuery = nextQuery.lt('created_at', filters.created_at_end)
  if (filters.date_in_start) nextQuery = nextQuery.gte('date_in', filters.date_in_start)
  if (filters.date_in_end) nextQuery = nextQuery.lt('date_in', filters.date_in_end)
  return nextQuery as T
}

async function logSearch(supabase: Awaited<ReturnType<typeof createClient>>, payload: Record<string, unknown>) {
  try {
    await supabase.from('crm_search_logs').insert([payload])
  } catch {}
}

function fallbackAnswer(query: string, cards: CustomerCard[]) {
  if (!cards.length) return `No matching CRM records found for "${query}".`
  const jobCount = cards.reduce((sum, card) => sum + card.jobs.length, 0)
  if (/how many/i.test(query)) return `Found ${jobCount || cards.length} matching ${jobCount === 1 || cards.length === 1 ? 'record' : 'records'}.`
  return `Found ${cards.length} matching customer${cards.length === 1 ? '' : 's'}${jobCount ? ` and ${jobCount} job${jobCount === 1 ? '' : 's'}` : ''}.`
}

async function runStructuredSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawQuery: string,
  timeZone: string,
  extraErrors: string[] = []
) {
  const query = rawQuery.trim()
  const errors: string[] = [...extraErrors]
  const plan = buildStructuredPlan(query, timeZone)
  const filters = plan.filters
  const textTerms = Array.from(new Set([filters.customer_name, filters.job_text].filter(Boolean))) as string[]

  let customerRows: any[] = []
  let jobRows: any[] = []

  for (const textTerm of textTerms) {
    const term = escapeLike(textTerm)
    const normalizedTerm = escapeLike(normalizeDroneText(textTerm))

    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,notes.ilike.%${term}%`)
      .limit(25)

    if (customerError) errors.push(customerError.message)
    customerRows = customerRows.concat(customers || [])

    let jobQuery = supabase
      .from('service_jobs')
      .select('*')
      .or(`title.ilike.%${term}%,description.ilike.%${term}%,diagnosis.ilike.%${term}%,treatment.ilike.%${term}%,status.ilike.%${term}%,title.ilike.%${normalizedTerm}%,description.ilike.%${normalizedTerm}%,diagnosis.ilike.%${normalizedTerm}%,treatment.ilike.%${normalizedTerm}%`)
      .limit(75)

    jobQuery = applyJobFilters(jobQuery, filters)

    const { data: jobs, error: jobError } = await jobQuery
    if (jobError) errors.push(jobError.message)
    jobRows = jobRows.concat(jobs || [])
  }

  if (filters.phone) {
    const phoneDigits = filters.phone.replace(/\D/g, '')
    const { data: phoneCustomers, error } = await supabase
      .from('customers')
      .select('*')
      .ilike('phone', `%${escapeLike(phoneDigits)}%`)
      .limit(25)

    if (error) errors.push(error.message)
    customerRows = customerRows.concat(phoneCustomers || [])
  }

  if (!textTerms.length || hasJobFilters(filters)) {
    let filteredJobQuery = supabase.from('service_jobs').select('*').limit(100)
    filteredJobQuery = applyJobFilters(filteredJobQuery, filters)
    filteredJobQuery = filteredJobQuery.order(filters.date_in_start ? 'date_in' : 'created_at', { ascending: plan.sort === 'oldest' })

    const { data: filteredJobs, error } = await filteredJobQuery
    if (error) errors.push(error.message)
    jobRows = jobRows.concat(filteredJobs || [])
  }

  customerRows = uniqueById(customerRows)
  jobRows = uniqueById(jobRows)

  const directCustomerIds = customerRows.map((customer) => customer.id).filter(Boolean)
  const jobCustomerIds = jobRows.map((job) => job.customer_id).filter(Boolean)
  const allCustomerIds = Array.from(new Set([...directCustomerIds, ...jobCustomerIds]))

  const { data: relatedCustomers, error: relatedCustomerError } = allCustomerIds.length
    ? await supabase.from('customers').select('*').in('id', allCustomerIds)
    : { data: [] as any[], error: null }

  if (relatedCustomerError) errors.push(relatedCustomerError.message)

  const allCustomers = uniqueById([...(relatedCustomers || []), ...customerRows])
  const jobsByCustomer = new Map<string, any[]>()

  if (directCustomerIds.length) {
    let directJobsQuery = supabase.from('service_jobs').select('*').in('customer_id', directCustomerIds)
    directJobsQuery = applyJobFilters(directJobsQuery, filters)

    const { data: allJobsForDirectCustomers, error } = await directJobsQuery
    if (error) errors.push(error.message)

    for (const job of allJobsForDirectCustomers || []) {
      const list = jobsByCustomer.get(job.customer_id) || []
      list.push(job)
      jobsByCustomer.set(job.customer_id, list)
    }
  }

  for (const job of jobRows) {
    const list = jobsByCustomer.get(job.customer_id) || []
    if (!list.some((existing) => existing.id === job.id)) list.push(job)
    jobsByCustomer.set(job.customer_id, list)
  }

  const cards = allCustomers
    .map((customer) => ({
      ...customer,
      jobs: (jobsByCustomer.get(customer.id) || []).sort((a, b) => {
        const aDate = new Date(a.date_in || a.created_at || 0).getTime()
        const bDate = new Date(b.date_in || b.created_at || 0).getTime()
        return plan.sort === 'oldest' ? aDate - bDate : bDate - aDate
      }),
      directMatch: directCustomerIds.includes(customer.id),
    }))
    .filter((card) => !hasJobFilters(filters) || card.jobs.length > 0)

  const answer = fallbackAnswer(query, cards)
  const debug = {
    rawQuery,
    source: 'structured' as const,
    plan,
    aiPlan: null,
    answer,
    customerMatches: customerRows.length,
    jobMatches: jobRows.length,
    returnedCards: cards.length,
    errors,
  } satisfies CrmSearchDebug

  await logSearch(supabase, {
    question: rawQuery,
    answer,
    ai_plan: null,
    structured_plan: plan,
    customer_matches: customerRows.map((row) => row.id),
    job_matches: jobRows.map((row) => row.id),
    returned_cards: cards.map((card) => card.id),
    errors,
  })

  return { cards: cards as CustomerCard[], answer, debug }
}

function dateString(timeZone: string) {
  return formatDateParts(getZonedTodayParts(timeZone))
}

async function buildAiPlan(rawQuery: string, timeZone: string) {
  const structuredPlan = buildStructuredPlan(rawQuery, timeZone)
  const today = dateString(timeZone)

  return completeJson<AiSearchPlan>({
    system: [
      'You interpret CRM search questions for a drone repair shop.',
      'Return JSON only. Do not answer the user yet.',
      'For came in, dropped off, brought in, received, or intake wording, use date_field "date_in", never created_at.',
      'Normalize drone models in search_terms, including Mini3, Mini 3, Mini 3s, Mini 3 Pro, and DJI Mini 3.',
      'Statuses are free text but common values are urgent, in progress, completed, and picked up.',
    ].join(' '),
    user: JSON.stringify({
      question: rawQuery,
      today,
      timeZone,
      localStructuredPlan: structuredPlan,
    }),
    schema: {
      name: 'crm_search_plan',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['intent', 'summary', 'search_terms', 'status_terms', 'date_field', 'date_start', 'date_end', 'needs_unfinished_jobs', 'needs_completed_waiting_pickup', 'sort'],
        properties: {
          intent: { type: 'string', enum: ['answer_crm_question'] },
          summary: { type: 'string' },
          search_terms: { type: 'array', items: { type: 'string' } },
          status_terms: { type: 'array', items: { type: 'string' } },
          date_field: { type: 'string', enum: ['date_in', 'created_at', 'none'] },
          date_start: { type: ['string', 'null'] },
          date_end: { type: ['string', 'null'] },
          needs_unfinished_jobs: { type: 'boolean' },
          needs_completed_waiting_pickup: { type: 'boolean' },
          sort: { type: 'string', enum: ['newest', 'oldest'] },
        },
      },
    },
  })
}

function recordText(customer: any, job: any) {
  return normalizeDroneText([
    customer.full_name,
    customer.phone,
    customer.email,
    customer.notes,
    job.title,
    job.description,
    job.diagnosis,
    job.treatment,
    job.status,
  ].filter(Boolean).join(' '))
}

function dateInRange(value: string | null | undefined, start: string | null, end: string | null) {
  if (!start && !end) return true
  if (!value) return false
  const date = value.slice(0, 10)
  if (start && date < start) return false
  if (end && date >= end) return false
  return true
}

async function fetchAiCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  plan: AiSearchPlan
) {
  const { data: customerRows, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .limit(200)

  let jobsQuery = supabase
    .from('service_jobs')
    .select('*')
    .order(plan.date_field === 'date_in' ? 'date_in' : 'created_at', { ascending: plan.sort === 'oldest' })
    .limit(300)

  if (plan.date_field === 'date_in' && plan.date_start) jobsQuery = jobsQuery.gte('date_in', plan.date_start)
  if (plan.date_field === 'date_in' && plan.date_end) jobsQuery = jobsQuery.lt('date_in', plan.date_end)
  if (plan.date_field === 'created_at' && plan.date_start) jobsQuery = jobsQuery.gte('created_at', plan.date_start)
  if (plan.date_field === 'created_at' && plan.date_end) jobsQuery = jobsQuery.lt('created_at', plan.date_end)

  const { data: jobRows, error: jobError } = await jobsQuery
  const errors = [customerError?.message, jobError?.message].filter(Boolean) as string[]
  const customers = customerRows || []
  const jobs = jobRows || []
  const customerById = new Map(customers.map((customer: any) => [customer.id, customer]))
  const terms = Array.from(new Set(plan.search_terms.concat(plan.status_terms).map(normalizeDroneText).filter(Boolean)))

  const rows = jobs
    .filter((job: any) => {
      const customer = customerById.get(job.customer_id) || {}
      const status = String(job.status || '').toLowerCase()

      if (plan.needs_unfinished_jobs && ['completed', 'picked up'].includes(status)) return false
      if (plan.needs_completed_waiting_pickup && status !== 'completed') return false

      if (plan.date_field !== 'none') {
        const fieldValue = plan.date_field === 'date_in' ? job.date_in : job.created_at
        if (!dateInRange(fieldValue, plan.date_start, plan.date_end)) return false
      }

      if (!terms.length) return true
      const text = recordText(customer, job)
      return terms.some((term) => text.includes(term))
    })
    .slice(0, 120)

  const customerOnlyRows = customers
    .filter((customer: any) => {
      if (!terms.length) return rows.some((job: any) => job.customer_id === customer.id)
      const text = normalizeDroneText([customer.full_name, customer.phone, customer.email, customer.notes].filter(Boolean).join(' '))
      return terms.some((term) => text.includes(term)) || rows.some((job: any) => job.customer_id === customer.id)
    })
    .slice(0, 80)

  return {
    customers: customerOnlyRows,
    jobs: rows,
    errors,
  }
}

function toAiRecord(customer: any, jobs: any[]) {
  return {
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
    },
    jobs: jobs.map((job) => ({
      id: job.id,
      customer_id: job.customer_id,
      title: job.title,
      status: job.status,
      date_in: job.date_in,
      created_at: job.created_at,
      description: job.description,
      diagnosis: job.diagnosis,
      treatment: job.treatment,
      estimate: job.estimate,
      final_price: job.final_price,
    })),
  }
}

async function answerWithAi(rawQuery: string, timeZone: string, plan: AiSearchPlan, candidates: { customers: any[]; jobs: any[] }) {
  const jobsByCustomer = new Map<string, any[]>()
  for (const job of candidates.jobs) {
    const list = jobsByCustomer.get(job.customer_id) || []
    list.push(job)
    jobsByCustomer.set(job.customer_id, list)
  }

  const records = candidates.customers
    .map((customer) => toAiRecord(customer, jobsByCustomer.get(customer.id) || []))
    .filter((record) => record.jobs.length || candidates.jobs.length === 0)

  return completeJson<AiAnswer>({
    system: [
      'You answer questions using only the provided CRM records.',
      'Do not invent customers, drone models, dates, prices, statuses, or jobs.',
      'If the records do not contain the answer, say that no matching CRM records were found.',
      'Return concise plain English plus exact matching customer and job IDs.',
    ].join(' '),
    user: JSON.stringify({
      question: rawQuery,
      timeZone,
      plan,
      records,
    }),
    schema: {
      name: 'crm_search_answer',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['answer', 'matching_customer_ids', 'matching_job_ids'],
        properties: {
          answer: { type: 'string' },
          matching_customer_ids: { type: 'array', items: { type: 'string' } },
          matching_job_ids: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  })
}

function buildCards(customers: any[], jobs: any[], answer: AiAnswer, sort: 'newest' | 'oldest') {
  const customerById = new Map(customers.map((customer) => [customer.id, customer]))
  const selectedJobIds = new Set(answer.matching_job_ids)
  const selectedCustomerIds = new Set(answer.matching_customer_ids)
  const jobsByCustomer = new Map<string, any[]>()

  for (const job of jobs) {
    if (selectedJobIds.size && !selectedJobIds.has(job.id)) continue
    if (!selectedJobIds.size && selectedCustomerIds.size && !selectedCustomerIds.has(job.customer_id)) continue
    const list = jobsByCustomer.get(job.customer_id) || []
    list.push(job)
    jobsByCustomer.set(job.customer_id, list)
    selectedCustomerIds.add(job.customer_id)
  }

  return Array.from(selectedCustomerIds)
    .map((id) => {
      const customer = customerById.get(id)
      if (!customer) return null

      return {
        ...customer,
        jobs: (jobsByCustomer.get(id) || []).sort((a, b) => {
          const aDate = new Date(a.date_in || a.created_at || 0).getTime()
          const bDate = new Date(b.date_in || b.created_at || 0).getTime()
          return sort === 'oldest' ? aDate - bDate : bDate - aDate
        }),
        directMatch: true,
      }
    })
    .filter(Boolean) as CustomerCard[]
}

async function runAiSearch(supabase: Awaited<ReturnType<typeof createClient>>, rawQuery: string, timeZone: string) {
  const errors: string[] = []
  const plan = await buildAiPlan(rawQuery, timeZone)
  const candidates = await fetchAiCandidates(supabase, plan)
  errors.push(...candidates.errors)

  const answer = await answerWithAi(rawQuery, timeZone, plan, candidates)
  const cards = buildCards(candidates.customers, candidates.jobs, answer, plan.sort)

  const debug = {
    rawQuery,
    source: 'ai' as const,
    plan: buildStructuredPlan(rawQuery, timeZone),
    aiPlan: plan,
    answer: answer.answer,
    customerMatches: answer.matching_customer_ids.length,
    jobMatches: answer.matching_job_ids.length,
    returnedCards: cards.length,
    errors,
  } satisfies CrmSearchDebug

  await logSearch(supabase, {
    question: rawQuery,
    answer: answer.answer,
    ai_plan: plan,
    structured_plan: debug.plan,
    customer_matches: answer.matching_customer_ids,
    job_matches: answer.matching_job_ids,
    returned_cards: cards.map((card) => card.id),
    errors,
  })

  return { cards, answer: answer.answer, debug }
}

export async function searchCrm(rawQuery: string, options?: { timeZone?: string }) {
  const query = rawQuery.trim()
  const timeZone = options?.timeZone || 'America/New_York'
  const supabase = await createClient()

  if (!query) {
    const plan = buildStructuredPlan(query, timeZone)
    return {
      cards: [] as CustomerCard[],
      answer: '',
      debug: {
        rawQuery,
        source: 'structured' as const,
        plan,
        aiPlan: null,
        answer: '',
        customerMatches: 0,
        jobMatches: 0,
        returnedCards: 0,
        errors: [],
      } satisfies CrmSearchDebug,
    }
  }

  if (isOpenAIConfigured()) {
    try {
      return await runAiSearch(supabase, query, timeZone)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OpenAI search error'
      return runStructuredSearch(supabase, query, timeZone, [message])
    }
  }

  return runStructuredSearch(supabase, query, timeZone, ['OPENAI_API_KEY is not configured; used structured fallback.'])
}
