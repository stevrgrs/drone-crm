'use client'

import { useRef, useState } from 'react'

type VoicePromptFormProps = {
  defaultValue: string
}

type SpeechRecognitionResult = {
  isFinal?: boolean
  [index: number]: {
    transcript?: string
  }
}

type SpeechRecognitionResultEvent = {
  resultIndex?: number
  results?: {
    length?: number
    [index: number]: SpeechRecognitionResult
  }
}

type SpeechRecognitionErrorEvent = {
  error?: string
}

type SpeechRecognitionInstance = {
  lang: string
  continuous?: boolean
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
  const transcriptRef = useRef(defaultValue)
  const shouldSubmitAfterStopRef = useRef(false)
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

  function finishVoiceAndSearch() {
    shouldSubmitAfterStopRef.current = true
    setVoiceMessage('Searching...')

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    } else {
      submitPrompt(transcriptRef.current || prompt)
    }
  }

  function stopVoiceOnly() {
    shouldSubmitAfterStopRef.current = false
    recognitionRef.current?.stop()
    setIsListening(false)
    setVoiceMessage('Voice stopped. Tap Ask when ready.')
  }

  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setVoiceMessage('Voice input is not available in this browser.')
      return
    }

    recognitionRef.current?.abort()
    shouldSubmitAfterStopRef.current = false
    transcriptRef.current = ''
    setPrompt('')

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const results = event.results
      const parts: string[] = []
      const length = results?.length || 0

      for (let index = 0; index < length; index += 1) {
        const transcript = results?.[index]?.[0]?.transcript
        if (transcript) parts.push(transcript)
      }

      const nextTranscript = parts.join(' ').replace(/\s+/g, ' ').trim()

      if (nextTranscript) {
        transcriptRef.current = nextTranscript
        setPrompt(nextTranscript)
        setVoiceMessage('Listening... tap Done when finished.')
      }
    }
    recognition.onerror = (event) => {
      setIsListening(false)
      setVoiceMessage(
        event.error === 'not-allowed'
          ? 'Microphone permission was blocked.'
          : 'Voice input stopped. Tap Voice and try again.'
      )
    }
    recognition.onend = () => {
      const shouldSubmit = shouldSubmitAfterStopRef.current
      const transcript = transcriptRef.current

      recognitionRef.current = null
      shouldSubmitAfterStopRef.current = false
      setIsListening(false)

      if (shouldSubmit) {
        submitPrompt(transcript)
      } else if (transcript) {
        setVoiceMessage('Voice captured. Tap Ask when ready.')
      } else {
        setVoiceMessage('I did not catch anything. Tap Voice and try again.')
      }
    }

    recognitionRef.current = recognition
    setIsListening(true)
    setVoiceMessage('Listening... tap Done when finished.')

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
            onChange={(event) => {
              transcriptRef.current = event.target.value
              setPrompt(event.target.value)
            }}
            placeholder="Ask about customers, jobs, invoices, or notes..."
            className="h-14 min-w-0 flex-1 rounded-xl bg-[#030712] px-4 text-base text-white placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={isListening ? finishVoiceAndSearch : startVoice}
            aria-label={isListening ? 'Done speaking' : 'Use voice input'}
            className={`h-14 w-24 rounded-xl border text-sm font-semibold ${
              isListening
                ? 'border-red-500 bg-red-950 text-red-100'
                : 'border-slate-700 bg-slate-900 text-white'
            }`}
          >
            {isListening ? 'Done' : 'Voice'}
          </button>
        </div>

        {isListening && (
          <button
            type="button"
            onClick={stopVoiceOnly}
            className="mb-3 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-300"
          >
            Cancel Voice
          </button>
        )}

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
