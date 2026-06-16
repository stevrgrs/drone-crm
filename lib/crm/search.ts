import { createClient } from '@/lib/supabase/server'

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

type CrmAiPlan = {
  answer_mode?: 'answer' | 'count' | 'search'
  customer_name?: string | null
  job_text?: string | null
  status?: string | null
  plain_question?: string | null
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
  source: 'structured'
  plan: CrmSearchPlan
  aiPlan?: CrmAiPlan | null
  customerMatches: number
  jobMatches: number
  returnedCards: number
  errors: string[]
}

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, '')
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
  }

  const phoneDigits = rawQuery.replace(/\D/g, '')
  if (phoneDigits.length >= 7) filters.phone = phoneDigits

  const filler = /\b(show|me|find|search|jobs|job|customers|customer|drones|drone|that|came|come|in|from|with|the|a|an|for|all|list|what|which|were|was|during|dropped|off|brought|received|intake|model|models|does|do|have|has|had|we|our|how|many|total|count|tell|about|please)\b/gi
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

function extractLikelyCustomerName(rawQuery: string) {
  const patterns = [
    /\b(?:what|which)\s+(?:model\s+)?(?:drone|drones|job|jobs)\s+(?:does|do|did)?\s+(.+?)\s+(?:have|has|had)\b/i,
    /\b(?:for|about)\s+([a-z][a-z' -]+)$/i,
  ]

  for (const pattern of patterns) {
    const match = rawQuery.match(pattern)
    const value = match?.[1]?.replace(/[?.!]/g, '').trim()
    if (value && value.split(/\s+/).length >= 2) return value
  }

  return null
}

function createSearchTermVariants(term: string) {
  const cleaned = term.replace(/[?.!]/g, '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  const variants = new Set<string>([cleaned])
  const compact = cleaned.replace(/\s+/g, '')
  if (compact !== cleaned) variants.add(compact)

  const spacedModel = cleaned.replace(/([a-zA-Z]+)(\d+)/g, '$1 $2').replace(/(\d+)([a-zA-Z]+)/g, '$1 $2')
  if (spacedModel !== cleaned) variants.add(spacedModel)

  const withoutDji = cleaned.replace(/^dji\s+/i, '').trim()
  if (withoutDji && withoutDji !== cleaned) variants.add(withoutDji)

  return Array.from(variants)
}

function mergeAiPlan(plan: CrmSearchPlan, aiPlan: CrmAiPlan | null, rawQuery: string) {
  const likelyCustomerName = extractLikelyCustomerName(rawQuery)

  if (likelyCustomerName) {
    plan.filters.customer_name = likelyCustomerName
    if (plan.filters.job_text?.toLowerCase().includes(likelyCustomerName.toLowerCase())) {
      plan.filters.job_text = null
    }
  }

  if (!aiPlan) return

  if (aiPlan.customer_name) {
    plan.filters.customer_name = aiPlan.customer_name
  }

  if (aiPlan.job_text) {
    plan.filters.job_text = aiPlan.job_text
  }

  if (aiPlan.status) {
    plan.filters.status = aiPlan.status
  }
}

async function getOpenAiPlan(rawQuery: string, errors: string[]): Promise<CrmAiPlan | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You convert natural-language CRM questions into a small JSON search plan. Return only JSON with keys: answer_mode, customer_name, job_text, status, plain_question. answer_mode is answer, count, or search. customer_name is a person/business name when the question is about a specific customer. job_text is a drone model, repair issue, serial clue, or job keyword. status is urgent, completed, picked up, in progress, or pending when present. Use null for unknown fields.',
          },
          {
            role: 'user',
            content: rawQuery,
          },
        ],
      }),
    })

    if (!response.ok) {
      errors.push(`OpenAI plan error: ${response.status}`)
      return null
    }

    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content
    if (!content) return null

    return JSON.parse(content) as CrmAiPlan
  } catch (error) {
    errors.push(`OpenAI plan error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

function buildAnswerContext(cards: CustomerCard[]) {
  return cards.slice(0, 20).map((customer) => ({
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
    },
    jobs: customer.jobs.slice(0, 10).map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      diagnosis: job.diagnosis,
      treatment: job.treatment,
      status: job.status,
      date_in: job.date_in,
      created_at: job.created_at,
    })),
  }))
}

async function getOpenAiAnswer(rawQuery: string, cards: CustomerCard[], aiPlan: CrmAiPlan | null, errors: string[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const context = buildAnswerContext(cards)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You answer questions for Cardinal Drones CRM using only the provided CRM records. Be direct and plain English, like a helpful shop assistant. If the records do not contain the answer, say you could not find it in the CRM. Do not invent customers, drone models, dates, diagnoses, or counts. For count questions, count from the provided records and say what you counted.',
          },
          {
            role: 'user',
            content: JSON.stringify({ question: rawQuery, plan: aiPlan, records: context }),
          },
        ],
      }),
    })

    if (!response.ok) {
      errors.push(`OpenAI answer error: ${response.status}`)
      return null
    }

    const json = await response.json()
    return json?.choices?.[0]?.message?.content?.trim() || null
  } catch (error) {
    errors.push(`OpenAI answer error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

export async function searchCrm(rawQuery: string, options?: { timeZone?: string }) {
  const query = rawQuery.trim()
  const timeZone = options?.timeZone || 'America/New_York'
  const errors: string[] = []
  const plan = buildStructuredPlan(query, timeZone)

  if (!query) {
    return {
      cards: [] as CustomerCard[],
      answer: null as string | null,
      debug: {
        rawQuery,
        source: 'structured' as const,
        plan,
        aiPlan: null,
        customerMatches: 0,
        jobMatches: 0,
        returnedCards: 0,
        errors,
      },
    }
  }

  const aiPlan = await getOpenAiPlan(query, errors)
  mergeAiPlan(plan, aiPlan, query)

  const filters = plan.filters
  const supabase = await createClient()
  const baseTextTerms = Array.from(new Set([filters.customer_name, filters.job_text].filter(Boolean))) as string[]
  const textTerms = Array.from(new Set(baseTextTerms.flatMap(createSearchTermVariants)))

  let customerRows: any[] = []
  let jobRows: any[] = []

  for (const textTerm of textTerms) {
    const term = escapeLike(textTerm)

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
      .or(`title.ilike.%${term}%,description.ilike.%${term}%,diagnosis.ilike.%${term}%,treatment.ilike.%${term}%,status.ilike.%${term}%`)
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
    let directJobsQuery = supabase
      .from('service_jobs')
      .select('*')
      .in('customer_id', directCustomerIds)

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

  const answer = await getOpenAiAnswer(query, cards, aiPlan, errors)

  return {
    cards,
    answer,
    debug: {
      rawQuery,
      source: 'structured' as const,
      plan,
      aiPlan,
      customerMatches: customerRows.length,
      jobMatches: jobRows.length,
      returnedCards: cards.length,
      errors,
    } satisfies CrmSearchDebug,
  }
}
