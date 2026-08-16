"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { usePolicies } from "@/context/PolicyContext";
import { askPolicy } from "@/lib/api";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Send, Sparkles, Bot } from "lucide-react";

const SUGGESTED_CHIPS = [
  "What are the major gaps in my coverage?",
  "Explain what co-pay and sub-limits mean",
  "Is my life cover adequate for my family?",
  "What happens during the waiting period?",
  "How does cashless vs reimbursement work?",
];

export default function ChatPage() {
  const router = useRouter();
  const { family, isSetupComplete, loading } = useFamily();
  const { policies } = usePolicies();
  const completedCount = policies.filter((p) => p.ingestion_status === "completed").length;

  const welcomeMessage = useMemo<ChatMessageType>(() => ({
    role: "assistant",
    content: completedCount > 0
      ? `I've analyzed ${completedCount} ${completedCount === 1 ? "policy" : "policies"} so far. How may I help you? You can ask me anything about your coverage, gaps, terms, or financial implications.`
      : "No policies have been analyzed yet. Upload your insurance PDFs first, then come back to ask questions about your coverage.",
    confidence: "high" as const,
    evidence: [],
  }), [completedCount]);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([welcomeMessage]);
  }, [welcomeMessage]);

  useEffect(() => {
    if (!loading && !isSetupComplete && !family) {
      router.replace("/");
    }
  }, [loading, isSetupComplete, family, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || !family) return;

    const userMsg: ChatMessageType = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setBusy(true);

    try {
      const res = await askPolicy(family.id, text);
      const assistantMsg: ChatMessageType = {
        role: "assistant",
        content: res.answer,
        evidence: res.evidence,
        confidence: res.confidence,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: ChatMessageType = {
        role: "assistant",
        content: "I'm unable to reach the analysis engine right now. Please try again in a moment.",
        confidence: "low",
        evidence: [],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6 flex flex-col h-[calc(100vh-10rem)]">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-stone-300/80 pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Ask PolicyLens
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-mono font-bold text-[#1a6b5a] border border-emerald-300">
              <Sparkles size={12} /> AI-Powered
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Grounded in your uploaded policy clauses · Answers cite specific section numbers
          </p>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, idx) => (
          <ChatMessage
            key={idx}
            message={m}
          />
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-xs font-medium text-stone-500 animate-pulse bg-stone-100 p-3 rounded-2xl w-fit">
            <Bot size={16} className="text-[#1a6b5a] animate-spin" />
            <span>PolicyLens is retrieving relevant policy clauses...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Follow-up Chips */}
      <div className="shrink-0 space-y-2 pt-2 border-t border-stone-200">
        <span className="text-[11px] font-mono font-semibold text-stone-500 uppercase">
          Suggested Follow-ups:
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => handleSend(chip)}
              className="rounded-full border border-emerald-300 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-medium text-[#1a6b5a] hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              {chip} →
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your policies..."
          className="flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 shadow-2xs"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1a6b5a] text-white shadow-sm hover:bg-[#145447] disabled:opacity-50 transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
