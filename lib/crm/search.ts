import { createClient } from '@/lib/supabase/server'

type CrmSearchFilters = {
  customer_name?: string | null
  phone?: string | null
  email?: string | null
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
  sort?: 'newest' | 'oldest'
}

export type CrmSearchDebug = {
  rawQuery: string
  source: 'openai' | 'fallback'
  plan: CrmSearchPlan
  customerMatches: number
  jobMatches: number
  returnedCards: number
  errors: string[]
}

export type JobCard = {
  id: string
  customer_id: string
  title?: string | null
  description?: string | null
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

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, '')
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

function fullDayRange(parts: { year: number; month: number; day: number }, timeZone: string) {
  const end = addDays(parts, 1)
  return {
    start: zonedDateTimeToUtcIso(parts.year, parts.month, parts.day, 0, 0, 0, timeZone),
    end: zonedDateTimeToUtcIso(end.year, end.month, end.day, 0, 0, 0, timeZone),
  }
}

function inferFallbackPlan(rawQuery: string, timeZone: string): CrmSearchPlan {
  const q = rawQuery.toLowerCase()
  const today = getZonedTodayParts(timeZone)
  const filters: CrmSearchFilters = {}
  let cleanedText = rawQuery

  const setRange = (startParts: { year: number; month: number; day: number }, endParts: { year: number; month: number; day: number }) => {
    filters.created_at_start = zonedDateTimeToUtcIso(startParts.year, startParts.month, startParts.day, 0, 0, 0, timeZone)
    filters.created_at_end = zonedDateTimeToUtcIso(endParts.year, endParts.month, endParts.day, 0, 0, 0, timeZone)
  }

  if (q.includes('yesterday')) {
    const yesterday = addDays(today, -1)
    const range = fullDayRange(yesterday, timeZone)
    filters.created_at_start = range.start
    filters.created_at_end = range.end
    cleanedText = cleanedText.replace(/yesterday/gi, '')
  } else if (q.includes('today')) {
    const range = fullDayRange(today, timeZone)
    filters.created_at_start = range.start
    filters.created_at_end = range.end
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
  if (phoneDigits.length >= 7) {
    filters.phone = phoneDigits
  }

  const filler = /\b(show|me|find|search|jobs|job|customers|customer|drones|drone|that|came|in|from|with|the|a|an|for|all|list)\b/gi
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

function cleanPlan(plan: CrmSearchPlan): CrmSearchPlan {
  return {
    intent: 'search_crm',
    sort: plan.sort === 'oldest' ? 'oldest' : 'newest',
    filters: {
      customer_name: plan.filters?.customer_name || null,
      phone: plan.filters?.phone || null,
      email: plan.filters?.email || null,
      job_text: plan.filters?.job_text || null,
      status: plan.filters?.status || null,
      created_at_start: plan.filters?.created_at_start || null,
      created_at_end: plan.filters?.created_at_end || null,
      date_in_start: plan.filters?.date_in_start || null,
      date_in_end: plan.filters?.date_in_end || null,
    },
  }
}

async function getOpenAiPlan(rawQuery: string, timeZone: string): Promise<CrmSearchPlan | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const today = new Date().toISOString()

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
            'You convert Cardinal Drones CRM search requests into strict JSON. Return only JSON with this shape: {"intent":"search_crm","filters":{"customer_name":null,"phone":null,"email":null,"job_text":null,"status":null,"created_at_start":null,"created_at_end":null,"date_in_start":null,"date_in_end":null},"sort":"newest"}. Use ISO strings with timezone offsets for date ranges. Use half-open ranges: start inclusive, end exclusive. Interpret relative dates using the provided current date and timezone. Searchable status values may include urgent, completed, picked up, in progress, and pending.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            current_date: today,
            time_zone: timeZone,
            request: rawQuery,
          }),
        },
      ],
    }),
  })

  if (!response.ok) return null

  const json = await response.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) return null

  return cleanPlan(JSON.parse(content))
}

