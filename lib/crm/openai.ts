type JsonSchema = {
  name: string
  schema: Record<string, unknown>
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const FALLBACK_MODEL = 'gpt-4o-mini'

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || FALLBACK_MODEL

  return { apiKey, model }
}

function extractJson(content: string) {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('OpenAI returned an empty response')

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('OpenAI did not return JSON')
    return JSON.parse(match[0])
  }
}

async function postChatCompletion(
  apiKey: string,
  body: Record<string, unknown>
) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with status ${response.status}`
    throw new Error(message)
  }

  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('OpenAI response had no message content')

  return extractJson(content)
}

export function isOpenAIConfigured() {
  return Boolean(getOpenAIConfig().apiKey)
}

export async function completeJson<T>({
  system,
  user,
  schema,
  temperature = 0,
}: {
  system: string
  user: string
  schema: JsonSchema
  temperature?: number
}): Promise<T> {
  const { apiKey, model } = getOpenAIConfig()
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  const baseBody = {
    model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }

  try {
    return await postChatCompletion(apiKey, {
      ...baseBody,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schema.name,
          strict: true,
          schema: schema.schema,
        },
      },
    }) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/response_format|json_schema|schema/i.test(message)) throw error

    return await postChatCompletion(apiKey, {
      ...baseBody,
      response_format: { type: 'json_object' },
    }) as T
  }
}
