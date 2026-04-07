"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [context, setContext] = useState("");
  const [dispute, setDispute] = useState("");

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!context.trim() && !dispute.trim()) return;
    const params = new URLSearchParams({
      context: context.trim(),
      dispute: dispute.trim(),
    });
    router.push(`/session?${params.toString()}`);
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#F6F4EF" }}
    >
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{ background: "#EBF0FB", color: "#2457C5" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Real-time AI coaching
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#1F2937" }}>
            HOA Hearing Coach
          </h1>
          <p className="text-sm" style={{ color: "#4B5563" }}>
            Open this on your phone during the hearing. It listens and tells you exactly what to say.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-sm"
          style={{ background: "#FFFFFF", border: "1px solid #D9D6CF" }}
        >
          <form onSubmit={handleStart} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="context"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#1F2937" }}
              >
                Your CC&amp;Rs / HOA Rules{" "}
                <span style={{ color: "#6B7280", fontWeight: 400 }}>
                  (paste relevant sections)
                </span>
              </label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Paste the relevant CC&R sections, violation notices, or HOA rules related to your dispute..."
                rows={5}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition-colors"
                style={{
                  background: "#F6F4EF",
                  border: "1px solid #D9D6CF",
                  color: "#1F2937",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2457C5")}
                onBlur={(e) => (e.target.style.borderColor = "#D9D6CF")}
              />
            </div>

            <div>
              <label
                htmlFor="dispute"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#1F2937" }}
              >
                Your Side of the Dispute{" "}
                <span style={{ color: "#6B7280", fontWeight: 400 }}>
                  (what happened + what you want)
                </span>
              </label>
              <textarea
                id="dispute"
                value={dispute}
                onChange={(e) => setDispute(e.target.value)}
                placeholder="What violation were you cited for? Why is it wrong or unfair? What outcome do you want?"
                rows={4}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition-colors"
                style={{
                  background: "#F6F4EF",
                  border: "1px solid #D9D6CF",
                  color: "#1F2937",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2457C5")}
                onBlur={(e) => (e.target.style.borderColor = "#D9D6CF")}
              />
            </div>

            <button
              type="submit"
              disabled={!context.trim() && !dispute.trim()}
              className="w-full font-semibold py-3 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#2457C5", color: "#FFFFFF" }}
            >
              Start Hearing Coach →
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#6B7280" }}>
          Your information is never stored · Works best on Chrome or Edge
        </p>
      </div>
    </main>
  );
}
