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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            HOA Hearing Coach
          </h1>
          <p className="text-gray-400 text-sm">
            Real-time AI guidance during your HOA dispute hearing. Keep this
            open on your phone or laptop — it listens and tells you what to say.
          </p>
        </div>

        <form onSubmit={handleStart} className="flex flex-col gap-6">
          {/* CC&R / Rules Context */}
          <div>
            <label
              htmlFor="context"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              CC&amp;R / HOA Rules Context{" "}
              <span className="text-gray-500">(paste relevant sections)</span>
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Paste the relevant CC&R sections, HOA rules, violation notices, or any documents related to your dispute..."
              rows={6}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gray-500 resize-none"
            />
          </div>

          {/* Dispute Description */}
          <div>
            <label
              htmlFor="dispute"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Your Dispute{" "}
              <span className="text-gray-500">
                (describe what happened and your position)
              </span>
            </label>
            <textarea
              id="dispute"
              value={dispute}
              onChange={(e) => setDispute(e.target.value)}
              placeholder="Describe the dispute: what violation you were cited for, why you believe it's incorrect or unfair, any evidence you have, and the outcome you want..."
              rows={5}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gray-500 resize-none"
            />
          </div>

          {/* Start Button */}
          <button
            type="submit"
            disabled={!context.trim() && !dispute.trim()}
            className="w-full bg-white text-gray-950 font-semibold py-4 rounded-lg text-base hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Hearing Coach
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          Your information is only used during your session and is never stored.
        </p>
      </div>
    </main>
  );
}
