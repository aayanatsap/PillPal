'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'error';

export interface UseSpeechOptions {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
}

export interface UseSpeechResult {
  status: SpeechRecognitionStatus;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
}

export function useSpeech(options?: UseSpeechOptions): UseSpeechResult {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition: SpeechRecognition = new SpeechRecognitionCtor();
    recognition.lang = options?.lang ?? 'en-US';
    recognition.interimResults = options?.interimResults ?? false;
    recognition.continuous = options?.continuous ?? false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const latestResult = event.results[event.results.length - 1];
      const text = latestResult[0]?.transcript ?? '';
      setTranscript(text);
    };

    recognition.onerror = () => {
      setStatus('error');
    };

    recognition.onend = () => {
      setStatus('idle');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [options?.lang, options?.interimResults, options?.continuous]);

  const startListening = useCallback(() => {
    try {
      recognitionRef.current?.start();
      setStatus('listening');
    } catch {
      setStatus('error');
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined') return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang ?? 'en-US';
      window.speechSynthesis.speak(utterance);
    },
    [options?.lang],
  );

  return { status, transcript, startListening, stopListening, speak };
}


