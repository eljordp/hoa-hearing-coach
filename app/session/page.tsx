"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function SessionCoach() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const context = searchParams.get("context") || "";
  const dispute = searchParams.get("dispute") || "";
  const fullContext = [
    context && `CC&R / HOA Rules:\n${context}`,
    dispute && `Homeowner's Dispute:\n${dispute}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Keep transcriptRef in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop =
        transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const getSuggestion = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsThinking(true);
      setSuggestion("");
      setError("");

      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text, context: fullContext }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setSuggestion(accumulated);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get suggestion"
        );
      } finally {
        setIsThinking(false);
      }
    },
    [fullContext]
  );

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = transcriptRef.current;
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += (finalText ? " " : "") + result[0].transcript.trim();
        } else {
          interimText += result[0].transcript;
        }
      }

      const displayText = finalText + (interimText ? " " + interimText : "");
      setTranscript(displayText);

      // Debounce API call — wait 2s after last speech
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (finalText.trim()) {
          getSuggestion(finalText);
        }
      }, 2000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Mic error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in listening mode
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setError("");
  }, [getSuggestion]);

  const stopListening = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearSession = useCallback(() => {
    stopListening();
    setTranscript("");
    setSuggestion("");
    setError("");
  }, [stopListening]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      recognitionRef.current = null;
    };
  }, []);

  if (!supported) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">
            Speech Recognition Not Supported
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Your browser does not support the Web Speech API. Please use Chrome
            or Edge on desktop or Android.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 underline text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 text-sm hover:text-gray-400 transition-colors"
        >
          &larr; Setup
        </button>
        <span className="text-gray-500 text-xs font-medium tracking-widest uppercase">
          HOA Hearing Coach
        </span>
        <button
          onClick={clearSession}
          className="text-gray-600 text-sm hover:text-gray-400 transition-colors"
        >
          Clear
        </button>
      </header>

      {/* Main content — split 40/60 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top half — Transcript */}
        <div className="flex flex-col border-b border-gray-800" style={{ flex: "0 0 40%" }}>
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-widest">
              Live Transcript
            </span>
            {isListening && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400">Listening</span>
              </span>
            )}
          </div>
          <div
            ref={transcriptScrollRef}
            className="flex-1 overflow-y-auto px-4 pb-4 text-gray-400 text-sm leading-relaxed"
          >
            {transcript ? (
              <p className="whitespace-pre-wrap">{transcript}</p>
            ) : (
              <p className="text-gray-700 italic">
                {isListening
                  ? "Listening... start speaking."
                  : "Press Start to begin capturing the hearing."}
              </p>
            )}
          </div>
        </div>

        {/* Bottom half — Suggestion */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-widest">
              What to Say
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex items-start">
            {error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : isThinking ? (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : suggestion ? (
              <p className="text-white text-2xl font-bold leading-snug">
                {suggestion}
              </p>
            ) : (
              <p className="text-gray-700 text-lg italic">
                Suggestions will appear here as the hearing progresses...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="px-4 py-4 border-t border-gray-800 flex gap-3">
        <button
          onClick={toggleListening}
          className={`flex-1 py-4 rounded-xl text-base font-semibold transition-colors ${
            isListening
              ? "bg-red-900 text-red-200 hover:bg-red-800"
              : "bg-white text-gray-950 hover:bg-gray-100"
          }`}
        >
          {isListening ? "Stop Listening" : "Start Listening"}
        </button>
        {transcript && !isThinking && (
          <button
            onClick={() => getSuggestion(transcript)}
            className="px-5 py-4 rounded-xl text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading...
        </div>
      }
    >
      <SessionCoach />
    </Suspense>
  );
}
