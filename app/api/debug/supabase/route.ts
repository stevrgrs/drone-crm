import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type DebugError = {
  name: string
  message: string
  cause: unknown
  ownProperties: string[]
}

type StepResult = {
  ok: boolean
  count?: number | null
  error: DebugError | null
  stage?: string
  deleteError?: DebugError | null
}

function serializeError(error: unknown): DebugError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause: error.cause instanceof Error
        ? { name: error.cause.name, message: error.cause.message }
        : error.cause ?? null,
      ownProperties: Object.getOwnPropertyNames(error),
    }
  }

  if (error && typeof error === 'object') {
    const maybeError = error as { name?: unknown; message?: unknown; cause?: unknown }

    return {
      name: typeof maybeError.name === 'string' ? maybeError.name : 'Object',
      message: typeof maybeError.message === 'string' ? maybeError.message : JSON.stringify(error),
      cause: maybeError.cause ?? null,
      ownProperties: Object.getOwnPropertyNames(error),
    }
  }

  return {
    name: typeof error,
    message: String(error),
    cause: null,
    ownProperties: [],
  }
}

function todayIsoDate() {
  return new Date().toISOString().split('T')[0]
}

async function selectCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'customers' | 'service_jobs'
): Promise<StepResult> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      return { ok: false, count: null, error: serializeError(error) }
    }

    return { ok: true, count: count ?? 0, error: null }
  } catch (error) {
    return { ok: false, count: null, error: serializeError(error) }
  }
}

async function testCustomerInsert(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<StepResult> {
  let customerId: string | null = null

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        full_name: 'DEBUG TEST - DELETE ME',
        phone: null,
        email: 'debug-test-delete-me@example.com',
        notes: 'Temporary Supabase debug probe. Delete me.',
      }])
      .select('id')
      .single()

    if (error) {
      return { ok: false, error: serializeError(error), stage: 'insert_customer' }
    }

    customerId = data.id
  } catch (error) {
    return { ok: false, error: serializeError(error), stage: 'insert_customer' }
  }

  try {
    const { error } = await supabase.from('customers').delete().eq('id', customerId)

    if (error) {
      return {
        ok: true,
        error: null,
        stage: 'insert_customer',
        deleteError: serializeError(error),
      }
    }
  } catch (error) {
    return {
      ok: true,
      error: null,
      stage: 'insert_customer',
      deleteError: serializeError(error),
    }
  }

  return { ok: true, error: null, stage: 'insert_customer', deleteError: null }
}

async function testJobInsert(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<StepResult> {
  let customerId: string | null = null
  let jobId: string | null = null
  let deleteError: DebugError | null = null
  let insertError: DebugError | null = null

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        full_name: 'DEBUG TEST - DELETE ME',
        phone: null,
        email: 'debug-test-delete-me@example.com',
        notes: 'Temporary parent customer for Supabase service job debug probe. Delete me.',
      }])
      .select('id')
      .single()

    if (error) {
      return { ok: false, error: serializeError(error), stage: 'insert_customer_for_job' }
    }

    customerId = data.id
  } catch (error) {
    return { ok: false, error: serializeError(error), stage: 'insert_customer_for_job' }
  }

  try {
    const { data, error } = await supabase
      .from('service_jobs')
      .insert([{
        customer_id: customerId,
        title: 'DEBUG TEST - DELETE ME',
        status: 'in progress',
        date_in: todayIsoDate(),
        description: 'Temporary Supabase debug probe. Delete me.',
        diagnosis: null,
        treatment: null,
        estimate: null,
        final_price: null,
      }])
      .select('id')
      .single()

    if (error) {
      insertError = serializeError(error)
    } else {
      jobId = data.id
    }
  } catch (error) {
    insertError = serializeError(error)
  } finally {
    if (jobId) {
      try {
        const { error } = await supabase.from('service_jobs').delete().eq('id', jobId)
        if (error) deleteError = serializeError(error)
      } catch (error) {
        deleteError = serializeError(error)
      }
    }

    if (customerId) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', customerId)
        if (error && !deleteError) deleteError = serializeError(error)
      } catch (error) {
        if (!deleteError) deleteError = serializeError(error)
      }
    }
  }

  if (insertError) {
    return { ok: false, error: insertError, stage: 'insert_service_job', deleteError }
  }

  return { ok: true, error: null, stage: 'insert_service_job', deleteError }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let supabaseUrlHost: string | null = null

  try {
    supabaseUrlHost = supabaseUrl ? new URL(supabaseUrl).host : null
  } catch (error) {
    supabaseUrlHost = `invalid_url: ${serializeError(error).message}`
  }

  const response = {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseKey: Boolean(supabaseKey),
    supabaseUrlHost,
    customersSelect: { ok: false, count: null, error: null } as StepResult,
    jobsSelect: { ok: false, count: null, error: null } as StepResult,
    customersInsertTest: { ok: false, error: null, stage: 'insert_customer' } as StepResult,
    jobsInsertTest: { ok: false, error: null, stage: 'insert_service_job' } as StepResult,
  }

  let supabase: Awaited<ReturnType<typeof createClient>>

  try {
    supabase = await createClient()
  } catch (error) {
    const serialized = serializeError(error)
    response.customersSelect.error = serialized
    response.jobsSelect.error = serialized
    response.customersInsertTest.error = serialized
    response.customersInsertTest.stage = 'create_supabase_client'
    response.jobsInsertTest.error = serialized
    response.jobsInsertTest.stage = 'create_supabase_client'

    return NextResponse.json(response)
  }

  response.customersSelect = await selectCount(supabase, 'customers')
  response.jobsSelect = await selectCount(supabase, 'service_jobs')
  response.customersInsertTest = await testCustomerInsert(supabase)
  response.jobsInsertTest = await testJobInsert(supabase)

  return NextResponse.json(response)
}
