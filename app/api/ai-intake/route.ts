import { NextResponse } from 'next/server'
import { completeJson } from '@/lib/crm/openai'
import { createClient } from '@/lib/supabase/server'

type IntakeDraft = {
  customer: {
    full_name: string | null
    phone: string | null
    email: string | null
    notes: string | null
  }
  job: {
    title: string | null
    status: string | null
    date_in: string | null
    description: string | null
    diagnosis: string | null
    treatment: string | null
    estimate: string | null
    final_price: string | null
  }
}

const STATUS_OPTIONS = ['urgent', 'in progress', 'completed', 'picked up']

function normalizePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

function cleanText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function cleanStatus(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase()
  if (STATUS_OPTIONS.includes(normalized)) return normalized
  return 'in progress'
}

function cleanMoney(value?: string | null) {
  const text = String(value || '').replace(/[^0-9.-]/g, '').trim()
  return text ? Number(text) : null
}

function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`
}

function normalizeDraft(draft: IntakeDraft, timeZone: string): IntakeDraft {
  const dateIn = cleanText(draft.job?.date_in)

  return {
    customer: {
      full_name: cleanText(draft.customer?.full_name),
      phone: normalizePhone(draft.customer?.phone) || null,
      email: cleanText(draft.customer?.email),
      notes: cleanText(draft.customer?.notes),
    },
    job: {
      title: cleanText(draft.job?.title),
      status: cleanStatus(draft.job?.status),
      date_in: dateIn || todayInTimeZone(timeZone),
      description: cleanText(draft.job?.description),
      diagnosis: cleanText(draft.job?.diagnosis),
      treatment: cleanText(draft.job?.treatment),
      estimate: cleanText(draft.job?.estimate),
      final_price: cleanText(draft.job?.final_price),
    },
  }
}

async function logIntake(supabase: Awaited<ReturnType<typeof createClient>>, payload: Record<string, unknown>) {
  try {
    await supabase.from('crm_intake_logs').insert([payload])
  } catch {}
}

async function findDuplicates(supabase: Awaited<ReturnType<typeof createClient>>, draft: IntakeDraft) {
  const matches: any[] = []
  const phone = normalizePhone(draft.customer.phone)
  const name = draft.customer.full_name?.trim()

  if (phone) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('phone', `%${phone}%`)
      .limit(5)
    matches.push(...(data || []))
  }

  if (name) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('full_name', `%${name}%`)
      .limit(5)
    matches.push(...(data || []))
  }

  return Array.from(new Map(matches.map((match) => [match.id, match])).values())
}

async function parseIntake(rawInput: string, timeZone: string) {
  const today = todayInTimeZone(timeZone)

  const parsed = await completeJson<IntakeDraft>({
    system: [
      'You extract drone repair CRM intake data from messy staff notes.',
      'Return JSON only. Do not invent missing fields.',
      'Use date_in for dropped off, came in, brought in, received, or intake dates.',
      'If the text says today, use the provided today date.',
      'Use status urgent only when explicitly urgent/rush/ASAP. Otherwise use in progress unless another supported status is stated.',
    ].join(' '),
    user: JSON.stringify({ rawInput, today, timeZone }),
    schema: {
      name: 'crm_intake_draft',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['customer', 'job'],
        properties: {
          customer: {
            type: 'object',
            additionalProperties: false,
            required: ['full_name', 'phone', 'email', 'notes'],
            properties: {
              full_name: { type: ['string', 'null'] },
              phone: { type: ['string', 'null'] },
              email: { type: ['string', 'null'] },
              notes: { type: ['string', 'null'] },
            },
          },
          job: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'status', 'date_in', 'description', 'diagnosis', 'treatment', 'estimate', 'final_price'],
            properties: {
              title: { type: ['string', 'null'] },
              status: { type: ['string', 'null'] },
              date_in: { type: ['string', 'null'] },
              description: { type: ['string', 'null'] },
              diagnosis: { type: ['string', 'null'] },
              treatment: { type: ['string', 'null'] },
              estimate: { type: ['string', 'null'] },
              final_price: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  })

  return normalizeDraft(parsed, timeZone)
}

async function saveDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  draft: IntakeDraft,
  existingCustomerId?: string | null
) {
  const customerPayload = {
    full_name: draft.customer.full_name || 'Unnamed Customer',
    phone: normalizePhone(draft.customer.phone) || null,
    email: draft.customer.email || '',
    notes: draft.customer.notes || '',
  }

  let customerId = existingCustomerId || null

  if (!customerId) {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert([customerPayload])
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    customerId = customer.id
  }

  const estimate = cleanMoney(draft.job.estimate)
  const finalPrice = cleanMoney(draft.job.final_price)

  const jobPayload = {
    customer_id: customerId,
    title: draft.job.title || 'New Repair',
    status: cleanStatus(draft.job.status),
    date_in: draft.job.date_in,
    description: draft.job.description || null,
    diagnosis: draft.job.diagnosis || null,
    treatment: draft.job.treatment || null,
    estimate: estimate !== null && !Number.isNaN(estimate) ? estimate : null,
    final_price: finalPrice !== null && !Number.isNaN(finalPrice) ? finalPrice : null,
  }

  const { data: job, error } = await supabase
    .from('service_jobs')
    .insert([jobPayload])
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  return { customerId, jobId: job.id }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  let rawInput = ''

  try {
    const body = await request.json()
    const action = body?.action === 'save' ? 'save' : 'parse'
    const timeZone = typeof body?.timeZone === 'string' ? body.timeZone : 'America/New_York'

    if (action === 'parse') {
      rawInput = typeof body?.rawInput === 'string' ? body.rawInput.trim() : ''
      if (!rawInput) throw new Error('Intake text is required')

      const draft = await parseIntake(rawInput, timeZone)
      const duplicateCustomers = await findDuplicates(supabase, draft)

      await logIntake(supabase, {
        raw_input: rawInput,
        parsed_result: draft,
        confirmed: false,
        errors: [],
      })

      return NextResponse.json({ draft, duplicateCustomers })
    }

    const draft = normalizeDraft(body?.draft, timeZone)
    const existingCustomerId = typeof body?.existingCustomerId === 'string' && body.existingCustomerId
      ? body.existingCustomerId
      : null

    if (!draft.customer.full_name && !existingCustomerId) throw new Error('Customer name is required')

    const saved = await saveDraft(supabase, draft, existingCustomerId)

    await logIntake(supabase, {
      raw_input: typeof body?.rawInput === 'string' ? body.rawInput : null,
      parsed_result: draft,
      saved_customer_id: saved.customerId,
      saved_job_id: saved.jobId,
      confirmed: true,
      errors: [],
    })

    return NextResponse.json({ ok: true, ...saved })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI intake error'

    await logIntake(supabase, {
      raw_input: rawInput || null,
      parsed_result: null,
      confirmed: false,
      errors: [message],
    })

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
