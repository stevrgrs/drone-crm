import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_AUDIO_BYTES = 25 * 1024 * 1024

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI is not connected yet. Add OPENAI_API_KEY to this Vercel environment.' },
      { status: 500 }
    )
  }

  const incomingForm = await request.formData()
  const audio = incomingForm.get('audio')

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'No voice recording was received.' }, { status: 400 })
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'That voice recording is too long. Try a shorter question.' }, { status: 413 })
  }

  const form = new FormData()
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe')
  form.append('file', audio, audio.name || 'voice.webm')
  form.append('response_format', 'json')
  form.append(
    'prompt',
    'This is a short spoken Cardinal Drones CRM search request. It may include customer names, drone models, job statuses, phone numbers, appointments, invoices, or repair notes.'
  )

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error?.message || `OpenAI transcription failed with status ${response.status}` },
      { status: response.status }
    )
  }

  const text = typeof payload?.text === 'string' ? payload.text.trim() : ''

  if (!text) {
    return NextResponse.json({ error: 'I could not hear a question in that recording.' }, { status: 422 })
  }

  return NextResponse.json({ text })
}
