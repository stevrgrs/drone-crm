'use client'

import { useEffect, useRef, useState } from 'react'
import SearchResultsClient from './SearchResultsClient'

type Job = {
  id: string
  customer_id: string
  title?: string | null
  status?: string | null
  date_in?: string | null
  created_at?: string | null
}

type CustomerCard = {
  id: string
  full_name?: string | null
  phone?: string | null
  jobs: Job[]
}

type CrmResponse = {
  answer?: string | null
  cards?: CustomerCard[]
  debug?: {
    errors?: string[]
  }
}

type SpeechRecognitionResult = {
  isFinal: boolean
  0: {
    transcript: string
  }
}

type SpeechRecognitionEvent = {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResult
  }
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const examplePrompts = [
  'What model drone does Oliver Rogers have?',
  'Show customers with completed jobs waiting for pickup',
  'How many Mini 3 repairs are in the CRM?',
  'Which drones came in today?',
]

export default function CrmDemoClient() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<CrmResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [speechMessage, setSpeechMessage] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setSpeechSupported(false)
      setSpeechMessage('Speech recognition is not available in this browser.')
      return
    }

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onstart = () => {
      setIsListening(true)
      setSpeechMessage('Listening...')
    }
    recognition.onend = () => {
      setIsListening(false)
      setSpeechMessage(null)
    }
    recognition.onerror = (event) => {
      setIsListening(false)
      setSpeechMessage(event.error ? `Speech recognition stopped: ${event.error}` : 'Speech recognition stopped.')
    }
    recognition.onresult = (event) => {
      let transcript = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript
      }

      setPrompt(transcript.trim())
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [])

  async function processPrompt() {
    const query = prompt.trim()
    if (!query) {
      setError('Enter or speak a CRM question first.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        }),
      })

      const data = (await response.json()) as CrmResponse

      if (!response.ok) {
        const apiError = data.debug?.errors?.[0] || 'The CRM could not process that request.'
        throw new Error(apiError)
      }

      setResult(data)
    } catch (processError) {
      setResult(null)
      setError(processError instanceof Error ? processError.message : 'Something went wrong processing the request.')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleListening() {
    if (!speechSupported || !recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      return
    }

    setError(null)
    setSpeechMessage('Starting microphone...')
    recognitionRef.current.start()
  }

  const cards = result?.cards || []

  return (
    <section className="rounded-2xl border border-red-900/50 bg-[#0b1220] p-4 shadow-2xl shadow-red-950/20">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
          AI CRM Intake
        </div>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Tell Cardinal Drones what you need
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Type or speak a normal CRM request about customers, drones, jobs, dates, status, pickups, or notes.
        </p>
      </div>

      <label htmlFor="crm-natural-language-prompt" className="sr-only">
        Natural-language CRM prompt
      </label>
      <textarea
        id="crm-natural-language-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={6}
        placeholder="Example: Which customers have completed jobs waiting for pickup?"
        className="w-full resize-none rounded-2xl border border-slate-700 bg-[#030712] px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-500 focus:border-red-500"
      />

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-3">
        <button
          type="button"
          onClick={toggleListening}
          disabled={!speechSupported || isLoading}
          aria-pressed={isListening}
          className={`flex h-14 w-16 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
            isListening
              ? 'border-red-400 bg-red-600 text-white'
              : 'border-slate-700 bg-black/30 text-slate-100 hover:border-red-500'
          } disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600`}
          title={speechSupported ? 'Use microphone' : 'Speech recognition unavailable'}
        >
          {isListening ? 'Stop' : 'Mic'}
        </button>

        <button
          type="button"
          onClick={processPrompt}
          disabled={isLoading}
          className="h-14 rounded-2xl bg-red-600 text-lg font-semibold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:bg-red-900"
        >
          {isLoading ? 'Processing...' : 'Process'}
        </button>
      </div>

      {(speechMessage || !speechSupported) && (
        <div className="mt-2 text-xs text-slate-400">
          {speechMessage}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {examplePrompts.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setPrompt(example)}
            className="rounded-full border border-slate-700 bg-black/30 px-3 py-2 text-left text-xs text-slate-300 hover:border-red-500 hover:text-white"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-[#050914] p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
          Results
        </div>

        {error ? (
          <div className="text-sm leading-6 text-red-200">{error}</div>
        ) : result ? (
          <div className="space-y-4">
            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
              {result.answer || 'The CRM processed the request. Matching records are shown below.'}
            </div>

            {cards.length > 0 ? (
              <SearchResultsClient initialCards={cards} />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 text-sm text-slate-300">
                No matching customers or jobs were returned.
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm leading-6 text-slate-400">
            Your AI/API response will appear here after processing.
          </div>
        )}
      </div>
    </section>
  )
}