async function buildPlan(rawQuery: string, timeZone: string, errors: string[]) {
  try {
    const openAiPlan = await getOpenAiPlan(rawQuery, timeZone)
    if (openAiPlan) {
      return { plan: openAiPlan, source: 'openai' as const }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'OpenAI planning failed')
  }

  return {
    plan: inferFallbackPlan(rawQuery, timeZone),
    source: 'fallback' as const,
  }
}

function uniqueById<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values())
}

export async function searchCrm(rawQuery: string, options?: { timeZone?: string }) {
  const query = rawQuery.trim()
  const timeZone = options?.timeZone || 'America/New_York'
  const errors: string[] = []

  if (!query) {
    return {
      cards: [] as CustomerCard[],
      debug: {
        rawQuery,
        source: 'fallback' as const,
        plan: inferFallbackPlan('', timeZone),
        customerMatches: 0,
        jobMatches: 0,
        returnedCards: 0,
        errors,
      },
    }
  }

  const { plan, source } = await buildPlan(query, timeZone, errors)
  const filters = plan.filters
  const supabase = await createClient()
  const textTerms = Array.from(new Set([filters.customer_name, filters.job_text].filter(Boolean))) as string[]

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
      .or(`title.ilike.%${term}%,description.ilike.%${term}%,status.ilike.%${term}%`)
      .limit(75)

    if (filters.status) jobQuery = jobQuery.ilike('status', `%${escapeLike(filters.status)}%`)
    if (filters.created_at_start) jobQuery = jobQuery.gte('created_at', filters.created_at_start)
    if (filters.created_at_end) jobQuery = jobQuery.lt('created_at', filters.created_at_end)
    if (filters.date_in_start) jobQuery = jobQuery.gte('date_in', filters.date_in_start)
    if (filters.date_in_end) jobQuery = jobQuery.lt('date_in', filters.date_in_end)

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

  if (!textTerms.length || filters.status || filters.created_at_start || filters.created_at_end || filters.date_in_start || filters.date_in_end) {
    let filteredJobQuery = supabase.from('service_jobs').select('*').limit(100)

    if (filters.status) filteredJobQuery = filteredJobQuery.ilike('status', `%${escapeLike(filters.status)}%`)
    if (filters.created_at_start) filteredJobQuery = filteredJobQuery.gte('created_at', filters.created_at_start)
    if (filters.created_at_end) filteredJobQuery = filteredJobQuery.lt('created_at', filters.created_at_end)
    if (filters.date_in_start) filteredJobQuery = filteredJobQuery.gte('date_in', filters.date_in_start)
    if (filters.date_in_end) filteredJobQuery = filteredJobQuery.lt('date_in', filters.date_in_end)

    filteredJobQuery = filteredJobQuery.order('created_at', { ascending: plan.sort === 'oldest' })

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
    const { data: allJobsForDirectCustomers, error } = await supabase
      .from('service_jobs')
      .select('*')
      .in('customer_id', directCustomerIds)

    if (error) errors.push(error.message)

    for (const job of allJobsForDirectCustomers || []) {
      const list = jobsByCustomer.get(job.customer_id) || []
      list.push(job)
      jobsByCustomer.set(job.customer_id, list)
    }
  }

  for (const job of jobRows) {
    const list = jobsByCustomer.get(job.customer_id) || []
    if (!list.some((existing) => existing.id === job.id)) {
      list.push(job)
    }
    jobsByCustomer.set(job.customer_id, list)
  }

  const cards = allCustomers.map((customer) => ({
    ...customer,
    jobs: jobsByCustomer.get(customer.id) || [],
    directMatch: directCustomerIds.includes(customer.id),
  }))

  return {
    cards,
    debug: {
      rawQuery,
      source,
      plan,
      customerMatches: customerRows.length,
      jobMatches: jobRows.length,
      returnedCards: cards.length,
      errors,
    } satisfies CrmSearchDebug,
  }
}
