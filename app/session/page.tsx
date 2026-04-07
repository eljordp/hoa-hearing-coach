"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
  const [manualInput, setManualInput] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setSuggestion(accumulated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get suggestion");
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

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (finalText.trim()) getSuggestion(finalText);
      }, 2000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Mic error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
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
    isListening ? stopListening() : startListening();
  }, [isListening, startListening, stopListening]);

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualInput.trim()) return;
      const combined = transcript
        ? `${transcript} ${manualInput.trim()}`
        : manualInput.trim();
      setTranscript(combined);
      setManualInput("");
      getSuggestion(combined);
    },
    [manualInput, transcript, getSuggestion]
  );

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) setSupported(false);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      recognitionRef.current = null;
    };
  }, []);

  if (!supported) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F6F4EF" }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm border" style={{ borderColor: "#D9D6CF" }}>
          <p className="font-semibold mb-2" style={{ color: "#B33A3A" }}>Speech not supported</p>
          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>Use Chrome or Edge on desktop or Android.</p>
          <button onClick={() => router.push("/")} className="text-sm underline" style={{ color: "#2457C5" }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-end pb-6 px-4" style={{ background: "#F6F4EF" }}>
      {/* Cluely-style compact panel */}
      <div
        className="w-full max-w-lg rounded-2xl shadow-lg overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid #D9D6CF" }}
      >
        {/* Top bar — drag handle / header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          style={{ borderBottom: "1px solid #EFE9E0" }}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            {/* Mic status dot */}
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: isListening ? "#2F7D5A" : "#D9D6CF" }}
            />
            <span className="text-xs font-semibold" style={{ color: "#1F2937" }}>
              HOA Hearing Coach
            </span>
            {isListening && (
              <span className="text-xs" style={{ color: "#2F7D5A" }}>· Listening</span>
            )}
            {isThinking && (
              <span className="text-xs" style={{ color: "#2457C5" }}>· Thinking...</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleListening();
              }}
              className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
              style={{
                background: isListening ? "#FEF2F2" : "#EBF0FB",
                color: isListening ? "#B33A3A" : "#2457C5",
              }}
            >
              {isListening ? "Stop" : "Start"}
            </button>
            <span className="text-xs" style={{ color: "#6B7280" }}>
              {expanded ? "▼" : "▲"}
            </span>
          </div>
        </div>

        {/* Suggestion — always visible */}
        <div className="px-4 py-4">
          {error ? (
            <p className="text-sm" style={{ color: "#B33A3A" }}>{error}</p>
          ) : isThinking ? (
            <div className="flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "#2457C5", animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          ) : suggestion ? (
            <p className="text-base font-semibold leading-snug" style={{ color: "#1F2937" }}>
              {suggestion}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: "#6B7280" }}>
              {isListening
                ? "Listening... AI will suggest what to say."
                : "Press Start to begin. AI will coach you in real time."}
            </p>
          )}
        </div>

        {/* Expanded section — transcript + manual input */}
        {expanded && (
          <div style={{ borderTop: "1px solid #EFE9E0" }}>
            {/* Live transcript */}
            {transcript && (
              <div
                ref={transcriptScrollRef}
                className="px-4 py-3 max-h-32 overflow-y-auto"
                style={{ background: "#FCFBF8" }}
              >
                <p className="text-xs mb-1 font-medium" style={{ color: "#6B7280" }}>
                  TRANSCRIPT
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#4B5563" }}>
                  {transcript}
                </p>
              </div>
            )}

            {/* Manual type-in */}
            <form
              onSubmit={handleManualSubmit}
              className="flex gap-2 px-4 py-3"
              style={{ borderTop: transcript ? "1px solid #EFE9E0" : "none" }}
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Type what the HOA just said..."
                className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
                style={{
                  background: "#F6F4EF",
                  border: "1px solid #D9D6CF",
                  color: "#1F2937",
                }}
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
                style={{ background: "#2457C5", color: "#FFFFFF" }}
              >
                Ask
              </button>
            </form>

            {/* Footer actions */}
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{ borderTop: "1px solid #EFE9E0" }}
            >
              <button
                onClick={() => router.push("/")}
                className="text-xs"
                style={{ color: "#6B7280" }}
              >
                ← Setup
              </button>
              <button
                onClick={() => {
                  setTranscript("");
                  setSuggestion("");
                  setError("");
                }}
                className="text-xs"
                style={{ color: "#6B7280" }}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs mt-3" style={{ color: "#6B7280" }}>
        Tap the bar to expand · Works best on Chrome/Edge
      </p>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6F4EF" }}>
          <p className="text-sm" style={{ color: "#6B7280" }}>Loading...</p>
        </div>
      }
    >
      <SessionCoach />
    </Suspense>
  );
}
