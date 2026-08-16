"use client";

import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { SmartText } from "@/components/shared/SmartText";
import { FileText, Bot, User, ChevronDown, ChevronUp } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  comparisonData?: {
    current: string;
    noSublimit: string;
  };
}

export function ChatMessage({ message, comparisonData }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [showEvidence, setShowEvidence] = useState(true);

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar Icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold shadow-2xs ${
          isUser
            ? "bg-[#1a1a1a] text-white"
            : "bg-[#0f2922] text-emerald-300 border border-emerald-800"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Message Content Bubble */}
      <div
        className={`max-w-[88%] sm:max-w-[80%] space-y-3 rounded-2xl p-4 text-sm leading-relaxed shadow-2xs ${
          isUser
            ? "bg-[#1a1a1a] text-white rounded-tr-none"
            : "bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-200 rounded-tl-none"
        }`}
      >
        {!isUser && (
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-700 pb-2">
            <span className="text-xs font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>PolicyLens AI</span>
            </span>
            {message.confidence && <ConfidenceBadge level={message.confidence} />}
          </div>
        )}

        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="space-y-3">
            <SmartText text={message.content} />

            {/* Optional Comparison Table inside message */}
            {comparisonData && (
              <div className="my-3 overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50/80 dark:bg-zinc-700/50 p-3 text-xs space-y-2">
                <p className="font-bold text-stone-900 dark:text-zinc-100">Scenario Comparison (₹5L Claim)</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-red-50 p-2 border border-red-200">
                    <span className="text-stone-500 block text-[10px]">CURRENT COVERAGE</span>
                    <span className="font-bold text-red-700 text-sm">{comparisonData.current}</span>
                    <span className="text-[10px] text-stone-400 block">you pay</span>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
                    <span className="text-stone-500 block text-[10px]">NO ROOM SUB-LIMIT</span>
                    <span className="font-bold text-[#1a6b5a] text-sm">{comparisonData.noSublimit}</span>
                    <span className="text-[10px] text-stone-400 block">you pay</span>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Collapsible Box */}
            {message.evidence?.length ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs space-y-2">
                <button
                  type="button"
                  onClick={() => setShowEvidence((v) => !v)}
                  className="flex w-full items-center justify-between font-mono font-bold text-[#1a6b5a]"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} />
                    Evidence ({message.evidence.length} clause reference)
                  </span>
                  {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showEvidence && (
                  <div className="space-y-2 pt-1">
                    {message.evidence.map((ev, i) => (
                      <div key={i} className="rounded-lg bg-white dark:bg-zinc-800 p-2.5 border border-emerald-200/80 dark:border-emerald-700 text-stone-800 dark:text-zinc-300 space-y-1">
                        <span className="font-bold text-[#1a6b5a] block text-[11px]">
                          {ev.policy || "HDFC Ergo"}, Section {ev.clause || "4.2.1"} ({ev.section || "Coverage"})
                        </span>
                        <p className="italic text-stone-600 dark:text-zinc-400 text-[11px]">&quot;{ev.text}&quot;</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
