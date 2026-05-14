'use client'

import { useRef, useState } from 'react'

type VoicePromptFormProps = {
  defaultValue: string
}

type SpeechRecognitionResultEvent = {
  results?: {
    [index: number]: {
      [index: number]: {
        transcript?: string
      }
    }
  }
}

type SpeechRecognitionErrorEvent = {
  error?: string
}

type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export default function VoicePromptForm({ defaultValue }: VoicePromptFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const [prompt, setPrompt] = useState(defaultValue)
  const [isListening, setIsListening] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState('')

  function submitPrompt(value: string) {
    const nextPrompt = value.trim()

    if (!nextPrompt) {
      setVoiceMessage('I did not catch anything. Try again.')
      return
    }

    setPrompt(nextPrompt)

    const form = formRef.current
    const input = form?.elements.namedItem('prompt')

    if (input instanceof HTMLInputElement) {
      input.value = nextPrompt
    }

    form?.requestSubmit()
  }

  function stopVoice() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setVoiceMessage('Voice input is not available in this browser.')
      return
    }

    recognitionRef.current?.abort()

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''

      if (transcript.trim()) {
        setVoiceMessage('Searching...')
        submitPrompt(transcript)
      } else {
        setVoiceMessage('I did not catch anything. Try again.')
      }
    }
    recognition.onerror = (event) => {
      setIsListening(false)
      setVoiceMessage(
        event.error === 'not-allowed'
          ? 'Microphone permission was blocked.'
          : 'I could not hear that. Try again.'
      )
    }
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    setIsListening(true)
    setVoiceMessage('Listening...')

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setIsListening(false)
      setVoiceMessage('Voice input could not start. Try again.')
    }
  }

  return (
    <form ref={formRef} className="mb-5">
      <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            name="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask about customers, jobs, invoices, or notes..."
            className="h-14 min-w-0 flex-1 rounded-xl bg-[#030712] px-4 text-base text-white placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={isListening ? stopVoice : startVoice}
            aria-label={isListening ? 'Stop voice input' : 'Use voice input'}
            className={`h-14 w-24 rounded-xl border text-sm font-semibold ${
              isListening
                ? 'border-red-500 bg-red-950 text-red-100'
                : 'border-slate-700 bg-slate-900 text-white'
            }`}
          >
            {isListening ? 'Stop' : 'Voice'}
          </button>
        </div>

        {voiceMessage && <p className="mb-3 text-sm text-slate-400">{voiceMessage}</p>}

        <button
          type="submit"
          className="h-14 w-full rounded-xl bg-red-600 text-lg font-semibold text-white"
        >
          Ask
        </button>
      </div>
    </form>
  )
}
