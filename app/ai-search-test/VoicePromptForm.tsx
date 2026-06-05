'use client'

import { useRef, useState } from 'react'

type VoicePromptFormProps = {
  defaultValue: string
}

type VoiceState = 'idle' | 'recording' | 'transcribing'

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

const SILENCE_RMS = 0.025
const SILENCE_MS = 1400
const MIN_RECORDING_MS = 1200
const MAX_RECORDING_MS = 25000

function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
  ]

  return types.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function fileNameForMimeType(mimeType: string) {
  if (mimeType.includes('mp4')) return 'voice.m4a'
  if (mimeType.includes('mpeg')) return 'voice.mp3'
  return 'voice.webm'
}

export default function VoicePromptForm({ defaultValue }: VoicePromptFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const heardSpeechRef = useRef(false)
  const silenceStartedAtRef = useRef<number | null>(null)
  const recordingStartedAtRef = useRef(0)
  const stopHandledRef = useRef(false)
  const [prompt, setPrompt] = useState(defaultValue)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
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

  function stopAudioTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function stopAudioAnalysis() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current

    if (!recorder || recorder.state === 'inactive') return

    recorder.stop()
  }

  function startSilenceDetection(stream: MediaStream) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = new AudioContextClass()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    const samples = new Uint8Array(analyser.fftSize)

    analyser.fftSize = 2048
    source.connect(analyser)
    audioContextRef.current = audioContext

    const checkAudio = () => {
      analyser.getByteTimeDomainData(samples)

      let sum = 0
      for (const sample of samples) {
        const centered = sample - 128
        sum += centered * centered
      }

      const rms = Math.sqrt(sum / samples.length) / 128
      const now = Date.now()
      const elapsed = now - recordingStartedAtRef.current

      if (rms > SILENCE_RMS) {
        heardSpeechRef.current = true
        silenceStartedAtRef.current = null
      } else if (heardSpeechRef.current && elapsed > MIN_RECORDING_MS) {
        if (!silenceStartedAtRef.current) silenceStartedAtRef.current = now
        if (now - silenceStartedAtRef.current > SILENCE_MS) {
          stopRecording()
          return
        }
      }

      if (elapsed > MAX_RECORDING_MS) {
        stopRecording()
        return
      }

      animationFrameRef.current = window.requestAnimationFrame(checkAudio)
    }

    animationFrameRef.current = window.requestAnimationFrame(checkAudio)
  }

  async function transcribeAndSearch(audioBlob: Blob) {
    setVoiceState('transcribing')
    setVoiceMessage('Understanding your question...')

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, fileNameForMimeType(audioBlob.type))

      const response = await fetch('/api/ai-search-test/transcribe', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Voice transcription failed.')
      }

      const text = typeof payload?.text === 'string' ? payload.text.trim() : ''
      if (!text) throw new Error('I could not hear a question in that recording.')

      setVoiceMessage(`Heard: ${text}`)
      submitPrompt(text)
    } catch (error) {
      setVoiceState('idle')
      setVoiceMessage(error instanceof Error ? error.message : 'Voice transcription failed.')
    }
  }

  async function startVoice() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceMessage('Voice recording is not available in this browser.')
      return
    }

    try {
      chunksRef.current = []
      heardSpeechRef.current = false
      silenceStartedAtRef.current = null
      stopHandledRef.current = false

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      streamRef.current = stream
      mediaRecorderRef.current = recorder
      recordingStartedAtRef.current = Date.now()

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onerror = () => {
        setVoiceState('idle')
        setVoiceMessage('Voice recording stopped unexpectedly. Try again.')
        stopAudioAnalysis()
        stopAudioTracks()
      }

      recorder.onstop = () => {
        if (stopHandledRef.current) return
        stopHandledRef.current = true

        stopAudioAnalysis()
        stopAudioTracks()
        mediaRecorderRef.current = null

        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        if (audioBlob.size < 500) {
          setVoiceState('idle')
          setVoiceMessage('I did not catch anything. Tap Voice and try again.')
          return
        }

        void transcribeAndSearch(audioBlob)
      }

      recorder.start(250)
      setVoiceState('recording')
      setVoiceMessage('Listening... ask your question.')
      startSilenceDetection(stream)
    } catch (error) {
      setVoiceState('idle')
      setVoiceMessage(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone permission was blocked.'
          : 'Voice recording could not start. Try again.'
      )
      stopAudioAnalysis()
      stopAudioTracks()
    }
  }

  function cancelVoice() {
    setVoiceState('idle')
    setVoiceMessage('Voice cancelled.')
    stopAudioAnalysis()
    stopAudioTracks()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }

    mediaRecorderRef.current = null
    chunksRef.current = []
  }

  const isRecording = voiceState === 'recording'
  const isTranscribing = voiceState === 'transcribing'

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
            onClick={isRecording ? stopRecording : startVoice}
            disabled={isTranscribing}
            aria-label={isRecording ? 'Stop voice recording' : 'Use voice input'}
            className={`h-14 w-24 rounded-xl border text-sm font-semibold disabled:opacity-60 ${
              isRecording
                ? 'border-red-500 bg-red-950 text-red-100'
                : 'border-slate-700 bg-slate-900 text-white'
            }`}
          >
            {isTranscribing ? 'Wait' : isRecording ? 'Stop' : 'Voice'}
          </button>
        </div>

        {isRecording && (
          <button
            type="button"
            onClick={cancelVoice}
            className="mb-3 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-300"
          >
            Cancel Voice
          </button>
        )}

        {voiceMessage && <p className="mb-3 text-sm text-slate-400">{voiceMessage}</p>}

        <button
          type="submit"
          disabled={isTranscribing}
          className="h-14 w-full rounded-xl bg-red-600 text-lg font-semibold text-white disabled:opacity-60"
        >
          {isTranscribing ? 'Searching...' : 'Ask'}
        </button>
      </div>
    </form>
  )
}
