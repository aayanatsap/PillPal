"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Volume2, Waves } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

type VoiceState = "idle" | "listening" | "processing" | "speaking"

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
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
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { toast } = useToast()
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  useEffect(() => {
    // Check for Web Speech API support
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onstart = () => {
          setState("listening")
          setTranscript("")
        }

        recognition.onresult = (event) => {
          let interimTranscript = ""
          let finalTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          setTranscript(finalTranscript || interimTranscript)

          if (finalTranscript) {
            setState("processing")
            handleVoiceCommand(finalTranscript)
          }
        }

        recognition.onerror = (event) => {
          setState("idle")
          setTranscript("")
          toast({
            title: "Voice recognition error",
            description: "Please try again",
            variant: "destructive",
          })
        }

        recognition.onend = () => {
          if (state === "listening") {
            setState("idle")
            setTranscript("")
          }
        }

        recognitionRef.current = recognition
      }
    }
  }, [state, toast])

  const handleVoiceCommand = async (transcript: string) => {
    // Simulate processing voice command
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock voice command processing
    const lowerTranscript = transcript.toLowerCase()
    let response = ""

    if (lowerTranscript.includes("take") || lowerTranscript.includes("took")) {
      response = "Dose recorded successfully. Great job staying on track!"
    } else if (lowerTranscript.includes("skip")) {
      response = "Dose marked as skipped. Please consult your doctor if you have concerns."
    } else if (lowerTranscript.includes("snooze")) {
      response = "Dose snoozed for 15 minutes. I'll remind you again soon."
    } else if (lowerTranscript.includes("help")) {
      response = "You can say 'take dose', 'skip dose', or 'snooze dose' to manage your medications."
    } else if (lowerTranscript.includes("status") || lowerTranscript.includes("progress")) {
      response = "You've taken 1 of 3 doses today. Your next dose is Metformin at 12:00 PM."
    } else {
      response = "I didn't understand that command. Try saying 'take dose' or 'help'."
    }

    // Speak response
    if ("speechSynthesis" in window) {
      setState("speaking")
      const utterance = new SpeechSynthesisUtterance(response)
      utterance.rate = 0.9
      utterance.pitch = 1.1
      utterance.onend = () => {
        setState("idle")
        setTranscript("")
      }
      speechSynthesis.speak(utterance)
    } else {
      setState("idle")
      setTranscript("")
    }

    toast({
      title: "Voice command processed",
      description: response,
    })
  }

  const startListening = () => {
    if (recognitionRef.current && state === "idle") {
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && state === "listening") {
      recognitionRef.current.stop()
    }
  }

  const handleClick = () => {
    if (state === "idle") {
      startListening()
    } else if (state === "listening") {
      stopListening()
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

      {/* Main FAB button */}
      <motion.button
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center relative",
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
            <Icon className="w-6 h-6" />
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
