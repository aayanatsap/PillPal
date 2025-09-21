"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Volume2, Waves } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"
import { parseIntent as apiParseIntent } from "@/lib/api"

type VoiceState = "idle" | "listening" | "processing" | "speaking"

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function VoiceMic() {
  const [state, setState] = useState<VoiceState>("idle")
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [resultOpen, setResultOpen] = useState(false)
  const [resultText, setResultText] = useState<string>("")
  const [resultTitle, setResultTitle] = useState<string>("Assistant")
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const lastTranscriptRef = useRef<string>("")
  const stateRef = useRef<VoiceState>("idle")
  const cumulativeFinalRef = useRef<string>("")
  const userStopRef = useRef<boolean>(false)
  const endFallbackTimerRef = useRef<number | null>(null)
  const processedRef = useRef<boolean>(false)
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const { toast } = useToast()
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  // keep refs in sync for event handlers
  useEffect(() => {
    stateRef.current = state
  }, [state])
  useEffect(() => {
    lastTranscriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    // Check for Web Speech API support
    if (typeof window !== "undefined") {
      // Load TTS voices and choose a pleasant default
      const pickVoice = () => {
        const voices = window.speechSynthesis?.getVoices?.() || []
        const preferredOrder = [
          "Samantha",
          "Google US English",
          "Google UK English Female",
          "Google UK English Male",
          "Microsoft Aria Online (Natural - en-US)",
          "Microsoft Jenny Online (Natural - en-US)",
        ]
        for (const name of preferredOrder) {
          const v = voices.find((vv) => vv.name === name)
          if (v) { preferredVoiceRef.current = v; return }
        }
        // Fallback to any en-* voice
        const en = voices.find((vv) => /en[-_]/i.test(vv.lang))
        preferredVoiceRef.current = en || null
      }
      try {
        pickVoice()
        window.speechSynthesis?.addEventListener?.("voiceschanged", pickVoice as any)
      } catch {}

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        // Prefer single-utterance behavior; we'll auto-stop on silence
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onstart = () => {
          console.info("[STT] start")
          setState("listening")
          setTranscript("")
          cumulativeFinalRef.current = ""
          userStopRef.current = false
          processedRef.current = false
          if (endFallbackTimerRef.current) {
            window.clearTimeout(endFallbackTimerRef.current)
            endFallbackTimerRef.current = null
          }
        }

        recognition.onresult = (event) => {
          let interimTranscript = ""
          let finalSegment = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalSegment += transcript
            } else {
              interimTranscript += transcript
            }
          }

          // Accumulate finals and display running text
          if (finalSegment) {
            cumulativeFinalRef.current = `${cumulativeFinalRef.current}${finalSegment}`.trim()
            console.debug("[STT] final segment:", finalSegment)
            console.debug("[STT] cumulative final:", cumulativeFinalRef.current)
          }
          if (interimTranscript) {
            console.debug("[STT] interim:", interimTranscript)
          }
          setTranscript(`${cumulativeFinalRef.current}${interimTranscript ? (cumulativeFinalRef.current ? " " : "") + interimTranscript : ""}`)

          // Reset/end fallback timer on audio activity
          if (endFallbackTimerRef.current) {
            window.clearTimeout(endFallbackTimerRef.current)
            endFallbackTimerRef.current = null
          }
          // If nothing else happens for 900ms after last chunk, process immediately
          endFallbackTimerRef.current = window.setTimeout(() => {
            if (processedRef.current) return
            console.debug("[STT] silence timeout -> process now")
            try { recognition.abort() } catch { try { recognition.stop() } catch {} }
            const t = (cumulativeFinalRef.current || lastTranscriptRef.current || "").trim()
            if (t.length > 0) {
              processedRef.current = true
              setState("processing")
              handleVoiceCommand(t)
            } else {
              setState("idle")
              setTranscript("")
            }
          }, 900)
        }

        recognition.onerror = (event) => {
          // Swallow benign errors like no-speech/aborted without alarming the user
          const err: any = (event as any)?.error
          console.debug("[STT] error:", err)
          setTranscript("")
          if (err === "no-speech" || err === "aborted" || err === "audio-capture") {
            // If we didn't ask to stop, try to continue listening
            if (!userStopRef.current && stateRef.current === "listening") {
              try { recognition.start() } catch {}
              return
            } else {
              setState("idle")
              return
            }
          }
          setState("idle")
          toast({
            title: "Voice error",
            description: typeof err === "string" ? err : "Please try again",
            variant: "destructive",
          })
        }

        recognition.onend = () => {
          console.info("[STT] end")
          if (endFallbackTimerRef.current) {
            window.clearTimeout(endFallbackTimerRef.current)
            endFallbackTimerRef.current = null
          }
          const finalText = (cumulativeFinalRef.current || "").trim()
          // If user clicked stop, process; otherwise auto-restart for continuous listening
          if (userStopRef.current) {
            console.debug("[STT] final transcript:", finalText)
            if (finalText.length > 0) {
              if (!processedRef.current) {
                processedRef.current = true
                setState("processing")
                handleVoiceCommand(finalText)
              }
            } else {
              setState("idle")
              setTranscript("")
            }
          } else if (stateRef.current === "listening") {
            // In single-utterance mode, onend means silence; auto-process
            console.debug("[STT] silence auto-process")
            if (finalText.length > 0) {
              if (!processedRef.current) {
                processedRef.current = true
                setState("processing")
                handleVoiceCommand(finalText)
              }
            } else {
              setState("idle")
              setTranscript("")
            }
          }
        }

        recognition.onspeechend = () => {
          console.debug("[STT] speechend -> stop")
          // Process immediately without waiting
          try { recognition.abort() } catch { try { recognition.stop() } catch {} }
          const t = (cumulativeFinalRef.current || lastTranscriptRef.current || "").trim()
          if (t && !processedRef.current) {
            processedRef.current = true
            setState("processing")
            handleVoiceCommand(t)
          }
        }

        recognitionRef.current = recognition
      }
    }
  }, [state, toast])

  const callParseIntent = async (query: string) => {
    // Use imported function if present; else fallback to direct fetch
    try {
      if (typeof (apiParseIntent as any) === 'function') {
        return await (apiParseIntent as any)(query)
      }
    } catch {}
    const res = await fetch('/api/proxy/api/v1/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    if (!res.ok) throw new Error(`Intent ${res.status}`)
    return res.json()
  }

  const handleVoiceCommand = async (transcript: string) => {
    console.info("[Voice] handling transcript:", transcript)
    let response = ""
    try {
      const result = await callParseIntent(transcript)
      console.info("[Voice] intent result:", result)
      const suggested = result?.suggested_response || result?.data?.suggested_response
      response = suggested || "Got it."
      const confidence = (result?.data?.confidence ?? result?.confidence ?? 0)
      setResultTitle(`Intent: ${result?.intent || 'unknown'} · ${Number(confidence).toFixed(2)}`)
      setResultText(response)
      setResultOpen(true)
    } catch (e: any) {
      console.error("[Voice] intent error:", e)
      response = e?.message || "Sorry, I couldn't process that."
      setResultTitle("Assistant error")
      setResultText(response)
      setResultOpen(true)
    }

    // Speak response
    if ("speechSynthesis" in window) {
      setState("speaking")
      const utterance = new SpeechSynthesisUtterance(response)
      // More natural settings
      utterance.rate = 1.0
      utterance.pitch = 1.0
      // Prefer a pleasant voice if available
      if (preferredVoiceRef.current) {
        utterance.voice = preferredVoiceRef.current
      }
      utterance.onend = () => {
        setState("idle")
        setTranscript("")
      }
      speechSynthesis.speak(utterance)
    } else {
      setState("idle")
      setTranscript("")
    }

    toast({ title: "Assistant", description: response })
  }

  const startListening = () => {
    if (recognitionRef.current && state === "idle") {
      userStopRef.current = false
      cumulativeFinalRef.current = ""
      if (endFallbackTimerRef.current) {
        window.clearTimeout(endFallbackTimerRef.current)
        endFallbackTimerRef.current = null
      }
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && state === "listening") {
      userStopRef.current = true
      // Use abort() to force immediate onend in some browsers
      try { recognitionRef.current.abort() } catch { try { recognitionRef.current.stop() } catch {} }
      if (endFallbackTimerRef.current) {
        window.clearTimeout(endFallbackTimerRef.current)
        endFallbackTimerRef.current = null
      }
    }
  }

  const handleClick = () => {
    if (state === "idle") {
      startListening()
    } else if (state === "listening") {
      stopListening()
      // keep state as "listening" until onend fires; onend will process transcript
    } else if (state === "processing") {
      // ignore while processing
    } else if (state === "speaking") {
      try {
        window.speechSynthesis.cancel()
      } catch {}
      setState("idle")
      setTranscript("")
    }
  }

  if (!isSupported) {
    return null
  }

  const getIcon = () => {
    switch (state) {
      case "listening":
        return MicOff
      case "processing":
        return Waves
      case "speaking":
        return Volume2
      default:
        return Mic
    }
  }

  const Icon = getIcon()

  const getButtonConfig = () => {
    switch (state) {
      case "listening":
        return {
          bg: isDark ? "bg-red-500" : "bg-red-600",
          text: "text-white",
          shadow: "shadow-xl shadow-red-500/25",
          border: isDark ? "border-red-400/30" : "border-red-500/30",
        }
      case "processing":
        return {
          bg: isDark ? "bg-teal-500" : "bg-teal-600",
          text: "text-white",
          shadow: "shadow-xl shadow-teal-500/25",
          border: isDark ? "border-teal-400/30" : "border-teal-500/30",
        }
      case "speaking":
        return {
          bg: isDark ? "bg-green-500" : "bg-green-600",
          text: "text-white",
          shadow: "shadow-xl shadow-green-500/25",
          border: isDark ? "border-green-400/30" : "border-green-500/30",
        }
      default:
        return {
          bg: isDark ? "bg-yellow-400" : "bg-blue-600",
          text: isDark ? "text-black" : "text-white",
          shadow: isDark ? "shadow-xl shadow-yellow-400/25" : "shadow-xl shadow-blue-600/25",
          border: isDark ? "border-yellow-300/30" : "border-blue-500/30",
        }
    }
  }

  const buttonConfig = getButtonConfig()

  const getAnimationClass = () => {
    if (prefersReducedMotion) return ""

    switch (state) {
      case "idle":
        return isDark
          ? "animate-[breathGlow_3s_ease-in-out_infinite]"
          : "animate-[breathGlowLight_3s_ease-in-out_infinite]"
      case "listening":
        return "animate-[listeningPulse_1s_ease-in-out_infinite]"
      case "processing":
        return "animate-[recognitionRipple_0.6s_ease-out_infinite]"
      default:
        return ""
    }
  }

  return (
    <motion.div
      className="fixed bottom-20 right-4 z-40 safe-area-bottom"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: durations.md / 1000,
        ease: easing.enter,
      }}
    >
      {/* Transcript display */}
      <AnimatePresence>
        {transcript && state === "listening" && (
          <motion.div
            className={cn(
              "absolute bottom-full right-0 mb-4 max-w-xs p-3",
              "bg-background/95 backdrop-blur-sm border border-border/50",
              "text-foreground text-sm rounded-xl shadow-lg",
              "transition-all duration-300 ease-out",
            )}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{
              duration: durations.sm / 1000,
              ease: easing.enter,
            }}
          >
            <p className="text-xs text-muted-foreground mb-1">You said:</p>
            <p className="font-medium">{transcript}</p>
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-background/95" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result modal (polished) */}
      <AnimatePresence>
        {resultOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setResultOpen(false)} />
            <motion.div
              className="relative w-full max-w-md bg-card/95 border border-border rounded-2xl shadow-xl overflow-hidden"
              initial={{ y: 20, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.98, opacity: 0 }}
            >
              <div className="px-5 pt-4 pb-4">
                <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                  {resultText}
                </p>
              </div>
              <div className="px-5 pb-4 flex justify-end">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted/50"
                  onClick={() => setResultOpen(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center relative glass-3d soft-glow-primary hover-lift press-compress",
          "font-medium border-2 transition-all duration-300 ease-out",
          "motion-safe:transition-all motion-safe:duration-200",
          "motion-safe:hover:scale-105 motion-safe:active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          buttonConfig.bg,
          buttonConfig.text,
          buttonConfig.shadow,
          buttonConfig.border,
          getAnimationClass(),
        )}
        whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
        onClick={handleClick}
        disabled={state === "processing" || state === "speaking"}
        aria-label={`Voice assistant - ${state}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
            transition={{
              duration: prefersReducedMotion ? 0 : durations.xs / 1000,
              ease: easing.enter,
            }}
          >
            <Icon className={cn("w-6 h-6", isDark ? "text-yellow-400" : undefined)} />
          </motion.div>
        </AnimatePresence>

        {/* Ripple effect for recognition */}
        {state === "processing" && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-current"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeOut",
            }}
          />
        )}
      </motion.button>

      {/* State indicator tooltip */}
      <AnimatePresence>
        {state !== "idle" && (
          <motion.div
            className={cn(
              "absolute bottom-full right-0 mb-2 px-3 py-1.5",
              "bg-background/95 backdrop-blur-sm border border-border/50",
              "text-foreground text-xs font-medium rounded-lg whitespace-nowrap",
              "shadow-lg transition-all duration-300 ease-out",
            )}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{
              duration: durations.sm / 1000,
              ease: easing.enter,
            }}
          >
            {state === "listening" && "Listening..."}
            {state === "processing" && "Processing..."}
            {state === "speaking" && "Speaking..."}
            <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-background/95" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick action hints */}
      <AnimatePresence>
        {state === "idle" && (
          <motion.div
            className={cn(
              "absolute bottom-full right-0 mb-2 px-2 py-1",
              "bg-muted/80 backdrop-blur-sm",
              "text-muted-foreground text-xs rounded-md",
              "opacity-0 motion-safe:hover:opacity-100",
              "motion-safe:transition-opacity motion-safe:duration-200",
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{
              duration: durations.sm / 1000,
              ease: easing.enter,
            }}
          >
            Tap to speak
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
